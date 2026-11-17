// The pause card: resume, restart or toggle the sound.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { dimScreen, drawFeltPanel, drawText } from './widgets.js';

export function drawPause(ctx, muted) {
  dimScreen(ctx, VIEW.width, VIEW.height, 0.6);
  drawFeltPanel(ctx, VIEW.width / 2 - 300, 230, 600, 320, PALETTE.cream, PALETTE.thread, 22);
  drawText(ctx, 'PAUSED', VIEW.width / 2, 310, { size: 72, color: PALETTE.ink, font: FONT.display, outline: 0 });
  drawText(ctx, 'P or ESC  resume', VIEW.width / 2, 395, { size: 28, color: PALETTE.ink, outline: 0 });
  drawText(ctx, 'R  restart run', VIEW.width / 2, 440, { size: 28, color: PALETTE.ink, outline: 0 });
  drawText(ctx, `M  sound ${muted ? 'off' : 'on'}`, VIEW.width / 2, 485, { size: 28, color: PALETTE.ink, outline: 0 });
}
