// The burrowing silverfish: it tunnels under the cloth toward the needle, tearing the patches it
// passes beneath, where pins and loops cannot touch it. Then it bursts up to bite, and for a
// moment it can be hit, before it dives again.
import { PALETTE } from '../core/config.js';
import { clamp, TAU } from '../core/geometry.js';
import { VIEW } from '../core/config.js';
import { nibblePatch } from '../world/quilt.js';
import { patchUnder } from '../world/patches.js';
import { burst } from '../render/effects.js';
import { drawShadow, inked } from '../render/sprites.js';

const UNDER_SECONDS = 3.2;
const SURFACE_SECONDS = 2.4;

export function updateBurrower(run, enemy, dt) {
  const p = run.player;
  enemy.timer -= dt;
  if (enemy.state !== 'surface') {
    enemy.buried = true;
    enemy.passive = true;
    const tx = p.x + Math.cos(enemy.seed) * 60;
    const ty = p.y + Math.sin(enemy.seed) * 60;
    const a = Math.atan2(ty - enemy.y, tx - enemy.x);
    enemy.angle = a;
    enemy.x = clamp(enemy.x + Math.cos(a) * enemy.speed * dt, 10, VIEW.width - 10);
    enemy.y = clamp(enemy.y + Math.sin(a) * enemy.speed * dt, 10, VIEW.height - 10);
    const patch = patchUnder(run.quilt, enemy.x, enemy.y);
    if (patch && patch.hp > 0) nibblePatch(run.quilt, patch, 0.05 * dt);
    if (enemy.timer <= 0 || Math.hypot(tx - enemy.x, ty - enemy.y) < 20) {
      enemy.state = 'surface';
      enemy.timer = SURFACE_SECONDS;
      enemy.buried = false;
      enemy.passive = false;
      burst(run.fx, enemy.x, enemy.y, { count: 12, colors: ['#c9a26b', PALETTE.cream], speed: 180, size: 4, kind: 'fiber' });
      run.events.push({ type: 'windup' });
    }
  } else {
    enemy.angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    enemy.x += Math.cos(enemy.angle) * enemy.speed * 0.35 * dt;
    enemy.y += Math.sin(enemy.angle) * enemy.speed * 0.35 * dt;
    if (enemy.timer <= 0) {
      enemy.state = 'under';
      enemy.timer = UNDER_SECONDS;
      enemy.seed += 1.7;
    }
  }
}

export function drawBurrower(ctx, e, time) {
  if (e.buried) {
    // A travelling bump under the cloth, with a dashed ripple behind it.
    ctx.strokeStyle = 'rgba(42,29,26,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(e.x, e.y, 16 + Math.sin(time * 10) * 3, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(42,29,26,0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 12, 8, e.angle, 0, TAU);
    ctx.fill();
    return;
  }
  drawShadow(ctx, e.x, e.y, e.r * 1.5, e.r * 0.5);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(e.r * 0.8, side * 4);
    ctx.lineTo(e.r * 1.6, side * e.r * 0.8);
    ctx.lineTo(e.r * 1.9, side * e.r * 0.4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(e.r * 1.1, 0);
  ctx.quadraticCurveTo(e.r * 0.4, -e.r * 0.8, -e.r * 0.5, -e.r * 0.5);
  ctx.lineTo(-e.r * 1.4, 0);
  ctx.lineTo(-e.r * 0.5, e.r * 0.5);
  ctx.quadraticCurveTo(e.r * 0.4, e.r * 0.8, e.r * 1.1, 0);
  inked(ctx, e.flash > 0.82 ? '#fff4e0' : '#c9a26b', 2);
  ctx.strokeStyle = '#7a5a32';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(e.r * (0.5 - i * 0.45), -e.r * 0.5);
    ctx.lineTo(e.r * (0.5 - i * 0.45), e.r * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}
