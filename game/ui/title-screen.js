// The title screen: the stitched logo, how to play, and the two choices made before a run:
// the mode (Classic, Daily Seam, Endless) and the needle (unlocked across runs).
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { MODES } from '../meta/modes.js';
import { NEEDLES, isUnlocked } from '../meta/needles.js';
import { drawNeedleShape } from '../render/sprites.js';
import { codexCounts } from '../meta/codex.js';
import { dimScreen, drawButton, drawFeltPanel, drawText, drawWrapped, formatNumber } from './widgets.js';

export function titleLayout() {
  return {
    modePrev: { x: 650, y: 296, w: 56, h: 56 },
    modeNext: { x: 1134, y: 296, w: 56, h: 56 },
    needlePrev: { x: 650, y: 486, w: 56, h: 56 },
    needleNext: { x: 1134, y: 486, w: 56, h: 56 },
    start: { x: 390, y: 650, w: 500, h: 70 },
    sampler: { x: 90, y: 656, w: 270, h: 60 },
  };
}

export function drawLogo(ctx, x, y, size, time) {
  const bob = Math.sin(time * 2) * 3;
  drawText(ctx, 'STITCHBOUND', x, y + bob, { size, color: PALETTE.cream, font: FONT.display, outline: size / 7, stitch: PALETTE.thread });
  ctx.save();
  ctx.translate(x + size * 4.35, y - size * 0.2 + bob);
  ctx.rotate(-0.5);
  ctx.scale(size / 70, size / 70);
  drawNeedleShape(ctx);
  ctx.restore();
}

/** view: { best, time, modeIndex, needleIndex, progress, hover } */
export function drawTitle(ctx, view) {
  const { time } = view;
  const layout = titleLayout();
  dimScreen(ctx, VIEW.width, VIEW.height, 0.35);
  drawLogo(ctx, VIEW.width / 2 - 30, 100, 104, time);
  drawText(ctx, 'Ten nights of moths. One needle. Mend the heirloom quilt.', VIEW.width / 2, 200, { size: 27, color: PALETTE.gold, outline: 6 });

  drawFeltPanel(ctx, 90, 240, 520, 390, PALETTE.cream, 'rgba(42,29,26,0.45)', 22);
  drawText(ctx, 'HOW TO PLAY', 350, 278, { size: 26, color: PALETTE.thread, outline: 0 });
  const controls = [
    ['WASD', 'move the needle'],
    ['MOUSE', 'aim, hold to fire pins'],
    ['SPACE', 'snip-dash'],
    ['P / M', 'pause / mute'],
  ];
  controls.forEach(([key, what], i) => {
    const y = 324 + i * 46;
    drawKeyCap(ctx, 120, y - 19, key);
    drawText(ctx, what, 248, y, { size: 22, color: PALETTE.ink, align: 'left', outline: 0 });
  });
  drawWrapped(ctx, 'Cross your own thread to close a loop: it CINCHES every pest inside and DARNS the holes. Choose your path on the quilt road, collect notions and relics, find synergies.', 350, 528, 460, 28, { size: 20, color: PALETTE.ink, outline: 0, weight: 'normal' });

  const mode = MODES[view.modeIndex];
  drawFeltPanel(ctx, 640, 240, 560, 180, PALETTE.navy, 'rgba(246,236,214,0.6)', 18);
  drawText(ctx, 'MODE', 920, 268, { size: 20, color: PALETTE.gold, outline: 0 });
  drawArrow(ctx, layout.modePrev, -1, view.hover === 'modePrev');
  drawArrow(ctx, layout.modeNext, 1, view.hover === 'modeNext');
  drawText(ctx, mode.name.toUpperCase(), 920, 324, { size: 40, color: PALETTE.cream, outline: 6, font: FONT.plain });
  drawWrapped(ctx, mode.text, 920, 372, 400, 26, { size: 20, color: PALETTE.cream, outline: 0, weight: 'normal' });

  const needle = NEEDLES[view.needleIndex];
  const open = isUnlocked(needle, view.progress);
  drawFeltPanel(ctx, 640, 430, 560, 200, PALETTE.cream, 'rgba(42,29,26,0.45)', 18);
  drawText(ctx, `NEEDLE ${view.needleIndex + 1} / ${NEEDLES.length}`, 920, 458, { size: 20, color: PALETTE.thread, outline: 0 });
  drawArrow(ctx, layout.needlePrev, -1, view.hover === 'needlePrev');
  drawArrow(ctx, layout.needleNext, 1, view.hover === 'needleNext');
  ctx.save();
  ctx.translate(920, 500);
  ctx.rotate(-0.15);
  ctx.scale(2.6, 2.6);
  ctx.globalAlpha = open ? 1 : 0.35;
  drawNeedleShape(ctx, needle.color);
  ctx.restore();
  ctx.globalAlpha = 1;
  drawText(ctx, needle.name, 920, 552, { size: 30, color: PALETTE.ink, outline: 0 });
  if (open) drawText(ctx, needle.text, 920, 590, { size: 19, color: PALETTE.terracotta, outline: 0, weight: 'normal' });
  else drawText(ctx, `LOCKED: ${needle.unlock.text}`, 920, 590, { size: 21, color: PALETTE.danger, outline: 0 });

  const { found, total } = codexCounts();
  drawButton(ctx, layout.sampler, `SAMPLER (C) ${found}/${total}`, { hover: view.hover === 'sampler', size: 21, fill: PALETTE.plum });
  const pulse = 0.88 + 0.12 * Math.sin(time * 5);
  drawFeltPanel(ctx, layout.start.x, layout.start.y, layout.start.w, layout.start.h, view.hover === 'start' ? PALETTE.thread : PALETTE.terracotta, 'rgba(246,236,214,0.7)', 16);
  ctx.globalAlpha = pulse;
  drawText(ctx, open ? 'CLICK or ENTER to begin' : 'Choose an unlocked needle', VIEW.width / 2, layout.start.y + 36, { size: 32, color: PALETTE.cream, outline: 6 });
  ctx.globalAlpha = 1;
  drawText(ctx, `BEST ${mode.name.toUpperCase()}  ${formatNumber(view.best)}      arrows: mode and needle`, VIEW.width / 2, 760, { size: 21, color: PALETTE.gold, outline: 5 });
}

function drawArrow(ctx, rect, dir, hover) {
  drawFeltPanel(ctx, rect.x, rect.y, rect.w, rect.h, hover ? PALETTE.thread : PALETTE.mustard, 'rgba(246,236,214,0.6)', 10);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx + dir * 10, cy);
  ctx.lineTo(cx - dir * 8, cy - 12);
  ctx.lineTo(cx - dir * 8, cy + 12);
  ctx.closePath();
  ctx.fillStyle = PALETTE.cream;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawKeyCap(ctx, x, y, label) {
  const w = 112;
  const h = 38;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = PALETTE.navy;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(246,236,214,0.6)';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.setLineDash([]);
  drawText(ctx, label, x + w / 2, y + h / 2 + 1, { size: 20, color: PALETTE.cream, outline: 0 });
}
