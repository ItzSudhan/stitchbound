// The Peddler's stall: a striped felt awning, the wares laid out with sequin price tags, a ribbon
// on any ware that would complete a synergy, and a button to move on.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { canBuy } from '../run/merchant.js';
import { drawNotionIcon, drawRelicIcon, drawSequin } from '../render/icons.js';
import { dimScreen, drawButton, drawFeltPanel, drawText, drawWrapped } from './widgets.js';

export function shopLayout(shop) {
  const items = shop.items.map((item, i) => {
    const row = i < 4 ? 0 : 1;
    const col = row === 0 ? i : i - 4;
    const perRow = row === 0 ? Math.min(4, shop.items.length) : shop.items.length - 4;
    const w = 260;
    const x0 = VIEW.width / 2 - (perRow * w + (perRow - 1) * 22) / 2;
    return { x: x0 + col * (w + 22), y: 200 + row * 236, w, h: 214 };
  });
  return { items, leave: { x: 990, y: 700, w: 250, h: 64 } };
}

function drawAwning(ctx) {
  const stripes = 16;
  const w = VIEW.width / stripes;
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.thread : PALETTE.cream;
    ctx.beginPath();
    ctx.moveTo(i * w, 0);
    ctx.lineTo(i * w + w, 0);
    ctx.lineTo(i * w + w, 64);
    ctx.arc(i * w + w / 2, 64, w / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

export function drawShop(ctx, run, shop, hover) {
  dimScreen(ctx, VIEW.width, VIEW.height, 0.6);
  drawAwning(ctx);
  drawText(ctx, 'THE PEDDLER', VIEW.width / 2, 130, { size: 60, color: PALETTE.gold, font: FONT.plain, outline: 9 });
  drawFeltPanel(ctx, 30, 104, 190, 58, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  drawSequin(ctx, 62, 133, 15);
  drawText(ctx, String(run.sequins), 88, 134, { size: 30, color: PALETTE.ink, align: 'left', outline: 0 });
  const layout = shopLayout(shop);
  shop.items.forEach((item, i) => {
    const r = layout.items[i];
    const lift = hover === i && !item.sold ? -8 : 0;
    const affordable = canBuy(run, item);
    ctx.globalAlpha = item.sold ? 0.45 : 1;
    drawFeltPanel(ctx, r.x, r.y + lift, r.w, r.h, hover === i ? '#fff6e2' : PALETTE.paper, item.color, 16);
    if (item.kind === 'relic') drawRelicIcon(ctx, item, r.x + 56, r.y + lift + 62, 70);
    else drawNotionIcon(ctx, { id: item.kind === 'darn' ? 'mend' : item.id, color: item.color }, r.x + 56, r.y + lift + 62, 70);
    drawWrapped(ctx, item.name, r.x + 170, r.y + lift + 48, 140, 26, { size: 22, color: PALETTE.ink, outline: 0 });
    drawWrapped(ctx, item.text, r.x + r.w / 2, r.y + lift + 124, r.w - 30, 22, { size: 18, color: PALETTE.ink, outline: 0, weight: 'normal' });
    drawFeltPanel(ctx, r.x + r.w / 2 - 60, r.y + lift + r.h - 48, 120, 38, affordable ? PALETTE.mustard : 'rgba(150,140,130,1)', 'rgba(42,29,26,0.4)', 10);
    drawSequin(ctx, r.x + r.w / 2 - 30, r.y + lift + r.h - 29, 10);
    drawText(ctx, String(item.price), r.x + r.w / 2 + 12, r.y + lift + r.h - 28, { size: 22, color: PALETTE.ink, outline: 0 });
    if (item.completes.length > 0 && !item.sold) {
      drawFeltPanel(ctx, r.x - 6, r.y + lift - 18, r.w + 12, 34, '#2b1f33', PALETTE.gold, 10);
      drawText(ctx, `COMPLETES ${item.completes[0].name.toUpperCase()}`, r.x + r.w / 2, r.y + lift - 1, { size: 15, color: PALETTE.gold, outline: 2, font: FONT.plain });
    }
    drawText(ctx, `[${i + 1}]`, r.x + r.w - 26, r.y + lift + 26, { size: 18, color: PALETTE.navy, outline: 0 });
    if (item.sold) {
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(-0.25);
      drawText(ctx, 'SOLD', 0, 0, { size: 52, color: PALETTE.danger, outline: 6, font: FONT.plain });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
  drawText(ctx, shop.message, 520, 732, { size: 24, color: PALETTE.cream, outline: 5 });
  drawButton(ctx, layout.leave, 'LEAVE (Enter)', { hover: hover === 'leave', size: 24 });
}
