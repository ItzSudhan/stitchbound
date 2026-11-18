// Procedural nights. planNight composes a night from the road node's depth, type and seed: a
// budget of pests grows with depth, new kinds join as the road goes on, elites hit harder, and the
// night gets a name from what it holds. startNight sets it on the quilt; updateNight spawns it,
// notices when it is cleared and pays the dawn bonuses.
import { DAWN_MEND, PALETTE } from '../core/config.js';
import { createRandom, mixSeed } from '../core/random.js';
import { floatText } from '../render/effects.js';
import { spawnAtEdge } from '../entities/enemies.js';
import { spawnMatriarch, spawnWyrm } from '../entities/bosses.js';
import { darnPatches, heirloomsKept, quiltIntegrity } from './quilt.js';
import { modifierById } from './modifiers.js';
import { generateBoard } from './quilt-gen.js';
import { createNightGoals, payGoals } from './goals.js';
import { addBonus, awardSequins } from '../run/scoring.js';

const KIND_COST = { moth: 1, silverfish: 0.5, beetle: 2.5, spitter: 3, snipper: 2.5, lintBall: 2.5, burrower: 2, carpetBeetle: 2.5 };
const KIND_FROM = { silverfish: 2, beetle: 3, lintBall: 3, spitter: 4, burrower: 4, snipper: 5, carpetBeetle: 6 };
const NIGHT_NAMES = {
  moth: ['First Flutter', 'Moth Flutter', 'Wingbeat Night', 'Dusty Night'],
  silverfish: ['Silverfish Skitter', 'Quicksilver Night', 'The Skittering'],
  beetle: ['Button Beetles', 'Clatter of Buttons', 'Beetle Stampede'],
  spitter: ['Pincushion Patrol', 'Night of Pins', 'The Bristling'],
  snipper: ['Snippers at the Seams', 'Scissor Night', 'The Unpicking'],
  lintBall: ['Lint Storm', 'Fluff and Tumble'],
  burrower: ['Undermined', 'The Burrowing'],
  carpetBeetle: ['Seam Chewers', 'Carpet Night'],
};
const INTRO_SECONDS = 1.6;
const CLEAR_SECONDS = 1.8;

/** Composes the night behind a road node. Pure: the same run seed and node give the same night. */
export function planNight(run, node) {
  const depth = node.depth;
  const rng = createRandom(mixSeed(run.seed, depth * 101 + node.lane));
  const modifier = modifierById(node.modifier);
  const nightMod = modifier?.night ?? {};
  const elite = node.type === 'elite';
  const endlessLap = Math.max(0, depth - 10);
  const night = {
    depth,
    type: node.type,
    elite,
    modifier: node.modifier,
    boss: null,
    groups: [],
    hpScale: (1 + 0.1 * (depth - 1) + 0.08 * endlessLap) * (elite ? 1.5 : 1) * (nightMod.hpScale ?? 1),
    bossScale: 1 + 0.35 * Math.floor(endlessLap / 5),
    speedScale: (1 + 0.025 * Math.min(depth - 1, 14)) * (nightMod.speedScale ?? 1),
    mothSpeed: nightMod.mothSpeed ?? 1,
    mothHp: nightMod.mothHp ?? 1,
    shotSpeed: nightMod.shotSpeed ?? 1,
    sequinScale: (nightMod.sequinScale ?? 1) * (elite ? 2 : 1),
    scoreScale: (nightMod.scoreScale ?? 1) * (elite ? 1.5 : 1),
    name: '',
  };
  if (node.type === 'boss') {
    night.boss = depth % 10 === 0 ? 'matriarch' : 'wyrm';
    night.name = night.boss === 'matriarch' ? 'The Moth Matriarch' : 'The Yarn Wyrm';
    night.groups.push(['moth', 6 + endlessLap, night.boss === 'matriarch' ? 4 : 2.6, night.boss === 'matriarch' ? 8 : 3]);
    return night;
  }
  const budget = (10 + depth * 5.2) * (elite ? 1.3 : 1);
  const unlocked = Object.keys(KIND_FROM).filter((kind) => KIND_FROM[kind] <= depth);
  const chosen = [];
  const pool = [...unlocked];
  const extraKinds = Math.min(pool.length, depth <= 2 ? 1 : rng.int(1, 3));
  for (let i = 0; i < extraKinds; i += 1) chosen.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  const mothShare = chosen.length === 0 ? 1 : rng.range(0.45, 0.65);
  const duration = 16 + depth * 1.6;
  const mothCount = Math.max(6, Math.round(budget * mothShare * (nightMod.swarm ?? 1)));
  night.groups.push(['moth', mothCount, duration / mothCount, 0]);
  let dominant = 'moth';
  let dominantSpend = 0;
  for (const kind of chosen) {
    const spend = (budget * (1 - mothShare)) / chosen.length;
    const count = Math.max(1, Math.round(spend / KIND_COST[kind]));
    night.groups.push([kind, count, duration / count, rng.range(1, 5)]);
    if (spend * KIND_COST[kind] > dominantSpend) {
      dominant = kind;
      dominantSpend = spend * KIND_COST[kind];
    }
  }
  const name = depth === 1 ? 'First Flutter' : rng.pick(NIGHT_NAMES[dominant]);
  night.name = elite ? `Elite: ${name}` : name;
  return night;
}

/** Puts a planned night on the quilt: clears the field and queues its pests. */
export function startNight(run, night) {
  run.quilt = generateBoard(run.seed, night.depth, run.quilt.eaten);
  for (const patch of run.quilt.patches) if (patch.kind) run.seen.patches.add(patch.kind);
  run.night = night;
  run.waveTime = 0;
  run.wavePhase = 'intro';
  run.enemies = [];
  run.pins = [];
  run.shots = [];
  run.pickups = [];
  run.cinches = [];
  run.player.shield = run.mods.nightShield;
  const modifier = modifierById(night.modifier);
  run.banner = { title: `Night ${night.depth}`, subtitle: night.name, note: modifier ? `${modifier.name}: ${modifier.text}` : '', age: 0 };
  const queue = [];
  for (const [kind, count, gap, delay] of night.groups) {
    for (let i = 0; i < count; i += 1) queue.push({ at: INTRO_SECONDS + delay + i * gap, kind });
  }
  if (night.boss) queue.push({ at: INTRO_SECONDS + 0.4, kind: night.boss });
  queue.sort((a, b) => a.at - b.at);
  run.spawnQueue = queue;
  run.waveTotal = queue.length;
  createNightGoals(run, night);
  run.events.push({ type: night.boss ? 'bossWave' : 'waveStart' });
}

/** Creatures still to come plus creatures on the quilt (segments not counted). */
export function foesRemaining(run) {
  return run.spawnQueue.length + run.enemies.filter((e) => !e.dead && e.kind !== 'wyrmSegment').length;
}

export function updateNight(run, dt) {
  run.waveTime += dt;
  if (run.banner) {
    run.banner.age += dt;
    if (run.banner.age > 3) run.banner = null;
  }
  if (run.wavePhase === 'intro' && run.waveTime >= INTRO_SECONDS) run.wavePhase = 'fight';
  while (run.spawnQueue.length > 0 && run.spawnQueue[0].at <= run.waveTime) {
    const { kind } = run.spawnQueue.shift();
    if (kind === 'wyrm') spawnWyrm(run);
    else if (kind === 'matriarch') spawnMatriarch(run);
    else spawnAtEdge(run, kind);
  }
  if (run.wavePhase === 'fight' && foesRemaining(run) === 0) clearNight(run);
  else if (run.wavePhase === 'cleared' && !run.outcome) {
    run.clearTimer -= dt;
    if (run.clearTimer <= 0) {
      run.wavePhase = 'draft';
      run.pins = [];
      run.shots = [];
    }
  }
}

/** Dawn: bonuses for the night, the heirlooms kept and the quilt's state; a little darning. */
function clearNight(run) {
  const night = run.night;
  run.wavePhase = 'cleared';
  run.clearTimer = CLEAR_SECONDS;
  run.stats.nightsFought += 1;
  const bonus = Math.round((300 * night.depth + 700 * quiltIntegrity(run.quilt)) * night.scoreScale);
  addBonus(run, bonus, `NIGHT ${night.depth} CLEARED`, 640, 330);
  const kept = heirloomsKept(run.quilt);
  if (kept > 0) addBonus(run, Math.round(kept * 150 * run.mods.heirloomBonus), `HEIRLOOMS x${kept}`, 640, 380);
  awardSequins(run, 5 + night.depth, 640, 430);
  payGoals(run);
  run.events.push({ type: 'waveClear' });
  if (night.boss === 'matriarch' && !run.endless) {
    run.outcome = 'win';
    return;
  }
  run.stats.mended += darnPatches(run.quilt, DAWN_MEND);
  if (night.boss) floatText(run.fx, 640, 480, 'A RELIC AWAITS', PALETTE.gold, 30);
  run.events.push({ type: 'dawn' });
}
