// A mystery patch: a story card with a big question-mark seal, its choices as felt buttons, and
// once chosen, what happened and a button to return to the road.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { drawNodeIcon } from '../render/icons.js';
import { dimScreen, drawButton, drawFeltPanel, drawText, drawWrapped } from './widgets.js';

export function eventLayout(event) {
  const options = event.options.map((_, i) => ({ x: 300, y: 430 + i * 96, w: 680, h: 80 }));
  return { options, onward: { x: 490, y: 600, w: 300, h: 68 } };
}

export function drawEvent(ctx, run, event, hover, time) {
  dimScreen(ctx, VIEW.width, VIEW.height, 0.6);
  drawFeltPanel(ctx, 220, 70, 840, 680, PALETTE.cream, 'rgba(42,29,26,0.45)', 24);
  drawNodeIcon(ctx, 'event', VIEW.width / 2, 150, 96, time);
  drawText(ctx, event.title.toUpperCase(), VIEW.width / 2, 250, { size: 44, color: PALETTE.navy, font: FONT.plain, outline: 0 });
  drawWrapped(ctx, event.text, VIEW.width / 2, 312, 700, 34, { size: 26, color: PALETTE.ink, outline: 0, weight: 'normal' });
  const layout = eventLayout(event);
  if (event.result) {
    drawFeltPanel(ctx, 300, 430, 680, 120, '#2b1f33', PALETTE.gold, 16);
    drawWrapped(ctx, event.result, VIEW.width / 2, 474, 620, 32, { size: 28, color: PALETTE.gold, outline: 3 });
    drawButton(ctx, layout.onward, 'ONWARD (Enter)', { hover: hover === 'onward' });
    return;
  }
  event.options.forEach((option, i) => {
    const r = layout.options[i];
    const blocked = option.can && !option.can(run);
    ctx.globalAlpha = blocked ? 0.45 : 1;
    drawFeltPanel(ctx, r.x, r.y, r.w, r.h, hover === i && !blocked ? PALETTE.thread : PALETTE.navy, 'rgba(246,236,214,0.6)', 14);
    drawText(ctx, `${i + 1}.  ${option.label}`, r.x + 30, r.y + 28, { size: 28, color: PALETTE.cream, align: 'left', outline: 4 });
    drawText(ctx, option.detail, r.x + 30, r.y + 58, { size: 20, color: PALETTE.gold, align: 'left', outline: 3 });
    ctx.globalAlpha = 1;
  });
}
