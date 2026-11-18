// The living patches, drawn every frame: frayed squares with loose fringes and a red tinge, and
// candle patches with a wax stub and a flickering flame (dark and smoking once eaten out).
import { PALETTE, PATCH } from '../core/config.js';
import { TAU } from '../core/geometry.js';

export function drawFrayedPatches(ctx, quilt, time) {
  for (const patch of quilt.patches) {
    if (patch.kind !== 'frayed' || patch.hp <= 0) continue;
    const pulse = 0.18 + 0.08 * Math.sin(time * 4 + patch.col);
    ctx.fillStyle = `rgba(224,71,58,${pulse})`;
    ctx.fillRect(patch.x, patch.y, PATCH.size, PATCH.size);
    ctx.strokeStyle = '#f6ecd6';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const t = (i + 0.5) / 12;
      const sway = Math.sin(time * 3 + i) * 3;
      const edge = i % 4;
      const along = t * PATCH.size;
      const x = edge === 0 ? patch.x + along : edge === 1 ? patch.x + PATCH.size : edge === 2 ? patch.x + along : patch.x;
      const y = edge === 0 ? patch.y : edge === 1 ? patch.y + along : edge === 2 ? patch.y + PATCH.size : patch.y + along;
      const nx = edge === 1 ? 1 : edge === 3 ? -1 : 0;
      const ny = edge === 0 ? -1 : edge === 2 ? 1 : 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + nx * 6 + sway, y + ny * 6 + sway, x + nx * 11, y + ny * 11);
      ctx.stroke();
    }
  }
}

export function drawCandles(ctx, quilt, time) {
  for (const patch of quilt.patches) {
    if (patch.kind !== 'candle') continue;
    const lit = patch.hp > 0.4;
    const x = patch.cx;
    const y = patch.cy + 8;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 18, 16, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f6ecd6';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(x - 9, y - 14, 18, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e9dcc0';
    ctx.beginPath();
    ctx.ellipse(x, y - 14, 9, 4, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x, y - 22);
    ctx.stroke();
    if (!lit) {
      ctx.strokeStyle = 'rgba(200,200,200,0.6)';
      ctx.beginPath();
      ctx.moveTo(x, y - 24);
      ctx.quadraticCurveTo(x + 6 + Math.sin(time * 2) * 3, y - 34, x, y - 44);
      ctx.stroke();
      continue;
    }
    const flicker = 1 + Math.sin(time * 17 + patch.col) * 0.08 + Math.sin(time * 7) * 0.05;
    ctx.save();
    ctx.translate(x, y - 24);
    ctx.scale(flicker, flicker);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(9, -4, 0, 4);
    ctx.quadraticCurveTo(-9, -4, 0, -18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath();
    ctx.ellipse(0, -3, 3, 6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
