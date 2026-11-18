// The card that ends every run, win or lose: the headline, the final score, the run's numbers,
// its build (relics, notions and the synergies they formed), any needle it unlocked, and how to
// sew again.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { notionById } from '../items/notions.js';
import { relicById } from '../items/relics.js';
import { drawNotionIcon, drawRelicIcon } from '../render/icons.js';
import { dimScreen, drawFeltPanel, drawText, formatNumber, formatTime } from './widgets.js';

const HEADLINES = {
  win: ['THE QUILT IS SAVED!', 'The Moth Matriarch is stitched away. Dawn breaks.', PALETTE.gold],
  needle: ['YOUR NEEDLE SNAPPED', 'The pests overran the sewing box.', PALETTE.danger],
  quilt: ['THE QUILT UNRAVELLED', 'The moths ate too much of the heirloom.', PALETTE.danger],
};

export function drawResults(ctx, summary, time) {
  dimScreen(ctx, VIEW.width, VIEW.height, 0.82);
  const [title, line, color] = HEADLINES[summary.outcome];
  drawText(ctx, title, VIEW.width / 2, 70, { size: 70, color, font: FONT.display, outline: 10, stitch: PALETTE.cream });
  drawText(ctx, `${line}   ${summary.mode} · ${summary.needle}`, VIEW.width / 2, 132, { size: 24, color: PALETTE.cream, outline: 5 });
  const px = 150;
  const py = 160;
  drawFeltPanel(ctx, px, py, 980, 500, PALETTE.cream, 'rgba(42,29,26,0.45)', 22);
  drawText(ctx, 'FINAL SCORE', px + 250, py + 44, { size: 26, color: PALETTE.terracotta, outline: 0 });
  drawText(ctx, formatNumber(summary.score), px + 250, py + 102, { size: 74, color: PALETTE.ink, font: FONT.display, outline: 0 });
  if (summary.newBest) {
    ctx.save();
    ctx.translate(px + 250, py + 158);
    ctx.rotate(-0.04 + Math.sin(time * 6) * 0.04);
    drawFeltPanel(ctx, -90, -24, 180, 48, PALETTE.thread, 'rgba(246,236,214,0.8)', 12);
    drawText(ctx, 'NEW BEST!', 0, 1, { size: 26, color: PALETTE.cream, outline: 4 });
    ctx.restore();
  }
  // Six big stat chips: few words, large numbers, readable even as a thumbnail.
  const chips = [
    ['NIGHT', summary.endless ? String(summary.night) : `${summary.night}/10`, PALETTE.navy],
    ['PESTS', formatNumber(summary.kills), PALETTE.plum],
    ['LOOPS', formatNumber(summary.loops), PALETTE.thread],
    ['HEIRLOOMS', `${summary.heirlooms}/8`, PALETTE.goldDeep],
    ['GOALS MET', String(summary.goals), PALETTE.teal],
    ['TIME', formatTime(summary.time), PALETTE.terracotta],
  ];
  chips.forEach(([label, value, color], i) => {
    const x = px + 500 + (i % 3) * 156;
    const y = py + 30 + Math.floor(i / 3) * 132;
    drawFeltPanel(ctx, x, y, 144, 116, color, 'rgba(246,236,214,0.6)', 12);
    drawText(ctx, value, x + 72, y + 52, { size: value.length > 4 ? 34 : 40, color: '#ffffff', outline: 5, font: FONT.plain });
    drawText(ctx, label, x + 72, y + 94, { size: 17, color: PALETTE.cream, outline: 3, font: FONT.plain });
  });
  drawText(ctx, 'SYNERGIES', px + 250, py + 214, { size: 24, color: PALETTE.terracotta, outline: 0, font: FONT.plain });
  const names = summary.synergies.length > 0 ? summary.synergies.slice(0, 3) : ['none this run'];
  names.forEach((name, i) => drawText(ctx, name, px + 250, py + 250 + i * 36, { size: 30, color: summary.synergies.length ? PALETTE.goldDeep : PALETTE.steelDark, outline: 0, font: FONT.plain }));
  drawText(ctx, `THE BUILD: ${summary.relics.length} relics, ${summary.owned.length} notions`, VIEW.width / 2, py + 372, { size: 22, color: PALETTE.terracotta, outline: 0, font: FONT.plain });
  const kit = [...summary.relics.map((id) => ['relic', id]), ...summary.owned.map((id) => ['notion', id])].slice(0, 16);
  const size = 50;
  let x = VIEW.width / 2 - (kit.length * (size + 6) - 6) / 2 + size / 2;
  for (const [kind, id] of kit) {
    if (kind === 'relic') drawRelicIcon(ctx, relicById(id), x, py + 428, size);
    else drawNotionIcon(ctx, notionById(id), x, py + 428, size);
    x += size + 6;
  }
  if (summary.unlocked.length > 0) {
    drawFeltPanel(ctx, px + 190, py + 462, 600, 44, '#2b1f33', PALETTE.gold, 12);
    drawText(ctx, `UNLOCKED: ${summary.unlocked.join(', ')}!`, VIEW.width / 2, py + 485, { size: 22, color: PALETTE.gold, outline: 3 });
  }
  const pulse = 0.85 + 0.15 * Math.sin(time * 5);
  ctx.globalAlpha = pulse;
  drawText(ctx, 'CLICK or press ENTER to sew again', VIEW.width / 2, 712, { size: 38, color: PALETTE.cream, outline: 8 });
  ctx.globalAlpha = 1;
  drawText(ctx, 'ESC  back to title', VIEW.width / 2, 764, { size: 22, color: PALETTE.gold, outline: 5 });
}
