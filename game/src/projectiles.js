// Everything that flies: the player's pins (with spread, pierce, ricochet and golden crits) and
// the creatures' shots (moth dust and pincushion pins), which guard buttons can block.
import { VIEW } from './config.js';
import { distance, TAU } from './geometry.js';
import { damageEnemy } from './enemies.js';
import { burst } from './effects.js';
import { buttonPositions, hurtPlayer } from './player.js';

const PIN_SPREAD = 0.13;

/** A volley: one pin per Twin Pins level, fanned around the aim. */
export function firePins(run, x, y, angle) {
  const count = run.mods.pinCount;
  for (let i = 0; i < count; i += 1) firePinAt(run, x, y, angle + (i - (count - 1) / 2) * PIN_SPREAD);
  run.events.push({ type: 'shoot' });
}

/** One pin from (x, y) along angle a, with the player's damage, crits, pierce and ricochet. */
export function firePinAt(run, x, y, a) {
  const mods = run.mods;
  const crit = run.rng.chance(mods.critChance);
  run.pins.push({
    x: x + Math.cos(a) * 18,
    y: y + Math.sin(a) * 18,
    vx: Math.cos(a) * mods.pinSpeed,
    vy: Math.sin(a) * mods.pinSpeed,
    damage: mods.pinDamage * (crit ? 3 : 1),
    crit,
    pierce: mods.pierce,
    bounce: mods.bounce,
    hit: new Set(),
    life: 1.2,
  });
}

export function updatePins(run, dt) {
  for (const pin of run.pins) {
    pin.life -= dt;
    pin.x += pin.vx * dt;
    pin.y += pin.vy * dt;
    if (pin.x < -20 || pin.y < -20 || pin.x > VIEW.width + 20 || pin.y > VIEW.height + 20) pin.life = 0;
    if (pin.life <= 0) continue;
    for (const enemy of run.enemies) {
      if (enemy.dead || pin.hit.has(enemy.id)) continue;
      if (distance(pin.x, pin.y, enemy.x, enemy.y) > enemy.r + 6) continue;
      pin.hit.add(enemy.id);
      damageEnemy(run, enemy, pin.damage, pin.crit ? 'crit' : 'pin', pin.vx, pin.vy);
      if (pin.bounce > 0) {
        pin.bounce -= 1;
        redirectPin(run, pin);
      } else if (pin.pierce > 0) {
        pin.pierce -= 1;
      } else {
        pin.life = 0;
      }
      break;
    }
  }
  run.pins = run.pins.filter((pin) => pin.life > 0);
}

/** A bent pin turns toward the nearest foe it has not struck yet. */
function redirectPin(run, pin) {
  let best = null;
  let bestDist = 420;
  for (const enemy of run.enemies) {
    if (enemy.dead || pin.hit.has(enemy.id)) continue;
    const d = distance(pin.x, pin.y, enemy.x, enemy.y);
    if (d < bestDist) {
      best = enemy;
      bestDist = d;
    }
  }
  if (!best) return;
  const speed = Math.hypot(pin.vx, pin.vy);
  const a = Math.atan2(best.y - pin.y, best.x - pin.x);
  pin.vx = Math.cos(a) * speed;
  pin.vy = Math.sin(a) * speed;
  pin.life = Math.max(pin.life, 0.6);
}

/** A creature's shot: 'dust' is a slow moth-dust mote, 'pin' a fast pincushion pin. */
export function spawnShot(run, x, y, angle, speed, kind = 'dust') {
  run.shots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: kind === 'dust' ? 10 : 6, kind, life: 6, spin: 0 });
}

/** A ring of shots, evenly spaced, starting at `offset`. */
export function spawnShotRing(run, x, y, count, speed, kind, offset = 0) {
  for (let i = 0; i < count; i += 1) spawnShot(run, x, y, offset + (i / count) * TAU, speed, kind);
}

export function updateShots(run, dt) {
  const p = run.player;
  const guards = buttonPositions(run);
  for (const shot of run.shots) {
    shot.life -= dt;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.spin += dt * 6;
    if (shot.x < -40 || shot.y < -40 || shot.x > VIEW.width + 40 || shot.y > VIEW.height + 40) shot.life = 0;
    if (shot.life <= 0) continue;
    for (const g of guards) {
      if (distance(shot.x, shot.y, g.x, g.y) < shot.r + 14) {
        shot.life = 0;
        burst(run.fx, shot.x, shot.y, { count: 6, colors: ['#9c7bb0', '#f6ecd6'], speed: 120, size: 3, life: 0.3 });
        run.events.push({ type: 'block' });
        break;
      }
    }
    if (shot.life > 0 && distance(shot.x, shot.y, p.x, p.y) < shot.r + 10) {
      if (hurtPlayer(run, 1)) shot.life = 0;
    }
  }
  run.shots = run.shots.filter((shot) => shot.life > 0);
}
