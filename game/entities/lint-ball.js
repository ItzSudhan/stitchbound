// The lint ball: a rolling clump of fluff that bumbles toward the needle and, when struck apart,
// splits into two smaller balls (twice over), so a careless shot makes more trouble.
import { VIEW, PALETTE } from '../core/config.js';
import { TAU } from '../core/geometry.js';
import { spawnEnemy } from './enemies.js';
import { nearestNeedle } from '../coop/two-needles.js';
import { drawShadow, inked } from '../render/sprites.js';

export function updateLintBall(run, enemy, dt) {
  const p = nearestNeedle(run, enemy.x, enemy.y);
  const a = Math.atan2(p.y - enemy.y, p.x - enemy.x) + Math.sin(enemy.age * 2 + enemy.seed) * 0.8;
  enemy.vx += (Math.cos(a) * enemy.speed - enemy.vx) * Math.min(1, dt * 2);
  enemy.vy += (Math.sin(a) * enemy.speed - enemy.vy) * Math.min(1, dt * 2);
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  if ((enemy.x < 20 && enemy.vx < 0) || (enemy.x > VIEW.width - 20 && enemy.vx > 0)) enemy.vx *= -1;
  if ((enemy.y < 20 && enemy.vy < 0) || (enemy.y > VIEW.height - 20 && enemy.vy > 0)) enemy.vy *= -1;
  enemy.angle += (Math.hypot(enemy.vx, enemy.vy) / Math.max(8, enemy.r)) * dt;
}

/** Struck apart: two smaller balls tumble out, until the third size. */
export function splitLintBall(run, enemy) {
  const gen = enemy.gen ?? 0;
  if (gen >= 2) return;
  for (const side of [-1, 1]) {
    const child = spawnEnemy(run, 'lintBall', enemy.x + side * enemy.r * 0.6, enemy.y, {
      gen: gen + 1,
      r: enemy.r * 0.7,
      hp: enemy.maxHp * 0.45,
      maxHp: enemy.maxHp * 0.45,
      score: Math.round(enemy.score * 0.6),
      elite: enemy.elite,
    });
    child.vx = side * 160;
    child.vy = -60;
  }
}

export function drawLintBall(ctx, e, time) {
  const r = e.r;
  drawShadow(ctx, e.x, e.y, r * 1.05);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.beginPath();
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * TAU;
    const rr = r * (0.86 + 0.14 * Math.sin(i * 2.7 + (e.seed ?? 0)));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  inked(ctx, e.flash > 0.82 ? '#fff4e0' : '#b9b4c4', 2.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i += 1) {
    const a = i * 0.9 + (e.seed ?? 0);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, r * 0.3, a, a + 2);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.thread;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.2);
  ctx.quadraticCurveTo(0, -r * 0.5 + Math.sin(time * 3) * 2, r * 0.7, r * 0.1);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(e.x - r * 0.25, e.y - r * 0.1, Math.max(2, r * 0.1), 0, TAU);
  ctx.arc(e.x + r * 0.25, e.y - r * 0.1, Math.max(2, r * 0.1), 0, TAU);
  ctx.fill();
}
