// One run of Stitchbound: creates the state and advances it one fixed step at a time. The step
// moves the needle, lays its thread and cinches any loop it closes, moves the pests, pins and
// shots, and decides the outcome: win after the tenth night, lose when the needle's spools run out
// or the quilt unravels.
import { PALETTE } from './config.js';
import { createRandom } from './random.js';
import { createQuilt, mendInside, quiltIntegrity, updateQuilt } from './quilt.js';
import { createThread, extendThread, threadTouches, updateThread } from './thread.js';
import { createPlayer, buttonPositions, updatePlayer } from './player.js';
import { updatePins, updateShots } from './projectiles.js';
import { damageEnemy, updateEnemies } from './enemies.js';
import { startWave, updateWaves } from './waves.js';
import { computeMods } from './upgrades.js';
import { createCombo, addBonus, updateCombo } from './scoring.js';
import { createEffects, addShake, burst, floatText, hitStop, ring, screenFlash, updateEffects } from './effects.js';
import { distance, easeInCubic, pointInPolygon, polygonArea, polygonCentroid } from './geometry.js';

export function createRun(seed) {
  const owned = {};
  const mods = computeMods(owned);
  const player = createPlayer(mods);
  const run = {
    seed,
    rng: createRandom(seed),
    fx: createEffects(seed),
    quilt: createQuilt(seed),
    thread: createThread(player.x, player.y),
    owned,
    mods,
    player,
    pins: [],
    shots: [],
    enemies: [],
    cinches: [],
    boss: null,
    wave: 0,
    waveTime: 0,
    wavePhase: 'intro',
    spawnQueue: [],
    waveTotal: 0,
    banner: null,
    clearTimer: 0,
    score: 0,
    combo: createCombo(),
    time: 0,
    outcome: null,
    events: [],
    stats: { kills: 0, moths: 0, loops: 0, biggestLoop: 0, mended: 0, hits: 0, picks: [] },
  };
  startWave(run, 1);
  return run;
}

/** Advances the run by dt seconds under the player's intent {moveX, moveY, aimX, aimY, fire, dash}. */
export function stepRun(run, intent, dt) {
  const fx = run.fx;
  if (fx.hitstop > 0) {
    fx.hitstop -= dt;
    updateEffects(fx, dt * 0.25);
    return;
  }
  run.time += dt;
  if (run.wavePhase !== 'draft' && !run.outcome) {
    updatePlayer(run, intent, dt);
    const loop = extendThread(run.thread, run.player.x, run.player.y, run.mods.threadLength);
    if (loop) cinchLoop(run, loop);
    updateEnemies(run, dt);
    stingWithThread(run, dt);
    guardWithButtons(run, dt);
    updatePins(run, dt);
    updateShots(run, dt);
    updateWaves(run, dt);
  }
  updateThread(run.thread, dt);
  updateCombo(run, dt);
  updateQuilt(run.quilt, dt);
  updateCinches(run, dt);
  updateEffects(fx, dt);
  if (!run.outcome) {
    if (run.player.hp <= 0) loseRun(run, 'needle');
    else if (quiltIntegrity(run.quilt) <= 0) loseRun(run, 'quilt');
  }
}

/** A closed loop pulls tight: everything inside takes the cinch, holes inside are darned shut. */
export function cinchLoop(run, polygon) {
  const fx = run.fx;
  const centre = polygonCentroid(polygon);
  const area = polygonArea(polygon);
  let caught = 0;
  for (const enemy of run.enemies) {
    if (enemy.dead || !pointInPolygon(enemy.x, enemy.y, polygon)) continue;
    caught += 1;
    const damage = run.mods.loopDamage * (enemy.kind === 'matriarch' ? 2.2 : 1);
    damageEnemy(run, enemy, damage, 'loop');
    burst(fx, enemy.x, enemy.y, { count: 8, colors: [PALETTE.thread, PALETTE.gold], speed: 180, size: 6, kind: 'spark' });
  }
  const mended = mendInside(run.quilt, polygon, run.mods.mendAmount);
  run.stats.loops += 1;
  run.stats.mended += mended;
  run.stats.biggestLoop = Math.max(run.stats.biggestLoop, caught);
  run.cinches.push({ polygon, centre, age: 0, life: 0.38 });
  for (let i = 0; i < polygon.length; i += 3) {
    burst(fx, polygon[i].x, polygon[i].y, { count: 1, colors: [PALETTE.gold, PALETTE.threadLight], speed: 60, size: 6, kind: 'spark', life: 0.5 });
  }
  ring(fx, centre.x, centre.y, PALETTE.gold, Math.sqrt(area) * 0.8, 0.5, 8);
  if (caught > 0) {
    const bonus = 50 * caught * caught;
    addBonus(run, bonus, caught > 1 ? `STITCH x${caught}` : 'STITCHED', centre.x, centre.y - 30);
    hitStop(fx, Math.min(0.12, 0.04 + caught * 0.015));
    addShake(fx, 6 + caught * 2);
    if (caught >= 4) screenFlash(fx, PALETTE.gold, 0.35);
  } else if (mended > 0.05) {
    floatText(fx, centre.x, centre.y, 'MENDED', PALETTE.gold, 26);
  }
  run.events.push({ type: 'cinch', caught, mended });
}

function updateCinches(run, dt) {
  for (const cinch of run.cinches) cinch.age += dt;
  run.cinches = run.cinches.filter((c) => c.age < c.life);
}

/** The loop polygon of a cinch at its current, shrinking size. */
export function cinchShape(cinch) {
  const k = 1 - easeInCubic(Math.min(1, cinch.age / cinch.life)) * 0.85;
  return cinch.polygon.map((p) => ({ x: cinch.centre.x + (p.x - cinch.centre.x) * k, y: cinch.centre.y + (p.y - cinch.centre.y) * k }));
}

/** Barbed Thread: pests that cross the laid thread take damage over time. */
function stingWithThread(run, dt) {
  if (run.mods.barbed <= 0 || run.thread.points.length < 6) return;
  for (const enemy of run.enemies) {
    if (enemy.dead || enemy.kind === 'matriarch') continue;
    if (threadTouches(run.thread, enemy.x, enemy.y, enemy.r)) damageEnemy(run, enemy, run.mods.barbed * dt, 'thread');
  }
}

/** Button Guard: the orbiting buttons bump pests they pass through. */
function guardWithButtons(run, dt) {
  if (run.mods.buttons <= 0) return;
  for (const b of buttonPositions(run)) {
    for (const enemy of run.enemies) {
      if (!enemy.dead && distance(b.x, b.y, enemy.x, enemy.y) < enemy.r + 14) damageEnemy(run, enemy, 40 * dt, 'button');
    }
  }
}

function loseRun(run, reason) {
  run.outcome = reason;
  run.events.push({ type: 'lose' });
  addShake(run.fx, 24);
  burst(run.fx, run.player.x, run.player.y, { count: 40, colors: [PALETTE.thread, PALETTE.steel, PALETTE.cream], speed: 320, size: 6, kind: 'fiber' });
}

/** After the draft: the next night begins. */
export function beginNextWave(run) {
  run.pins = [];
  run.shots = [];
  startWave(run, run.wave + 1);
}
