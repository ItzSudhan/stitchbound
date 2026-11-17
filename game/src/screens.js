// The screens around play: the title with how-to-play, the notion draft between nights, pause,
// and the results card that ends every run, win or lose, with its numbers and a restart.
import { FONT, PALETTE, VIEW, WAVE_COUNT } from './config.js';
import { easeOutBack } from './geometry.js';
import { drawUpgradeIcon } from './sprites.js';
import { drawFeltPanel, drawText, formatNumber, formatTime } from './ui.js';
import { upgradeById } from './upgrades.js';

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(36,22,15,${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawLogo(ctx, x, y, size, time) {
  const bob = Math.sin(time * 2) * 4;
  drawText(ctx, 'STITCHBOUND', x, y + bob, { size, color: PALETTE.cream, font: FONT.display, outline: size / 7, stitch: PALETTE.thread });
  // A needle threads through the title, its red thread looping under the letters.
  ctx.save();
  ctx.translate(x + size * 3.55, y - size * 0.35 + bob);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.moveTo(46, 0);
  ctx.quadraticCurveTo(0, -8, -40, -8);
  ctx.arc(-40, 0, 8, -Math.PI / 2, Math.PI / 2, true);
  ctx.quadraticCurveTo(0, 8, 46, 0);
  ctx.fillStyle = PALETTE.steel;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  const thread = () => {
    ctx.beginPath();
    ctx.moveTo(x + size * 3.2, y - size * 0.15 + bob);
    ctx.bezierCurveTo(x + size * 3.6, y + size * 0.9, x - size * 1.5, y + size * 1.1, x - size * 3.4, y + size * 0.55 + bob);
  };
  thread();
  ctx.stroke();
  thread();
  ctx.strokeStyle = PALETTE.thread;
  ctx.lineWidth = 5;
  ctx.stroke();
}

export function drawTitle(ctx, best, time) {
  dim(ctx, 0.35);
  drawLogo(ctx, VIEW.width / 2, 140, 112, time);
  drawText(ctx, 'Ten nights of moths. One needle. Mend the heirloom quilt.', VIEW.width / 2, 262, { size: 28, color: PALETTE.gold, outline: 6 });

  const px = 170;
  const py = 300;
  drawFeltPanel(ctx, px, py, 940, 330, PALETTE.cream, 'rgba(42,29,26,0.45)', 22);
  drawText(ctx, 'HOW TO PLAY', px + 235, py + 42, { size: 28, color: PALETTE.thread, outline: 0 });
  drawText(ctx, 'THE RULES', px + 700, py + 42, { size: 28, color: PALETTE.thread, outline: 0 });
  const controls = [
    ['WASD', 'move the needle'],
    ['MOUSE', 'aim'],
    ['CLICK', 'hold to fire pins'],
    ['SPACE', 'snip-dash (dodge)'],
    ['P / M', 'pause / mute'],
  ];
  controls.forEach(([key, what], i) => {
    const y = py + 92 + i * 46;
    drawKeyCap(ctx, px + 40, y - 18, key);
    drawText(ctx, what, px + 172, y, { size: 24, color: PALETTE.ink, align: 'left', outline: 0, weight: 'bold' });
  });
  const rules = [
    'Your needle trails red thread.',
    'Cross your own thread to close a',
    'loop: it CINCHES every pest inside',
    'and DARNS the holes shut.',
    'Moths eat the quilt. At 0% it unravels.',
    'Survive 10 nights. Beat the Matriarch.',
  ];
  rules.forEach((line, i) => {
    drawText(ctx, line, px + 480, py + 92 + i * 38, { size: 23, color: PALETTE.ink, align: 'left', outline: 0, weight: i === 2 || i === 3 ? 'bold' : 'normal' });
  });

  const pulse = 0.75 + 0.25 * Math.sin(time * 5);
  ctx.globalAlpha = pulse;
  drawText(ctx, 'CLICK or press ENTER to begin', VIEW.width / 2, 682, { size: 40, color: PALETTE.cream, outline: 8 });
  ctx.globalAlpha = 1;
  drawText(ctx, `BEST SCORE  ${formatNumber(best)}`, VIEW.width / 2, 742, { size: 26, color: PALETTE.gold, outline: 6 });
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

/** Where the three notion cards sit, for drawing and for mouse picks. */
export function draftCardRects() {
  const w = 330;
  const h = 400;
  const gap = 40;
  const x0 = VIEW.width / 2 - (w * 3 + gap * 2) / 2;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y: 250, w, h }));
}

export function drawDraft(ctx, run, choices, hover, age) {
  dim(ctx, 0.55);
  drawText(ctx, `NIGHT ${run.wave} SURVIVED`, VIEW.width / 2, 120, { size: 60, color: PALETTE.cream, font: FONT.display, outline: 9, stitch: PALETTE.gold });
  drawText(ctx, 'Choose a notion for your sewing box', VIEW.width / 2, 192, { size: 32, color: PALETTE.gold, outline: 6 });
  const rects = draftCardRects();
  choices.forEach((upgrade, i) => {
    const r = rects[i];
    const t = Math.min(1, Math.max(0, (age - i * 0.08) / 0.4));
    const s = easeOutBack(t);
    const lift = hover === i ? -14 : 0;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2 + lift);
    ctx.scale(s, s);
    ctx.translate(-r.w / 2, -r.h / 2);
    drawFeltPanel(ctx, 0, 0, r.w, r.h, hover === i ? '#fff6e2' : PALETTE.paper, upgrade.color, 18);
    drawUpgradeIcon(ctx, upgrade, r.w / 2, 100, 120);
    drawText(ctx, upgrade.name, r.w / 2, 205, { size: 32, color: PALETTE.ink, outline: 0 });
    wrapText(ctx, upgrade.text, r.w / 2, 255, r.w - 50, 34, { size: 25, color: PALETTE.ink, outline: 0, weight: 'normal' });
    const level = run.owned[upgrade.id] ?? 0;
    drawText(ctx, level > 0 ? `Level ${level} -> ${level + 1}` : 'New!', r.w / 2, 330, { size: 22, color: PALETTE.terracotta, outline: 0 });
    drawText(ctx, `[ ${i + 1} ]`, r.w / 2, 370, { size: 26, color: PALETTE.navy, outline: 0 });
    ctx.restore();
  });
  drawText(ctx, 'Press 1, 2 or 3, or click a card', VIEW.width / 2, 712, { size: 26, color: PALETTE.cream, outline: 6 });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, options) {
  ctx.font = `${options.weight ?? 'bold'} ${options.size}px ${FONT.ui}`;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => drawText(ctx, l, x, y + i * lineHeight, options));
}

export function drawPause(ctx, muted) {
  dim(ctx, 0.6);
  drawFeltPanel(ctx, VIEW.width / 2 - 300, 230, 600, 320, PALETTE.cream, PALETTE.thread, 22);
  drawText(ctx, 'PAUSED', VIEW.width / 2, 310, { size: 72, color: PALETTE.ink, font: FONT.display, outline: 0 });
  drawText(ctx, 'P or ESC  resume', VIEW.width / 2, 395, { size: 28, color: PALETTE.ink, outline: 0 });
  drawText(ctx, 'R  restart run', VIEW.width / 2, 440, { size: 28, color: PALETTE.ink, outline: 0 });
  drawText(ctx, `M  sound ${muted ? 'off' : 'on'}`, VIEW.width / 2, 485, { size: 28, color: PALETTE.ink, outline: 0 });
}

const HEADLINES = {
  win: ['THE QUILT IS SAVED!', 'The Moth Matriarch is stitched away. Dawn breaks.', PALETTE.gold],
  needle: ['YOUR NEEDLE SNAPPED', 'The pests overran the sewing box.', PALETTE.danger],
  quilt: ['THE QUILT UNRAVELLED', 'The moths ate too much of the heirloom.', PALETTE.danger],
};

/** The end-of-run card: headline, the run's numbers, notions taken, and how to sew again. */
export function drawResults(ctx, summary, time) {
  dim(ctx, 0.62);
  const [title, line, color] = HEADLINES[summary.outcome];
  drawText(ctx, title, VIEW.width / 2, 92, { size: 74, color, font: FONT.display, outline: 10, stitch: PALETTE.cream });
  drawText(ctx, line, VIEW.width / 2, 160, { size: 28, color: PALETTE.cream, outline: 6 });
  const px = 240;
  const py = 200;
  drawFeltPanel(ctx, px, py, 800, 430, PALETTE.cream, 'rgba(42,29,26,0.45)', 22);
  drawText(ctx, 'FINAL SCORE', VIEW.width / 2, py + 44, { size: 26, color: PALETTE.terracotta, outline: 0 });
  drawText(ctx, formatNumber(summary.score), VIEW.width / 2, py + 100, { size: 76, color: PALETTE.ink, font: FONT.display, outline: 0 });
  if (summary.newBest) {
    const wob = Math.sin(time * 6) * 0.06;
    ctx.save();
    ctx.translate(px + 680, py + 92);
    ctx.rotate(0.2 + wob);
    drawFeltPanel(ctx, -86, -28, 172, 56, PALETTE.thread, 'rgba(246,236,214,0.8)', 12);
    drawText(ctx, 'NEW BEST!', 0, 1, { size: 26, color: PALETTE.cream, outline: 4 });
    ctx.restore();
  }
  const stats = [
    ['Night reached', `${summary.wave} / ${WAVE_COUNT}`],
    ['Best score', formatNumber(summary.best)],
    ['Pests stitched', formatNumber(summary.kills)],
    ['Loops closed', formatNumber(summary.loops)],
    ['Biggest loop', `${summary.biggestLoop} caught`],
    ['Cloth darned', `${summary.mended.toFixed(1)} patches`],
    ['Top combo', `x${summary.combo}`],
    ['Time', formatTime(summary.time)],
  ];
  stats.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = px + 60 + col * 370;
    const y = py + 168 + row * 44;
    drawText(ctx, label, x, y, { size: 24, color: PALETTE.ink, align: 'left', outline: 0, weight: 'normal' });
    drawText(ctx, value, x + 320, y, { size: 26, color: PALETTE.navy, align: 'right', outline: 0 });
  });
  const ids = summary.owned;
  if (ids.length > 0) {
    const size = 38;
    let x = VIEW.width / 2 - (ids.length * (size + 8) - 8) / 2 + size / 2;
    for (const id of ids) {
      drawUpgradeIcon(ctx, upgradeById(id), x, py + 380, size);
      x += size + 8;
    }
  }
  const pulse = 0.75 + 0.25 * Math.sin(time * 5);
  ctx.globalAlpha = pulse;
  drawText(ctx, 'CLICK or press ENTER to sew again', VIEW.width / 2, 690, { size: 38, color: PALETTE.cream, outline: 8 });
  ctx.globalAlpha = 1;
  drawText(ctx, 'ESC  back to title', VIEW.width / 2, 744, { size: 22, color: PALETTE.gold, outline: 5 });
}
