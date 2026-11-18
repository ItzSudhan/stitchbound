// The two big fights. Night 5: the Yarn Wyrm, a head that chases the needle trailing a chain of
// yarn-ball segments that each take a beating. Night 10: the Moth Matriarch, a three-phase boss
// that sweeps the quilt in a figure-eight, sheds rings and spirals of dust and calls her brood.
import { VIEW } from '../core/config.js';
import { angleDelta, clamp, TAU } from '../core/geometry.js';
import { spawnEnemy } from './enemies.js';
import { nearestNeedle } from '../coop/two-needles.js';
import { spawnShot, spawnShotRing } from './projectiles.js';
import { addShake, floatText, ring, screenFlash } from '../render/effects.js';

const WYRM_SEGMENTS = 11;
const WYRM_SPACING = 7;

export function spawnWyrm(run) {
  const head = spawnEnemy(run, 'wyrm', -60, VIEW.height * 0.3, { trail: [], boss: true });
  head.angle = 0;
  for (let i = 1; i <= WYRM_SEGMENTS; i += 1) {
    spawnEnemy(run, 'wyrmSegment', -60 - i * 20, VIEW.height * 0.3, { head, index: i, radiusScale: 1 - i * 0.035 });
  }
  return head;
}

export function updateWyrmHead(run, head, dt) {
  const p = nearestNeedle(run, head.x, head.y);
  head.timer -= dt;
  let tx = p.x;
  let ty = p.y;
  // Keep the coil on the quilt: near an edge it turns back toward the middle.
  if (head.x < 80 || head.x > VIEW.width - 80 || head.y < 80 || head.y > VIEW.height - 80) {
    tx = VIEW.width / 2;
    ty = VIEW.height / 2;
  }
  const lunge = head.state === 'lunge';
  const want = Math.atan2(ty - head.y, tx - head.x) + Math.sin(head.age * 2.4) * 0.7;
  head.angle += clamp(angleDelta(head.angle, want), -2.4 * dt, 2.4 * dt);
  const speed = head.speed * (lunge ? 2.3 : 1);
  head.x += Math.cos(head.angle) * speed * dt;
  head.y += Math.sin(head.angle) * speed * dt;
  head.trail.push({ x: head.x, y: head.y });
  if (head.trail.length > WYRM_SEGMENTS * WYRM_SPACING + 4) head.trail.shift();
  if (head.timer <= 0) {
    if (lunge) {
      head.state = 'move';
      head.timer = 3.2;
      spawnShotRing(run, head.x, head.y, 10, 150, 'dust', head.age);
      run.events.push({ type: 'enemyShoot' });
    } else {
      head.state = 'lunge';
      head.timer = 1.1;
      run.events.push({ type: 'roar' });
    }
  }
}

export function updateWyrmSegment(run, segment) {
  const head = segment.head;
  if (head.dead) return;
  const trail = head.trail;
  const at = trail[Math.max(0, trail.length - 1 - segment.index * WYRM_SPACING)];
  if (at) {
    segment.angle = Math.atan2(at.y - segment.y, at.x - segment.x) || segment.angle;
    segment.x = at.x;
    segment.y = at.y;
  }
}

export function spawnMatriarch(run) {
  const boss = spawnEnemy(run, 'matriarch', VIEW.width / 2, -140, { boss: true, phase: 1, ringTimer: 2, summonTimer: 5, spiralTimer: 6, spiralLeft: 0, spiralAngle: 0, entering: true });
  run.boss = boss;
  run.events.push({ type: 'roar' });
  return boss;
}

/** Calls a ring of guard moths that circle the Matriarch until they are stitched or she falls. */
function summonGuards(run, boss, count) {
  for (let i = 0; i < count; i += 1) {
    const orbit = (i / count) * TAU;
    spawnEnemy(run, 'moth', boss.x + Math.cos(orbit) * 150, boss.y + Math.sin(orbit) * 115, { guard: boss, orbit });
  }
  run.events.push({ type: 'summon' });
}

function matriarchPhase(boss) {
  const f = boss.hp / boss.maxHp;
  return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
}

export function updateMatriarch(run, boss, dt) {
  const t = boss.age;
  if (boss.entering) {
    boss.y += (230 - boss.y) * Math.min(1, dt * 1.5);
    boss.passive = true;
    if (boss.y > 220) {
      boss.entering = false;
      boss.passive = false;
      summonGuards(run, boss, 6);
    }
    return;
  }
  const phase = matriarchPhase(boss);
  if (phase !== boss.phase) {
    boss.phase = phase;
    summonGuards(run, boss, phase === 3 ? 8 : 7);
    run.events.push({ type: 'phase' });
    screenFlash(run.fx, '#f5c542', 0.6);
    addShake(run.fx, 18);
    ring(run.fx, boss.x, boss.y, '#f5c542', 260, 0.8, 10);
    floatText(run.fx, boss.x, boss.y - 110, phase === 2 ? 'SHE STIRS THE DUST!' : 'THE MATRIARCH RAGES!', '#f5c542', 34);
  }
  const pace = 1 + (phase - 1) * 0.35;
  const tx = VIEW.width / 2 + Math.sin(t * 0.45 * pace) * 400;
  const ty = 260 + Math.sin(t * 0.9 * pace) * 120 + (phase === 3 ? Math.sin(t * 0.3) * 120 : 0);
  boss.vx = (tx - boss.x) * Math.min(1, dt * 1.8);
  boss.vy = (ty - boss.y) * Math.min(1, dt * 1.8);
  boss.x += boss.vx;
  boss.y += boss.vy;
  boss.angle = Math.sin(t * 0.8) * 0.12;

  boss.ringTimer -= dt;
  if (boss.ringTimer <= 0) {
    const count = [0, 14, 18, 22][phase];
    spawnShotRing(run, boss.x, boss.y, count, 165 + phase * 15, 'dust', t * 0.7);
    boss.ringTimer = [0, 2.5, 2.0, 1.5][phase];
    run.events.push({ type: 'enemyShoot' });
  }

  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    const kind = phase === 3 ? 'silverfish' : 'moth';
    const count = phase === 3 ? 6 : 4;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU + t;
      spawnEnemy(run, kind, boss.x + Math.cos(a) * 90, boss.y + Math.sin(a) * 60);
    }
    boss.summonTimer = phase === 3 ? 6 : 7.5;
    run.events.push({ type: 'summon' });
  }

  if (phase >= 2) {
    boss.spiralTimer -= dt;
    if (boss.spiralTimer <= 0 && boss.spiralLeft <= 0) {
      boss.spiralLeft = 2.6;
      boss.spiralTimer = 7;
    }
    if (boss.spiralLeft > 0) {
      boss.spiralLeft -= dt;
      boss.spiralAngle += dt * 4.2;
      boss.emit = (boss.emit ?? 0) + dt * (phase === 3 ? 16 : 11);
      while (boss.emit >= 1) {
        boss.emit -= 1;
        spawnShot(run, boss.x, boss.y, boss.spiralAngle, 200, 'dust');
        spawnShot(run, boss.x, boss.y, boss.spiralAngle + Math.PI, 200, 'dust');
      }
    }
  }
}
