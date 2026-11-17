// Spare spools: the sturdier pests sometimes drop one. Touch it to win back a spool of health
// (or bonus points at full health). It bobs on the quilt for a while, blinks, then is gone, so
// the player keeps choosing between grabbing it and holding their loop.
import { PALETTE } from './config.js';
import { distance } from './geometry.js';
import { burst, floatText, ring } from './effects.js';
import { drawSpool } from './ui.js';

const DROP_CHANCE = { beetle: 0.3, spitter: 0.35, snipper: 0.25, wyrmSegment: 0.18, silverfish: 0.04, moth: 0.02 };
const LIFETIME = 9;
const REACH = 34;

export function maybeDropSpool(run, enemy) {
  const chance = DROP_CHANCE[enemy.kind] ?? 0;
  if (chance > 0 && run.rng.chance(chance)) run.pickups.push({ x: enemy.x, y: enemy.y, age: 0 });
}

export function updatePickups(run, dt) {
  const p = run.player;
  for (const pickup of run.pickups) {
    pickup.age += dt;
    if (distance(pickup.x, pickup.y, p.x, p.y) > REACH) continue;
    pickup.age = LIFETIME;
    if (p.hp < run.mods.hp) {
      p.hp += 1;
      floatText(run.fx, pickup.x, pickup.y - 24, '+1 SPOOL', PALETTE.threadLight, 26);
    } else {
      run.score += 250;
      floatText(run.fx, pickup.x, pickup.y - 24, '+250', PALETTE.gold, 24);
    }
    burst(run.fx, pickup.x, pickup.y, { count: 14, colors: [PALETTE.thread, PALETTE.cream, PALETTE.gold], speed: 200, size: 5, kind: 'spark' });
    ring(run.fx, pickup.x, pickup.y, PALETTE.thread, 60, 0.4, 5);
    run.events.push({ type: 'pickup' });
  }
  run.pickups = run.pickups.filter((pickup) => pickup.age < LIFETIME);
}

export function drawPickups(ctx, run, time) {
  for (const pickup of run.pickups) {
    const left = LIFETIME - pickup.age;
    if (left < 2 && Math.floor(time * 10) % 2 === 0) continue;
    const bob = Math.sin(time * 4 + pickup.x) * 4;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(pickup.x + 4, pickup.y + 16, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, 24 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(pickup.x, pickup.y + bob);
    ctx.scale(1.25, 1.25);
    drawSpool(ctx, 0, 0, true);
    ctx.restore();
  }
}
