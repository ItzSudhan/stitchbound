// The Sampler screen: an embroidered sampler of everything discovered. Pests met show in colour,
// unmet ones as dark silhouettes; patch kinds, relics and synergies likewise, with a tally.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { TAU } from '../core/geometry.js';
import { CODEX_PESTS, PEST_NAMES, codexCounts, loadCodex } from '../meta/codex.js';
import { PATCH_KINDS } from '../world/patches.js';
import { RELICS } from '../items/relics.js';
import { SYNERGIES } from '../items/synergies.js';
import { drawBeetle, drawButtonShape, drawMatriarch, drawMoth, drawSilverfish, drawSnipper, drawSpitter, drawYarnBall } from '../render/sprites.js';
import { drawLintBall } from '../entities/lint-ball.js';
import { drawBurrower } from '../entities/burrower.js';
import { drawCarpetBeetle } from '../entities/carpet-beetle.js';
import { drawCandles, drawFrayedPatches } from '../render/patch-art.js';
import { drawRelicIcon } from '../render/icons.js';
import { dimScreen, drawButton, drawFeltPanel, drawText } from './widgets.js';

export const CODEX_BACK = { x: 1010, y: 724, w: 220, h: 56 };

const critter = (fields) => ({ x: 0, y: 0, angle: -Math.PI / 2, seed: 1, state: 'move', flash: 0, index: 1, ...fields });
const PORTRAITS = {
  moth: (ctx, t) => drawMoth(ctx, critter({ r: 19 }), t),
  silverfish: (ctx, t) => drawSilverfish(ctx, critter({ r: 15, angle: -0.5 }), t),
  beetle: (ctx, t) => drawBeetle(ctx, critter({ r: 20 }), t),
  snipper: (ctx, t) => drawSnipper(ctx, critter({ r: 16, angle: -0.6 }), t),
  spitter: (ctx, t) => drawSpitter(ctx, critter({ r: 19 }), t),
  lintBall: (ctx, t) => drawLintBall(ctx, critter({ r: 20, angle: 0 }), t),
  burrower: (ctx, t) => drawBurrower(ctx, critter({ r: 14, angle: -0.5, buried: false }), t),
  carpetBeetle: (ctx, t) => drawCarpetBeetle(ctx, critter({ r: 18 }), t),
  wyrm: (ctx, t) => {
    drawYarnBall(ctx, critter({ x: -14, r: 14, index: 2 }), t, false);
    drawYarnBall(ctx, critter({ x: 8, r: 17, angle: 0 }), t, true);
  },
  matriarch: (ctx, t) => drawMatriarch(ctx, critter({ r: 17, angle: 0 }), t),
};

function drawPatchTile(ctx, kind, x, y, time) {
  ctx.fillStyle = '#d9a5b3';
  ctx.fillRect(x - 40, y - 40, 80, 80);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 40, y - 40, 80, 80);
  if (kind === 'snag') {
    ctx.fillStyle = 'rgba(60,30,20,0.55)';
    ctx.fillRect(x - 40, y - 40, 80, 80);
    ctx.strokeStyle = '#e8b49a';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x - 20 + i * 10, y - 12 + (i % 2) * 22, 10, 6, i, 0, TAU);
      ctx.stroke();
    }
  } else if (kind === 'button') drawButtonShape(ctx, x, y, 26, PALETTE.navy, '#8fb0d6');
  else {
    const patch = { kind, hp: 1, x: x - 40, y: y - 40, cx: x, cy: y - 6, col: 0, row: 0 };
    if (kind === 'frayed') drawFrayedPatches(ctx, { patches: [patch] }, time);
    else drawCandles(ctx, { patches: [patch] }, time);
  }
}

/** Draws the item, or (unknown) its dark silhouette. */
function maybeSilhouette(ctx, known, draw) {
  ctx.save();
  if (!known) {
    ctx.filter = 'brightness(0)';
    ctx.globalAlpha = 0.35;
  }
  draw();
  ctx.restore();
}

export function drawCodex(ctx, time, hover) {
  const codex = loadCodex();
  const { found, total } = codexCounts();
  dimScreen(ctx, VIEW.width, VIEW.height, 0.7);
  drawText(ctx, 'THE SAMPLER', VIEW.width / 2, 50, { size: 52, color: PALETTE.gold, font: FONT.plain, outline: 8 });
  drawText(ctx, `${found} of ${total} discovered`, VIEW.width / 2, 92, { size: 22, color: PALETTE.cream, outline: 4 });

  drawFeltPanel(ctx, 40, 116, 640, 300, PALETTE.cream, 'rgba(42,29,26,0.45)', 18);
  drawText(ctx, 'PESTS', 360, 140, { size: 22, color: PALETTE.thread, outline: 0 });
  CODEX_PESTS.forEach((kind, i) => {
    const x = 104 + (i % 5) * 124;
    const y = 210 + Math.floor(i / 5) * 118;
    const known = codex.pests.includes(kind);
    maybeSilhouette(ctx, known, () => {
      ctx.translate(x, y);
      ctx.scale(1.35, 1.35);
      PORTRAITS[kind](ctx, time);
    });
    drawText(ctx, known ? PEST_NAMES[kind] : '???', x, y + 46, { size: 16, color: PALETTE.ink, outline: 0 });
  });

  drawFeltPanel(ctx, 700, 116, 540, 300, PALETTE.cream, 'rgba(42,29,26,0.45)', 18);
  drawText(ctx, 'PATCHES', 970, 140, { size: 22, color: PALETTE.thread, outline: 0 });
  Object.entries(PATCH_KINDS).forEach(([kind, info], i) => {
    const x = 790 + (i % 2) * 260;
    const y = 214 + Math.floor(i / 2) * 116;
    const known = codex.patches.includes(kind);
    maybeSilhouette(ctx, known, () => drawPatchTile(ctx, kind, x, y, time));
    drawText(ctx, known ? info.name : '???', x + 52, y - 14, { size: 18, color: PALETTE.ink, align: 'left', outline: 0 });
    if (known) drawText(ctx, `night ${info.from}+`, x + 52, y + 12, { size: 15, color: PALETTE.terracotta, align: 'left', outline: 0 });
  });

  drawFeltPanel(ctx, 40, 432, 640, 280, PALETTE.cream, 'rgba(42,29,26,0.45)', 18);
  drawText(ctx, 'RELICS', 360, 456, { size: 22, color: PALETTE.thread, outline: 0 });
  RELICS.forEach((relic, i) => {
    const x = 96 + (i % 7) * 88;
    const y = 520 + Math.floor(i / 7) * 110;
    const known = codex.relics.includes(relic.id);
    maybeSilhouette(ctx, known, () => drawRelicIcon(ctx, relic, x, y, 56));
    drawText(ctx, known ? relic.name.split(' ').pop() : '???', x, y + 44, { size: 14, color: PALETTE.ink, outline: 0 });
  });

  drawFeltPanel(ctx, 700, 432, 540, 280, '#2b1f33', PALETTE.gold, 18);
  drawText(ctx, 'SYNERGIES', 970, 456, { size: 22, color: PALETTE.gold, outline: 0 });
  SYNERGIES.forEach((synergy, i) => {
    const x = 735 + (i % 2) * 255;
    const y = 494 + Math.floor(i / 2) * 36;
    const known = codex.synergies.includes(synergy.id);
    drawText(ctx, known ? synergy.name : '? ? ?', x, y, { size: 19, color: known ? PALETTE.gold : 'rgba(246,236,214,0.4)', align: 'left', outline: 0 });
  });

  drawText(ctx, 'Every run adds what it meets. Esc or C to return.', 520, 752, { size: 20, color: PALETTE.cream, outline: 4 });
  drawButton(ctx, CODEX_BACK, 'BACK', { hover: hover === 'back', size: 24 });
}
