// The pests that raid the quilt, each with its own behaviour:
//   moth       flutters to a patch, lands and eats it into holes
//   silverfish fast, weaving, comes in schools and nips the needle
//   beetle     a button-backed beetle that winds up and charges
//   snipper    an earwig that hunts your thread and snips it
//   spitter    a walking pincushion that fires fans of pins
// The Yarn Wyrm and the Moth Matriarch live in bosses.js.
import { updateMatriarch, updateWyrmHead, updateWyrmSegment } from './bosses.js';
import { nibblePatch } from './quilt.js';
import { cutThread } from './thread.js';
import { spawnShot } from './projectiles.js';
import { hurtPlayer } from './player.js';
import { addShake, burst, floatText, ring } from './effects.js';
import { registerKill } from './scoring.js';
import { maybeDropSpool } from './pickups.js';
import { VIEW } from './config.js';
import { angleDelta, clamp, distance } from './geometry.js';

export const ENEMY_KINDS = {
  moth: { hp: 18, r: 19, speed: 92, score: 100, colors: ['#9c7bb0', '#5e4170', '#e8d9b5'] },
  silverfish: { hp: 9, r: 11, speed: 185, score: 60, colors: ['#d9dde3', '#8a919c'] },
  beetle: { hp: 48, r: 21, speed: 72, score: 220, colors: ['#2b4166', '#6f8fb3', '#f6ecd6'] },
  snipper: { hp: 30, r: 16, speed: 150, score: 180, colors: ['#7a3b2e', '#d9dde3'] },
  spitter: { hp: 60, r: 23, speed: 42, score: 260, colors: ['#d6333f', '#94b283', '#f6ecd6'] },
  wyrm: { hp: 420, r: 27, speed: 150, score: 2000, colors: ['#e07a5f', '#f4a7a1', '#f6ecd6'] },
  wyrmSegment: { hp: 70, r: 21, speed: 0, score: 120, colors: ['#e07a5f', '#f2cc8f'] },
  matriarch: { hp: 4200, r: 72, speed: 70, score: 10000, colors: ['#5e4170', '#9c7bb0', '#f5c542', '#f6ecd6'] },
};

const BEHAVIOURS = {
  moth: updateMoth,
  silverfish: updateSilverfish,
  beetle: updateBeetle,
  snipper: updateSnipper,
  spitter: updateSpitter,
  wyrm: updateWyrmHead,
  wyrmSegment: updateWyrmSegment,
  matriarch: updateMatriarch,
};

let nextId = 1;

export function spawnEnemy(run, kind, x, y, extra = {}) {
  const def = ENEMY_KINDS[kind];
  const scale = kind === 'matriarch' ? 1 : 1 + 0.1 * (run.wave - 1);
  const enemy = {
    id: nextId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    r: def.r,
    hp: def.hp * scale,
    maxHp: def.hp * scale,
    speed: def.speed * (1 + 0.025 * (run.wave - 1)),
    score: def.score,
    flash: 0,
    angle: Math.atan2(VIEW.height / 2 - y, VIEW.width / 2 - x),
    state: 'move',
    timer: run.rng.range(0.5, 2),
    seed: run.rng.range(0, 100),
    target: null,
    dead: false,
    age: 0,
    ...extra,
  };
  run.enemies.push(enemy);
  return enemy;
}

/** A spawn point just off a random edge of the quilt. */
export function edgePoint(rng) {
  const side = rng.int(0, 3);
  if (side === 0) return { x: rng.range(40, VIEW.width - 40), y: -30 };
  if (side === 1) return { x: VIEW.width + 30, y: rng.range(40, VIEW.height - 40) };
  if (side === 2) return { x: rng.range(40, VIEW.width - 40), y: VIEW.height + 30 };
  return { x: -30, y: rng.range(40, VIEW.height - 40) };
}

export function spawnAtEdge(run, kind) {
  const at = edgePoint(run.rng);
  return spawnEnemy(run, kind, at.x, at.y);
}

export function updateEnemies(run, dt) {
  for (const enemy of run.enemies) {
    if (enemy.dead) continue;
    enemy.age += dt;
    enemy.flash = Math.max(0, enemy.flash - dt * 6);
    BEHAVIOURS[enemy.kind](run, enemy, dt);
    const p = run.player;
    if (!enemy.passive && distance(enemy.x, enemy.y, p.x, p.y) < enemy.r + 12) hurtPlayer(run, 1);
  }
  separateEnemies(run);
  run.enemies = run.enemies.filter((enemy) => !enemy.dead);
}

/** Damages a creature; kills it (score, combo, particles) when its stitches give out. */
export function damageEnemy(run, enemy, amount, source, pushX = 0, pushY = 0) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.flash = 1;
  if (enemy.kind !== 'matriarch' && enemy.kind !== 'wyrmSegment') {
    const push = Math.hypot(pushX, pushY);
    if (push > 0) {
      enemy.x += (pushX / push) * 5;
      enemy.y += (pushY / push) * 5;
    }
  }
  // A struck moth is startled off its meal and flutters to another patch.
  if (enemy.kind === 'moth' && enemy.state === 'eat') {
    enemy.state = 'move';
    enemy.target = null;
  }
  if (source === 'crit') floatText(run.fx, enemy.x, enemy.y - enemy.r - 8, 'CRIT!', '#f5c542', 20);
  run.events.push({ type: 'hit', boss: enemy.kind === 'matriarch' });
  if (enemy.hp <= 0) killEnemy(run, enemy, source);
}

export function killEnemy(run, enemy, source) {
  if (enemy.dead) return;
  enemy.dead = true;
  const def = ENEMY_KINDS[enemy.kind];
  const big = enemy.kind === 'wyrm' || enemy.kind === 'matriarch';
  burst(run.fx, enemy.x, enemy.y, { count: big ? 90 : 16, colors: def.colors, speed: big ? 520 : 230, size: big ? 9 : 5, life: big ? 1.4 : 0.7 });
  burst(run.fx, enemy.x, enemy.y, { count: big ? 30 : 6, colors: ['#f6ecd6', '#ffffff'], speed: 180, size: 3, kind: 'fiber' });
  ring(run.fx, enemy.x, enemy.y, def.colors[0], enemy.r * 3, 0.45, 5);
  addShake(run.fx, big ? 26 : 3);
  registerKill(run, enemy, source);
  maybeDropSpool(run, enemy);
  run.events.push({ type: big ? 'bossDie' : 'kill', kind: enemy.kind });
  if (enemy.kind === 'wyrm') {
    for (const other of run.enemies) if (other.kind === 'wyrmSegment' && !other.dead) killEnemy(run, other, 'chain');
  }
}

function steer(enemy, tx, ty, speed, turn, dt) {
  const want = Math.atan2(ty - enemy.y, tx - enemy.x);
  enemy.angle += clamp(angleDelta(enemy.angle, want), -turn * dt, turn * dt);
  enemy.vx = Math.cos(enemy.angle) * speed;
  enemy.vy = Math.sin(enemy.angle) * speed;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
}

function pickPatch(run, enemy) {
  const patches = run.quilt.patches.filter((patch) => patch.hp > 0);
  if (patches.length === 0) return null;
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < 6; i += 1) {
    const patch = run.rng.pick(patches);
    const craving = patch.heirloom ? 0.45 : 1;
    const score = distance(enemy.x, enemy.y, patch.cx, patch.cy) * run.rng.range(0.6, 1.2) * craving;
    if (score < bestScore) {
      best = patch;
      bestScore = score;
    }
  }
  return best;
}

/** A guard moth circles its Matriarch in a slow ring and dies with her. */
function updateGuardMoth(run, enemy, dt) {
  const boss = enemy.guard;
  if (boss.dead) {
    killEnemy(run, enemy, 'chain');
    return;
  }
  enemy.orbit += dt * 1.3;
  const tx = boss.x + Math.cos(enemy.orbit) * 132;
  const ty = boss.y + Math.sin(enemy.orbit) * 100;
  enemy.x += (tx - enemy.x) * Math.min(1, dt * 4);
  enemy.y += (ty - enemy.y) * Math.min(1, dt * 4);
  enemy.angle = enemy.orbit + Math.PI / 2;
}

function updateMoth(run, enemy, dt) {
  if (enemy.guard) {
    updateGuardMoth(run, enemy, dt);
    return;
  }
  if (!enemy.target || enemy.target.hp <= 0) {
    enemy.target = pickPatch(run, enemy);
    enemy.state = 'move';
    enemy.landX = run.rng.range(-18, 18);
    enemy.landY = run.rng.range(-18, 18);
  }
  if (!enemy.target) return;
  const tx = enemy.target.cx + enemy.landX;
  const ty = enemy.target.cy + enemy.landY;
  if (enemy.state === 'eat') {
    enemy.x += (tx - enemy.x) * Math.min(1, dt * 6);
    enemy.y += (ty - enemy.y) * Math.min(1, dt * 6);
    enemy.timer -= dt;
    if (enemy.timer <= 0) {
      enemy.timer = 0.45;
      run.events.push({ type: 'nibble' });
    }
    if (nibblePatch(run.quilt, enemy.target, 0.13 * dt)) {
      run.events.push({ type: 'patchLost' });
      burst(run.fx, enemy.target.cx, enemy.target.cy, { count: 14, colors: [enemy.target.color, enemy.target.accent], speed: 140, size: 5, kind: 'fiber' });
      enemy.target = null;
    }
    return;
  }
  const wobble = Math.sin(enemy.age * 5 + enemy.seed) * 2.4;
  steer(enemy, tx, ty, enemy.speed, 3.2 + wobble, dt);
  enemy.x += Math.cos(enemy.age * 7 + enemy.seed) * 20 * dt;
  if (distance(enemy.x, enemy.y, tx, ty) < 14) enemy.state = 'eat';
}

function updateSilverfish(run, enemy, dt) {
  const p = run.player;
  const weave = Math.sin(enemy.age * 6 + enemy.seed) * 0.9;
  const a = Math.atan2(p.y - enemy.y, p.x - enemy.x) + weave;
  enemy.angle += angleDelta(enemy.angle, a) * Math.min(1, dt * 5);
  enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
  enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
}

function updateBeetle(run, enemy, dt) {
  const p = run.player;
  enemy.timer -= dt;
  if (enemy.state === 'move') {
    steer(enemy, p.x, p.y, enemy.speed, 2.5, dt);
    if (enemy.timer <= 0 && distance(enemy.x, enemy.y, p.x, p.y) < 460) {
      enemy.state = 'windup';
      enemy.timer = 0.65;
      enemy.chargeAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      run.events.push({ type: 'windup' });
    }
  } else if (enemy.state === 'windup') {
    enemy.angle += angleDelta(enemy.angle, Math.atan2(p.y - enemy.y, p.x - enemy.x)) * Math.min(1, dt * 8);
    enemy.chargeAngle = enemy.angle;
    if (enemy.timer <= 0) {
      enemy.state = 'charge';
      enemy.timer = 0.5;
    }
  } else {
    enemy.x += Math.cos(enemy.chargeAngle) * 560 * dt;
    enemy.y += Math.sin(enemy.chargeAngle) * 560 * dt;
    if (run.rng.chance(0.4)) burst(run.fx, enemy.x, enemy.y, { count: 1, colors: ['#f6ecd6'], speed: 40, size: 4, life: 0.4 });
    if (enemy.timer <= 0) {
      enemy.state = 'move';
      enemy.timer = run.rng.range(1.8, 3);
    }
  }
  enemy.x = clamp(enemy.x, -40, VIEW.width + 40);
  enemy.y = clamp(enemy.y, -40, VIEW.height + 40);
}

function updateSnipper(run, enemy, dt) {
  const thread = run.thread;
  const points = thread.points;
  let tx = run.player.x;
  let ty = run.player.y;
  if (points.length > 12) {
    const mid = points[Math.floor(points.length * 0.35)];
    tx = mid.x;
    ty = mid.y;
  }
  steer(enemy, tx, ty, enemy.speed, 4, dt);
  enemy.timer -= dt;
  if (points.length > 8 && enemy.timer <= 0) {
    for (let i = 0; i < points.length - 4; i += 2) {
      if (distance(enemy.x, enemy.y, points[i].x, points[i].y) < enemy.r + 6) {
        cutThread(thread);
        enemy.timer = 1.2;
        run.events.push({ type: 'snip' });
        floatText(run.fx, enemy.x, enemy.y - 26, 'SNIP!', '#ff8a8a', 24);
        burst(run.fx, enemy.x, enemy.y, { count: 14, colors: ['#d6333f', '#ff8a8a'], speed: 200, size: 5, kind: 'fiber' });
        break;
      }
    }
  }
}

function updateSpitter(run, enemy, dt) {
  const p = run.player;
  if (!enemy.home) enemy.home = { x: run.rng.range(140, VIEW.width - 140), y: run.rng.range(120, VIEW.height - 120) };
  if (distance(enemy.x, enemy.y, enemy.home.x, enemy.home.y) > 10) steer(enemy, enemy.home.x, enemy.home.y, enemy.speed * 2, 3, dt);
  else if (run.rng.chance(dt * 0.25)) enemy.home = null;
  enemy.timer -= dt;
  if (enemy.state === 'move' && enemy.timer <= 0) {
    enemy.state = 'aim';
    enemy.timer = 0.55;
    run.events.push({ type: 'windup' });
  } else if (enemy.state === 'aim' && enemy.timer <= 0) {
    const a = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    const fan = run.wave >= 8 ? 7 : 5;
    for (let i = 0; i < fan; i += 1) spawnShot(run, enemy.x, enemy.y, a + (i - (fan - 1) / 2) * 0.2, 250, 'pin');
    enemy.state = 'move';
    enemy.timer = run.rng.range(2.2, 3.2);
    run.events.push({ type: 'enemyShoot' });
  }
}

/** Keeps creatures from stacking on one spot. */
function separateEnemies(run) {
  const list = run.enemies;
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (a.dead || a.kind === 'wyrmSegment' || a.state === 'eat') continue;
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j];
      if (b.dead || b.kind === 'wyrmSegment' || b.state === 'eat') continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.8;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const aw = a.kind === 'matriarch' ? 0 : 1;
      const bw = b.kind === 'matriarch' ? 0 : 1;
      a.x -= (dx / d) * push * aw;
      a.y -= (dy / d) * push * aw;
      b.x += (dx / d) * push * bw;
      b.y += (dy / d) * push * bw;
    }
  }
}
