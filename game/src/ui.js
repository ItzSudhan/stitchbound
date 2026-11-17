// Shared drawing helpers for menus and the HUD: felt panels with running-stitch borders, stitched
// lettering, meters and number formatting.
import { FONT, PALETTE } from './config.js';

export function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A felt panel: a dark drop shadow, a rounded felt body and a running stitch just inside its edge. */
export function drawFeltPanel(ctx, x, y, w, h, fill = PALETTE.paper, stitch = 'rgba(42,29,26,0.55)', radius = 16) {
  ctx.fillStyle = 'rgba(42,29,26,0.35)';
  roundRect(ctx, x + 6, y + 8, w, h, radius);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  ctx.strokeStyle = stitch;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([9, 6]);
  roundRect(ctx, x + 9, y + 9, w - 18, h - 18, Math.max(4, radius - 6));
  ctx.stroke();
  ctx.setLineDash([]);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text with a thick ink outline, and optionally a dashed stitch running through the outline. */
export function drawText(ctx, text, x, y, { size = 28, color = PALETTE.cream, align = 'center', font = FONT.ui, weight = 'bold', outline = 6, stitch = null, baseline = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (outline > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = outline;
    ctx.strokeStyle = PALETTE.ink;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  if (stitch) {
    ctx.lineWidth = Math.max(1.5, size / 30);
    ctx.strokeStyle = stitch;
    ctx.setLineDash([size / 9, size / 14]);
    ctx.strokeText(text, x, y);
    ctx.setLineDash([]);
  }
}

/** A meter: an inked track and a fill, with a stitched highlight. */
export function drawMeter(ctx, x, y, w, h, fraction, color, track = 'rgba(42,29,26,0.55)') {
  ctx.fillStyle = track;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = Math.max(0, Math.min(1, fraction));
  if (f > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(x + h / 2, y + h * 0.35);
    ctx.lineTo(x + Math.max(h, w * f) - h / 2, y + h * 0.35);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

/** A small spool icon: full spools are health left, empty ones health lost. */
export function drawSpool(ctx, x, y, full) {
  ctx.fillStyle = full ? PALETTE.thread : 'rgba(42,29,26,0.4)';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.rect(x - 9, y - 11, 18, 22);
  ctx.fill();
  ctx.stroke();
  if (full) {
    ctx.strokeStyle = 'rgba(255,200,200,0.8)';
    ctx.lineWidth = 1.5;
    for (let i = -6; i <= 6; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x - 8, y + i);
      ctx.lineTo(x + 8, y + i + 2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#c9a26b';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  for (const dy of [-14, 11]) {
    ctx.beginPath();
    ctx.rect(x - 13, y + dy, 26, 5);
    ctx.fill();
    ctx.stroke();
  }
}
