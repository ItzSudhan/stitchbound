// The carpet beetle: a slow, mottled beetle that walks the seams between patches, chewing the
// cloth on both sides of every seam it follows. It turns at each crossing, so it wanders the grid.
import { PATCH, PALETTE } from '../core/config.js';
import { TAU } from '../core/geometry.js';
import { nibblePatch } from '../world/quilt.js';
import { drawShadow, inked } from '../render/sprites.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The patches either side of the seam point (x, y) when moving along (dx, dy). */
function patchesBeside(quilt, x, y, dx, dy) {
  const out = [];
  for (const side of [-1, 1]) {
    const px = x + (dy !== 0 ? side * PATCH.size * 0.5 : dx * 2);
    const py = y + (dx !== 0 ? side * PATCH.size * 0.5 : dy * 2);
    const col = Math.floor(px / PATCH.size);
    const row = Math.floor(py / PATCH.size);
    if (col >= 0 && row >= 0 && col < PATCH.cols && row < PATCH.rows) out.push(quilt.patches[row * PATCH.cols + col]);
  }
  return out;
}

export function updateCarpetBeetle(run, enemy, dt) {
  if (!enemy.seam) {
    // First walk to the nearest seam crossing.
    const gx = Math.min(PATCH.cols - 1, Math.max(1, Math.round(enemy.x / PATCH.size))) * PATCH.size;
    const gy = Math.min(PATCH.rows - 1, Math.max(1, Math.round(enemy.y / PATCH.size))) * PATCH.size;
    const a = Math.atan2(gy - enemy.y, gx - enemy.x);
    enemy.angle = a;
    enemy.x += Math.cos(a) * enemy.speed * 1.6 * dt;
    enemy.y += Math.sin(a) * enemy.speed * 1.6 * dt;
    if (Math.hypot(gx - enemy.x, gy - enemy.y) < 4) enemy.seam = { x: gx, y: gy, dx: 0, dy: 0 };
    return;
  }
  const seam = enemy.seam;
  if (seam.dx === 0 && seam.dy === 0) {
    const options = DIRS.filter(([dx, dy]) => {
      const nx = seam.x + dx * PATCH.size;
      const ny = seam.y + dy * PATCH.size;
      return nx > 0 && ny > 0 && nx < PATCH.cols * PATCH.size && ny < PATCH.rows * PATCH.size;
    });
    const [dx, dy] = run.rng.pick(options);
    Object.assign(seam, { dx, dy, tx: seam.x + dx * PATCH.size, ty: seam.y + dy * PATCH.size });
  }
  enemy.angle = Math.atan2(seam.dy, seam.dx);
  enemy.x += seam.dx * enemy.speed * dt;
  enemy.y += seam.dy * enemy.speed * dt;
  for (const patch of patchesBeside(run.quilt, enemy.x, enemy.y, seam.dx, seam.dy)) {
    if (patch.hp > 0) nibblePatch(run.quilt, patch, 0.04 * dt);
  }
  // Arrived (or pushed past) the next crossing: snap onto it and choose again.
  const remaining = (seam.tx - enemy.x) * seam.dx + (seam.ty - enemy.y) * seam.dy;
  if (remaining <= 0 || Math.hypot(seam.tx - enemy.x, seam.ty - enemy.y) > PATCH.size * 1.5) {
    enemy.x = seam.tx;
    enemy.y = seam.ty;
    Object.assign(seam, { x: seam.tx, y: seam.ty, dx: 0, dy: 0 });
  }
}

export function drawCarpetBeetle(ctx, e, time) {
  drawShadow(ctx, e.x, e.y, e.r * 1.1);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  const step = Math.sin(time * 12 + e.seed) * 3;
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * e.r * 0.5, 0);
      ctx.lineTo(i * e.r * 0.5 + (i === 0 ? step : -step), side * e.r * 1.2);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, e.r * 1.05, e.r * 0.85, 0, 0, TAU);
  inked(ctx, e.flash > 0.82 ? '#fff4e0' : '#6b4226', 2.5);
  const spots = [[-0.4, -0.3, '#e9c46a'], [0.2, 0.35, '#f6ecd6'], [-0.1, 0.1, '#cf6a43'], [0.45, -0.25, '#f6ecd6'], [-0.6, 0.35, '#e9c46a']];
  for (const [sx, sy, color] of spots) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx * e.r, sy * e.r, e.r * 0.18, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(e.r * 0.95, 0, e.r * 0.35, 0, TAU);
  inked(ctx, PALETTE.ink, 2);
  ctx.restore();
}
