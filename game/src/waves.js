// The ten nights of the siege: which pests come, how many, and how fast. Each wave is a list of
// groups [kind, count, seconds between, first delay]; waves 5 and 10 bring a boss.
import { DAWN_MEND, PALETTE, WAVE_COUNT } from './config.js';
import { floatText } from './effects.js';
import { spawnAtEdge } from './enemies.js';
import { spawnMatriarch, spawnWyrm } from './bosses.js';
import { darnAtDawn, heirloomsKept, quiltIntegrity } from './quilt.js';
import { addBonus } from './scoring.js';

export const WAVES = [
  { name: 'First Flutter', groups: [['moth', 8, 1.3, 0]] },
  { name: 'Silverfish Skitter', groups: [['moth', 9, 1.2, 0], ['silverfish', 8, 0.45, 4]] },
  { name: 'Button Beetles', groups: [['moth', 10, 1.1, 0], ['beetle', 3, 3, 2]] },
  { name: 'Pincushion Patrol', groups: [['moth', 11, 1.0, 0], ['spitter', 2, 4, 1], ['silverfish', 8, 0.4, 6]] },
  { name: 'The Yarn Wyrm', boss: 'wyrm', groups: [['moth', 6, 2.6, 3]] },
  { name: 'Snippers at the Seams', groups: [['moth', 13, 0.9, 0], ['snipper', 3, 3, 2], ['beetle', 3, 3, 4]] },
  { name: 'Dusk Swarm', groups: [['moth', 17, 0.7, 0], ['spitter', 3, 4, 2], ['silverfish', 12, 0.35, 5]] },
  { name: 'Moth Ball', groups: [['moth', 20, 0.6, 0], ['beetle', 4, 3, 2], ['snipper', 3, 4, 3], ['spitter', 2, 5, 5]] },
  { name: 'The Long Night', groups: [['moth', 22, 0.55, 0], ['beetle', 5, 2.5, 1], ['snipper', 4, 3, 2], ['spitter', 4, 4, 3], ['silverfish', 14, 0.3, 6]] },
  { name: 'The Moth Matriarch', boss: 'matriarch', groups: [['moth', 6, 4, 8]] },
];

const INTRO_SECONDS = 1.6;
const CLEAR_SECONDS = 1.8;

export function startWave(run, number) {
  const wave = WAVES[number - 1];
  run.wave = number;
  run.waveTime = 0;
  run.wavePhase = 'intro';
  run.banner = { title: `Night ${number}`, subtitle: wave.name, age: 0 };
  const queue = [];
  for (const [kind, count, gap, delay] of wave.groups) {
    for (let i = 0; i < count; i += 1) queue.push({ at: INTRO_SECONDS + delay + i * gap, kind });
  }
  if (wave.boss) queue.push({ at: INTRO_SECONDS + 0.4, kind: wave.boss });
  queue.sort((a, b) => a.at - b.at);
  run.spawnQueue = queue;
  run.waveTotal = queue.length;
  run.events.push({ type: wave.boss ? 'bossWave' : 'waveStart' });
}

/** Creatures still to come plus creatures on the quilt (segments not counted). */
export function foesRemaining(run) {
  return run.spawnQueue.length + run.enemies.filter((e) => !e.dead && e.kind !== 'wyrmSegment').length;
}

export function updateWaves(run, dt) {
  run.waveTime += dt;
  if (run.banner) {
    run.banner.age += dt;
    if (run.banner.age > 2.6) run.banner = null;
  }
  if (run.wavePhase === 'intro' && run.waveTime >= INTRO_SECONDS) run.wavePhase = 'fight';
  while (run.spawnQueue.length > 0 && run.spawnQueue[0].at <= run.waveTime) {
    const { kind } = run.spawnQueue.shift();
    if (kind === 'wyrm') spawnWyrm(run);
    else if (kind === 'matriarch') spawnMatriarch(run);
    else spawnAtEdge(run, kind);
  }
  if (run.wavePhase === 'fight' && foesRemaining(run) === 0) {
    run.wavePhase = 'cleared';
    run.clearTimer = CLEAR_SECONDS;
    const bonus = Math.round(300 * run.wave + 700 * quiltIntegrity(run.quilt));
    addBonus(run, bonus, `NIGHT ${run.wave} CLEARED`, 640, 330);
    const kept = heirloomsKept(run.quilt);
    if (kept > 0) addBonus(run, kept * 150, `HEIRLOOMS x${kept}`, 640, 380);
    run.events.push({ type: 'waveClear' });
    if (run.wave >= WAVE_COUNT) run.outcome = 'win';
    else {
      // Dawn: a little cloth is darned and one spool is wound back.
      run.stats.mended += darnAtDawn(run.quilt, DAWN_MEND);
      if (run.player.hp < run.mods.hp) {
        run.player.hp += 1;
        floatText(run.fx, run.player.x, run.player.y - 40, '+1 SPOOL', PALETTE.threadLight, 26);
      }
      run.events.push({ type: 'dawn' });
    }
  } else if (run.wavePhase === 'cleared' && !run.outcome) {
    run.clearTimer -= dt;
    if (run.clearTimer <= 0) {
      run.wavePhase = 'draft';
      run.pins = [];
      run.shots = [];
    }
  }
}
