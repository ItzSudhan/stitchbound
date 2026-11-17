// Badge icons drawn from felt shapes: round badges for notions, scalloped rosettes for relics,
// patch icons for the road map, and a sequin. Each badge carries a small glyph of its own.
import { PALETTE } from '../core/config.js';
import { TAU } from '../core/geometry.js';
import { drawButtonShape, drawMoth, drawMatriarch, drawYarnBall, inked } from './sprites.js';
import { drawStarShape } from './quilt-art.js';

const INK = PALETTE.ink;

/** A round notion badge with its glyph. */
export function drawNotionIcon(ctx, notion, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  inked(ctx, notion.color, 3);
  stitchRing(ctx, s - 6);
  ctx.scale(s / 40, s / 40);
  drawGlyph(ctx, notion.id);
  ctx.restore();
}

/** A scalloped relic rosette with ribbon tails and its glyph. */
export function drawRelicIcon(ctx, relic, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.thread;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.2, s * 0.5);
    ctx.lineTo(side * s * 0.55, s * 1.15);
    ctx.lineTo(side * s * 0.3, s * 1.05);
    ctx.lineTo(side * s * 0.05, s * 1.2);
    ctx.closePath();
    inked(ctx, side < 0 ? PALETTE.thread : PALETTE.navy, 2);
  }
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * TAU;
    const r = i % 2 === 0 ? s : s * 0.86;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  inked(ctx, PALETTE.gold, 3);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.74, 0, TAU);
  inked(ctx, relic.color, 2.5);
  ctx.scale(s / 52, s / 52);
  drawGlyph(ctx, relic.id);
  ctx.restore();
}

function stitchRing(ctx, r) {
  ctx.strokeStyle = 'rgba(255,248,230,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
}

function pinGlyph(ctx, px, py, rot, head = PALETTE.thread) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-18, 0, 8, 0, TAU);
  inked(ctx, head, 3);
  ctx.restore();
}

function thimbleGlyph(ctx, fill) {
  ctx.beginPath();
  ctx.moveTo(-16, 20);
  ctx.lineTo(-14, -8);
  ctx.quadraticCurveTo(0, -26, 14, -8);
  ctx.lineTo(16, 20);
  ctx.closePath();
  inked(ctx, fill, 3);
  ctx.fillStyle = INK;
  for (let i = 0; i < 6; i += 1) ctx.fillRect(-9 + (i % 3) * 8, -4 + Math.floor(i / 3) * 9, 3, 3);
}

/** The glyph for a notion, relic or road patch, in a 80x80 box around the origin. */
function drawGlyph(ctx, id) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  switch (id) {
    case 'spool':
      ctx.beginPath();
      ctx.rect(-12, -16, 24, 32);
      inked(ctx, PALETTE.thread, 3);
      ctx.beginPath();
      ctx.rect(-18, -22, 36, 7);
      ctx.rect(-18, 15, 36, 7);
      inked(ctx, '#c9a26b', 3);
      break;
    case 'steel':
      pinGlyph(ctx, 0, 0, -0.6, PALETTE.steelDark);
      break;
    case 'twin':
    case 'pinBox':
      if (id === 'pinBox') {
        ctx.beginPath();
        ctx.rect(-22, 0, 44, 20);
        inked(ctx, '#c9a26b', 3);
      }
      pinGlyph(ctx, 0, -9, -0.5);
      pinGlyph(ctx, 0, 9, -0.5);
      break;
    case 'quick':
      pinGlyph(ctx, 6, 0, 0);
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-28, i * 10);
        ctx.lineTo(-16, i * 10);
        ctx.stroke();
      }
      break;
    case 'wax':
    case 'hoop':
      ctx.strokeStyle = id === 'wax' ? PALETTE.thread : '#a0703a';
      ctx.lineWidth = id === 'wax' ? 6 : 8;
      if (id === 'wax') ctx.setLineDash([9, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'mend':
    case 'darningEgg':
      if (id === 'darningEgg') {
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 24, 0, 0, TAU);
        inked(ctx, '#f1e3c8', 3);
      }
      ctx.lineWidth = 6;
      ctx.setLineDash([9, 6]);
      ctx.beginPath();
      ctx.moveTo(-16, -16);
      ctx.lineTo(16, 16);
      ctx.moveTo(16, -16);
      ctx.lineTo(-16, 16);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'thimble':
      thimbleGlyph(ctx, '#e6c46a');
      break;
    case 'ironThimble':
      thimbleGlyph(ctx, PALETTE.steel);
      break;
    case 'swift':
    case 'snip':
    case 'seamGauge':
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(-16, -5);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      inked(ctx, PALETTE.steel, 3);
      ctx.beginPath();
      ctx.moveTo(-30, -12);
      ctx.lineTo(-20, -12);
      ctx.moveTo(-32, 12);
      ctx.lineTo(-20, 12);
      ctx.stroke();
      break;
    case 'ricochet':
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-22, -18);
      ctx.lineTo(0, 16);
      ctx.lineTo(22, -18);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'pierce':
    case 'crookedPin':
      ctx.beginPath();
      ctx.arc(4, 0, 12, 0, TAU);
      inked(ctx, PALETTE.plumLight, 3);
      pinGlyph(ctx, 0, 0, id === 'crookedPin' ? -0.9 : 0, PALETTE.gold);
      break;
    case 'barbed':
      ctx.strokeStyle = PALETTE.thread;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i <= 6; i += 1) ctx.lineTo(-24 + i * 8, i % 2 === 0 ? -10 : 10);
      ctx.stroke();
      break;
    case 'buttons':
    case 'luckyButton':
      drawButtonShape(ctx, 0, 0, 20, id === 'luckyButton' ? PALETTE.gold : PALETTE.cream, '#c9ada7');
      break;
    case 'ripper':
      ctx.beginPath();
      ctx.rect(-26, -6, 22, 12);
      inked(ctx, '#e3a83b', 3);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(12, 0);
      ctx.lineTo(24, -10);
      ctx.moveTo(12, 0);
      ctx.lineTo(24, 8);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(24, 8, 5, 0, TAU);
      inked(ctx, PALETTE.thread, 2);
      break;
    case 'heart':
    case 'locket':
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.bezierCurveTo(-30, 0, -18, -24, 0, -10);
      ctx.bezierCurveTo(18, -24, 30, 0, 0, 20);
      inked(ctx, id === 'locket' ? PALETTE.gold : PALETTE.thread, 3);
      if (id === 'heart') {
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i += 1) {
          const a = -Math.PI / 2 + (i - 2) * 0.6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8 - 2);
          ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26 - 2);
          ctx.stroke();
        }
      }
      break;
    case 'golden':
      drawStarShape(ctx, 0, 0, 24, 10);
      inked(ctx, PALETTE.gold, 3);
      break;
    case 'mothBalls':
      for (const [bx, by] of [[-10, 6], [10, 6], [0, -10]]) {
        ctx.beginPath();
        ctx.arc(bx, by, 11, 0, TAU);
        inked(ctx, '#ffffff', 3);
      }
      break;
    case 'needleCase':
      ctx.beginPath();
      ctx.rect(-14, -22, 28, 44);
      inked(ctx, '#cf6a43', 3);
      ctx.strokeStyle = PALETTE.steel;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 7, -16);
        ctx.lineTo(i * 7, 16);
        ctx.stroke();
      }
      break;
    case 'beeswax':
      ctx.beginPath();
      ctx.rect(-20, -14, 40, 28);
      inked(ctx, '#f5c542', 3);
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      break;
    case 'tapeMeasure':
      ctx.beginPath();
      ctx.arc(-4, 0, 18, 0, TAU);
      inked(ctx, '#e9c46a', 3);
      ctx.beginPath();
      ctx.rect(4, 8, 24, 10);
      inked(ctx, '#f6ecd6', 2);
      break;
    case 'teaTin':
    case 'tea':
      ctx.beginPath();
      ctx.rect(-18, -10, 30, 28);
      inked(ctx, id === 'tea' ? '#f6ecd6' : '#94b283', 3);
      ctx.beginPath();
      ctx.arc(14, 4, 8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(-8, -16);
      ctx.quadraticCurveTo(-2, -24, -8, -30);
      ctx.moveTo(2, -16);
      ctx.quadraticCurveTo(8, -24, 2, -30);
      ctx.stroke();
      break;
    case 'book':
      ctx.beginPath();
      ctx.rect(-22, -16, 44, 32);
      inked(ctx, '#cf6a43', 3);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();
      break;
    default:
      pinGlyph(ctx, 0, 0, -0.6);
  }
}

/** A road patch badge: its colour, and a picture of what waits there. */
export function drawNodeIcon(ctx, type, x, y, size, time, depth = 10) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(-s, -s, size, size);
  const colors = { fight: '#94b283', elite: '#e0473a', boss: '#5e4170', treasure: '#f5c542', rest: '#2f8178', merchant: '#e3a83b', event: '#8cc2d4' };
  inked(ctx, colors[type], 3);
  ctx.strokeStyle = 'rgba(255,248,230,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(-s + 5, -s + 5, size - 10, size - 10);
  ctx.setLineDash([]);
  const k = s / 40;
  ctx.scale(k, k);
  const critter = { x: 0, y: 0, r: 17, angle: -Math.PI / 2, seed: 1, state: 'move', flash: 0 };
  if (type === 'fight') drawMoth(ctx, critter, time);
  else if (type === 'elite') {
    drawMoth(ctx, { ...critter, r: 20 }, time);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-24, -24);
    ctx.lineTo(24, 24);
    ctx.moveTo(24, -24);
    ctx.lineTo(-24, 24);
    ctx.stroke();
  } else if (type === 'boss' && depth % 10 !== 0) {
    for (let i = 2; i >= 1; i -= 1) drawYarnBall(ctx, { ...critter, x: -i * 14, y: 8, r: 12, index: i }, time, false);
    drawYarnBall(ctx, { ...critter, x: 10, y: 4, r: 15, angle: 0 }, time, true);
  } else if (type === 'boss') drawMatriarch(ctx, { ...critter, r: 13, angle: 0 }, time);
  else if (type === 'treasure') {
    ctx.beginPath();
    ctx.rect(-22, -6, 44, 26);
    inked(ctx, '#a0703a', 3);
    ctx.beginPath();
    ctx.rect(-24, -18, 48, 14);
    inked(ctx, '#c98d17', 3);
    ctx.beginPath();
    ctx.arc(0, -4, 5, 0, TAU);
    inked(ctx, PALETTE.gold, 2);
  } else if (type === 'rest') drawGlyph(ctx, 'tea');
  else if (type === 'merchant') {
    drawSequin(ctx, -10, 6, 14);
    drawSequin(ctx, 10, 6, 14);
    drawSequin(ctx, 0, -10, 14);
  } else {
    ctx.font = `bold 52px ${'Georgia, serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = PALETTE.ink;
    ctx.strokeText('?', 0, 4);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillText('?', 0, 4);
  }
  ctx.restore();
}

/** A shiny sequin, the road's currency. */
export function drawSequin(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  inked(ctx, PALETTE.sequin, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.18, 0, TAU);
  ctx.fill();
}

/** The icon for any card a choice screen offers: a notion, a relic, or a rest. */
export function drawChoiceIcon(ctx, choice, x, y, size) {
  if (choice.kind === 'relic') drawRelicIcon(ctx, choice, x, y, size);
  else if (choice.kind === 'notion') drawNotionIcon(ctx, choice, x, y, size);
  else drawNotionIcon(ctx, { id: choice.icon, color: choice.color }, x, y, size);
}
