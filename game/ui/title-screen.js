// The title screen: the stitched logo over the lit attract-mode quilt, the run's goal in one line,
// the menu (New run, the mode and needle pickers, the Two Needles co-op switch, the Sampler), the
// controls, the best score, and the Moth Matriarch waiting at the end of the road. Few words, all
// of them big.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { MODES } from '../meta/modes.js';
import { NEEDLES, isUnlocked } from '../meta/needles.js';
import { drawNeedleShape } from '../render/sprites.js';
import { drawPortrait } from '../render/portraits.js';
import { codexCounts } from '../meta/codex.js';
import { PARTNER } from '../coop/two-needles.js';
import { drawFeltPanel, drawText, formatNumber } from './widgets.js';

const MENU = { x: 56, y: 236, w: 560, h: 486 };

export function titleLayout() {
  return {
    start: { x: 84, y: 254, w: 504, h: 94 },
    modePrev: { x: 84, y: 364, w: 60, h: 56 },
    modeNext: { x: 528, y: 364, w: 60, h: 56 },
    needlePrev: { x: 84, y: 432, w: 60, h: 56 },
    needleNext: { x: 528, y: 432, w: 60, h: 56 },
    coop: { x: 84, y: 502, w: 504, h: 72 },
    sampler: { x: 84, y: 588, w: 504, h: 52 },
  };
}

/** The run's goal, in one line, for the chosen mode. */
export function modeGoal(mode) {
  return mode.endless ? 'Sew as far as you can: the bosses return' : 'Survive 10 nights and beat the Moth Matriarch';
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

/** view: { best, time, modeIndex, needleIndex, progress, hover, coop } */
export function drawTitle(ctx, view) {
  const { time } = view;
  const mode = MODES[view.modeIndex];
  drawStage(ctx, time);
  drawLogo(ctx, VIEW.width / 2 - 40, 96, 128, time);
  drawFeltPanel(ctx, 170, 168, 940, 56, '#2b1f33', PALETTE.gold, 16);
  drawText(ctx, modeGoal(mode), VIEW.width / 2, 197, { size: 33, color: PALETTE.gold, outline: 0, font: FONT.plain });
  drawMenu(ctx, view, mode);
  drawBoss(ctx, time);
  drawBest(ctx, mode, view.best, view.coop);
  drawControls(ctx, view.coop);
}

/** The attract-mode quilt stays lit on the right; a soft dark settles under the menu and logo. */
function drawStage(ctx, time) {
  const shade = ctx.createLinearGradient(0, 0, VIEW.width, 0);
  shade.addColorStop(0, 'rgba(30,18,24,0.62)');
  shade.addColorStop(0.5, 'rgba(30,18,24,0.22)');
  shade.addColorStop(1, 'rgba(30,18,24,0.08)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const top = ctx.createLinearGradient(0, 0, 0, 240);
  top.addColorStop(0, 'rgba(30,18,24,0.55)');
  top.addColorStop(1, 'rgba(30,18,24,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, VIEW.width, 240);
  // A warm candle glow behind the boss.
  const glow = ctx.createRadialGradient(935, 470, 30, 935, 470, 330 + Math.sin(time * 1.7) * 8);
  glow.addColorStop(0, 'rgba(255,214,140,0.32)');
  glow.addColorStop(0.55, 'rgba(255,190,110,0.1)');
  glow.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(560, 140, 720, 660);
}

function drawMenu(ctx, view, mode) {
  const layout = titleLayout();
  const hover = view.hover;
  drawFeltPanel(ctx, MENU.x, MENU.y, MENU.w, MENU.h, 'rgba(43,31,51,0.93)', 'rgba(246,236,214,0.55)', 22);

  const needle = NEEDLES[view.needleIndex];
  const open = isUnlocked(needle, view.progress);
  const s = layout.start;
  const pulse = 1 + Math.sin(view.time * 4) * 0.025;
  ctx.save();
  ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
  ctx.scale(pulse, pulse);
  drawFeltPanel(ctx, -s.w / 2, -s.h / 2, s.w, s.h, hover === 'start' ? PALETTE.thread : open ? PALETTE.terracotta : PALETTE.steelDark, 'rgba(246,236,214,0.8)', 18);
  drawPlayTriangle(ctx, -s.w / 2 + 62, 0, 26);
  drawText(ctx, open ? 'NEW RUN' : 'LOCKED', 22, -4, { size: 56, color: PALETTE.cream, outline: 7, font: FONT.plain });
  drawText(ctx, open ? 'ENTER' : needle.unlock.text, 22, 36, { size: 17, color: PALETTE.cream, outline: 3, font: FONT.plain });
  ctx.restore();

  drawPicker(ctx, layout.modePrev, layout.modeNext, hover, 'modePrev', 'modeNext', PALETTE.navy);
  drawText(ctx, mode.name.toUpperCase(), 336, 393, { size: 36, color: PALETTE.cream, outline: 6, font: FONT.plain });

  drawPicker(ctx, layout.needlePrev, layout.needleNext, hover, 'needlePrev', 'needleNext', PALETTE.teal);
  ctx.save();
  ctx.translate(206, 460);
  ctx.rotate(-0.35);
  ctx.scale(1.15, 1.15);
  ctx.globalAlpha = open ? 1 : 0.4;
  drawNeedleShape(ctx, needle.color);
  ctx.restore();
  ctx.globalAlpha = 1;
  drawText(ctx, needle.name.replace(' Needle', '').toUpperCase(), 372, 460, { size: 30, color: open ? PALETTE.cream : PALETTE.steel, outline: 6, font: FONT.plain });

  drawCoopToggle(ctx, layout.coop, view.coop, hover === 'coop', view.time);

  const { found, total } = codexCounts();
  const r = layout.sampler;
  drawFeltPanel(ctx, r.x, r.y, r.w, r.h, hover === 'sampler' ? PALETTE.thread : PALETTE.plum, 'rgba(246,236,214,0.6)', 14);
  drawText(ctx, `SAMPLER  ${found}/${total}`, r.x + r.w / 2 - 20, r.y + r.h / 2 + 1, { size: 26, color: PALETTE.cream, outline: 5, font: FONT.plain });
  drawText(ctx, 'C', r.x + r.w - 34, r.y + r.h / 2 + 1, { size: 20, color: PALETTE.gold, outline: 3, font: FONT.plain });
  drawText(ctx, '↑↓ mode   ←→ needle   2 co-op', MENU.x + MENU.w / 2, 666, { size: 22, color: PALETTE.paper, outline: 0, font: FONT.plain });
  drawText(ctx, mode.text, MENU.x + MENU.w / 2, 700, { size: 18, color: PALETTE.sky, outline: 0, weight: 'normal' });
}

/**
 * The Two Needles switch: a red and a blue thread twisted between two needles, ON or OFF. With
 * it on, a second player joins on the same keyboard (coop/two-needles.js).
 */
function drawCoopToggle(ctx, r, on, hover, time) {
  drawFeltPanel(ctx, r.x, r.y, r.w, r.h, on ? '#1f5f99' : hover ? PALETTE.thread : '#3a2c46', on ? PALETTE.gold : 'rgba(246,236,214,0.5)', 14);
  // Two threads braided across the left of the switch.
  const x0 = r.x + 18;
  const x1 = r.x + 128;
  const cy = r.y + r.h / 2;
  for (const [color, phase] of [[PALETTE.thread, 0], [PARTNER.thread, Math.PI]]) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 4) {
      const y = cy + Math.sin((x - x0) / 14 + phase + (on ? time * 3 : 0)) * 12;
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x1 + 4, cy - 12);
  ctx.rotate(-0.5);
  drawNeedleShape(ctx, PALETTE.steel);
  ctx.restore();
  ctx.save();
  ctx.translate(x1 + 4, cy + 12);
  ctx.rotate(0.5);
  drawNeedleShape(ctx, PARTNER.needle);
  ctx.restore();
  drawText(ctx, 'TWO NEEDLES', r.x + 300, cy - 11, { size: 30, color: PALETTE.cream, outline: 6, font: FONT.plain });
  drawText(ctx, on ? 'CO-OP ON  ·  P2: ARROWS + ENTER' : 'CO-OP OFF  ·  press 2', r.x + 300, cy + 20, { size: 16, color: on ? PALETTE.gold : PALETTE.paper, outline: 3, font: FONT.plain });
}

/** The final boss, lit, at the end of the road: what the goal line names. */
function drawBoss(ctx, time) {
  // A slow, wide wingbeat: she hovers rather than flutters.
  drawPortrait(ctx, 'matriarch', 935, 450, 4.6, time * 0.4 + 1.5);
  drawFeltPanel(ctx, 760, 588, 350, 50, PALETTE.plum, 'rgba(246,236,214,0.7)', 14);
  drawText(ctx, 'NIGHT 10 BOSS', 935, 614, { size: 26, color: PALETTE.cream, outline: 4, font: FONT.plain });
}

function drawBest(ctx, mode, best, coop) {
  drawFeltPanel(ctx, 1000, 250, 250, 104, coop ? '#dcebf7' : PALETTE.cream, 'rgba(42,29,26,0.45)', 16);
  drawText(ctx, `BEST ${mode.daily ? 'TODAY' : mode.name.toUpperCase()}${coop ? ' DUO' : ''}`, 1125, 278, { size: 18, color: PALETTE.terracotta, outline: 0, font: FONT.plain });
  drawText(ctx, formatNumber(best), 1125, 322, { size: best >= 100000 ? 40 : 46, color: PALETTE.ink, outline: 0, font: FONT.plain });
}

const CONTROLS = [
  ['WASD', 'move'],
  ['MOUSE', 'aim · fire'],
  ['SPACE', 'dash'],
  ['LOOP', 'cinch'],
];

/** With Two Needles on: each player's keys, player one in red thread and player two in blue. */
const COOP_CONTROLS = [
  ['WASD', 'P1 move'],
  ['MOUSE', 'P1 fire'],
  ['ARROWS', 'P2 move'],
  ['ENTER', 'P2 fire'],
];

/** The controls as four big key caps along the foot of the screen. */
function drawControls(ctx, coop) {
  (coop ? COOP_CONTROLS : CONTROLS).forEach(([key, what], i) => {
    const x = 56 + i * 300;
    const w = key.length > 4 ? 124 : 104;
    drawKeyCap(ctx, x, 742, w, key);
    drawText(ctx, what, x + w + 14, 762, { size: 26, color: PALETTE.cream, align: 'left', outline: 5, font: FONT.plain });
  });
}

function drawPicker(ctx, prev, next, hover, prevKey, nextKey, fill) {
  drawFeltPanel(ctx, prev.x, prev.y, next.x + next.w - prev.x, prev.h, fill, 'rgba(246,236,214,0.45)', 14);
  drawArrow(ctx, prev, -1, hover === prevKey);
  drawArrow(ctx, next, 1, hover === nextKey);
}

function drawPlayTriangle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x - r * 0.6, y - r);
  ctx.lineTo(x - r * 0.6, y + r);
  ctx.closePath();
  ctx.fillStyle = PALETTE.cream;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawArrow(ctx, rect, dir, hover) {
  drawFeltPanel(ctx, rect.x, rect.y, rect.w, rect.h, hover ? PALETTE.thread : PALETTE.mustard, 'rgba(246,236,214,0.6)', 10);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx + dir * 11, cy);
  ctx.lineTo(cx - dir * 9, cy - 13);
  ctx.lineTo(cx - dir * 9, cy + 13);
  ctx.closePath();
  ctx.fillStyle = PALETTE.cream;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawKeyCap(ctx, x, y, w, label) {
  const h = 42;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = PALETTE.navy;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(246,236,214,0.6)';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctx.setLineDash([]);
  drawText(ctx, label, x + w / 2, y + h / 2 + 1, { size: 22, color: PALETTE.cream, outline: 0, font: FONT.plain });
}
