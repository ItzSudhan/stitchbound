// A row of cards to choose one from: the notion draft after a night, a relic from a sewing box,
// elite or boss, or a comfort at Tea & Rest. A gold ribbon marks any card that would complete a
// named synergy.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { easeOutBack } from '../core/geometry.js';
import { drawChoiceIcon } from '../render/icons.js';
import { dimScreen, drawFeltPanel, drawText, drawWrapped } from './widgets.js';

export function cardRects(count) {
  const w = count >= 4 ? 280 : 330;
  const h = 420;
  const gap = count >= 4 ? 20 : 36;
  const x0 = VIEW.width / 2 - (w * count + gap * (count - 1)) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (w + gap), y: 236, w, h }));
}

export function drawCards(ctx, offer, hover, age) {
  dimScreen(ctx, VIEW.width, VIEW.height, 0.58);
  drawText(ctx, offer.title, VIEW.width / 2, 96, { size: 62, color: PALETTE.cream, font: FONT.plain, outline: 9 });
  drawText(ctx, offer.subtitle, VIEW.width / 2, 170, { size: 32, color: PALETTE.gold, outline: 6 });
  const rects = cardRects(offer.choices.length);
  offer.choices.forEach((choice, i) => {
    const r = rects[i];
    const t = Math.min(1, Math.max(0, (age - i * 0.08) / 0.4));
    const s = easeOutBack(t);
    const lift = hover === i ? -14 : 0;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2 + lift);
    ctx.scale(s, s);
    ctx.translate(-r.w / 2, -r.h / 2);
    const relic = choice.kind === 'relic';
    drawFeltPanel(ctx, 0, 0, r.w, r.h, hover === i ? '#fff6e2' : relic ? '#f3e2c4' : PALETTE.paper, choice.color, 18);
    drawChoiceIcon(ctx, choice, r.w / 2, 104, 124);
    drawText(ctx, choice.name, r.w / 2, 214, { size: r.w < 300 ? 28 : 32, color: PALETTE.ink, outline: 0 });
    drawWrapped(ctx, choice.text, r.w / 2, 262, r.w - 50, 32, { size: 23, color: PALETTE.ink, outline: 0, weight: 'normal' });
    const tag = choice.kind === 'notion' ? (choice.level > 0 ? `Level ${choice.level} -> ${choice.level + 1}` : 'New notion') : relic ? 'RELIC' : ' ';
    drawText(ctx, tag, r.w / 2, 340, { size: 21, color: PALETTE.terracotta, outline: 0 });
    drawText(ctx, `[ ${i + 1} ]`, r.w / 2, 382, { size: 26, color: PALETTE.navy, outline: 0 });
    if (choice.completes && choice.completes.length > 0) {
      drawFeltPanel(ctx, -10, -26, r.w + 20, 48, '#2b1f33', PALETTE.gold, 12);
      drawText(ctx, `COMPLETES ${choice.completes[0].toUpperCase()}`, r.w / 2, -1, { size: 20, color: PALETTE.gold, outline: 3, font: FONT.plain });
    }
    ctx.restore();
  });
  const keys = offer.choices.map((_, i) => i + 1).join(', ');
  drawText(ctx, `Press ${keys}, or click a card`, VIEW.width / 2, 712, { size: 26, color: PALETTE.cream, outline: 6 });
}
