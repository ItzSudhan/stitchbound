// The heads-up display during a night: spools of health and sequins, the night, its modifier and
// foes left, score, best and combo, the quilt's integrity and heirlooms, dash and thread meters,
// the boss's name and bar (large, plain letters), relics and notions owned, the night banner,
// synergy announcements and first-night tips.
import { FONT, PALETTE, ROAD_LENGTH, VIEW } from '../core/config.js';
import { easeOutBack } from '../core/geometry.js';
import { heirloomsKept, quiltIntegrity } from '../world/quilt.js';
import { foesRemaining } from '../world/nights.js';
import { modifierById } from '../world/modifiers.js';
import { comboMultiplier } from '../run/scoring.js';
import { notionById } from '../items/notions.js';
import { relicById } from '../items/relics.js';
import { drawNotionIcon, drawRelicIcon, drawSequin } from '../render/icons.js';
import { drawStarShape } from '../render/quilt-art.js';
import { drawFeltPanel, drawMeter, drawSpool, drawText, formatNumber } from './widgets.js';
import { PARTNER } from '../coop/two-needles.js';

export function drawHud(ctx, run, best, time) {
  drawHealthAndSequins(ctx, run);
  drawNight(ctx, run);
  drawScore(ctx, run, best);
  drawQuiltMeter(ctx, run, time);
  drawNeedleMeters(ctx, run);
  drawBossBar(ctx, run);
  drawKit(ctx, run);
  drawTip(ctx, run, time);
  drawBanner(ctx, run);
  drawAnnouncements(ctx, run);
}

function drawHealthAndSequins(ctx, run) {
  const max = run.mods.hp;
  const w = 64 + max * 34;
  drawFeltPanel(ctx, 14, 12, w, 66, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  for (let i = 0; i < max; i += 1) drawSpool(ctx, 44 + i * 34, 45, i < run.player.hp);
  if (run.player.hurt > 0) {
    ctx.fillStyle = `rgba(224,71,58,${run.player.hurt * 0.4})`;
    ctx.fillRect(14, 12, w, 66);
  }
  const pulse = 1 + (run.sequinPulse ?? 0) * 0.25;
  drawFeltPanel(ctx, 14, 86, 130, 44, PALETTE.cream, 'rgba(42,29,26,0.4)', 12);
  drawSequin(ctx, 40, 108, 11 * pulse);
  drawText(ctx, String(run.sequins), 60, 109, { size: 24, color: PALETTE.ink, align: 'left', outline: 0 });
}

function drawNight(ctx, run) {
  const cx = VIEW.width / 2;
  drawFeltPanel(ctx, cx - 170, 10, 340, 74, PALETTE.navy, 'rgba(246,236,214,0.6)', 14);
  const label = run.endless ? `NIGHT ${run.depth}` : `NIGHT ${run.depth} / ${ROAD_LENGTH}`;
  drawText(ctx, label, cx, 36, { size: 30, color: PALETTE.cream, outline: 5 });
  const left = foesRemaining(run);
  const total = Math.max(1, run.waveTotal);
  drawMeter(ctx, cx - 140, 58, 200, 14, 1 - left / total, PALETTE.gold);
  drawText(ctx, `${left} left`, cx + 104, 65, { size: 18, color: PALETTE.cream, outline: 4 });
  const modifier = modifierById(run.night?.modifier);
  if (modifier && !run.night.boss) {
    const fill = modifier.tone === 'good' ? PALETTE.teal : PALETTE.terracotta;
    drawFeltPanel(ctx, cx - 150, 90, 300, 34, fill, 'rgba(246,236,214,0.6)', 10);
    drawText(ctx, modifier.name.toUpperCase(), cx, 108, { size: 19, color: PALETTE.cream, outline: 4 });
  }
}

function drawScore(ctx, run, best) {
  const x = VIEW.width - 14;
  drawFeltPanel(ctx, x - 272, 12, 272, 66, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  drawText(ctx, formatNumber(run.score), x - 24, 40, { size: 34, color: PALETTE.ink, align: 'right', outline: 0 });
  drawText(ctx, `BEST ${formatNumber(Math.max(best, run.score))}`, x - 24, 66, { size: 16, color: PALETTE.terracotta, align: 'right', outline: 0 });
  const multiplier = comboMultiplier(run);
  if (multiplier > 1) {
    const r = 34;
    const bx = x - 300;
    const by = 46;
    ctx.fillStyle = PALETTE.thread;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(bx, by, r - 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (run.combo.timer / 2.2));
    ctx.stroke();
    drawText(ctx, `x${multiplier}`, bx, by + 1, { size: 28, color: PALETTE.cream, outline: 5 });
  }
}

function drawQuiltMeter(ctx, run, time) {
  const integrity = quiltIntegrity(run.quilt);
  const low = integrity < 0.35;
  const y = VIEW.height - 74;
  drawFeltPanel(ctx, 14, y, 440, 60, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  const pulse = low ? 0.5 + 0.5 * Math.sin(time * 10) : 1;
  drawText(ctx, 'QUILT', 34, y + 30, { size: 24, color: low ? PALETTE.danger : PALETTE.ink, align: 'left', outline: 0 });
  const color = integrity > 0.6 ? PALETTE.sage : integrity > 0.35 ? PALETTE.mustard : PALETTE.danger;
  ctx.globalAlpha = low ? 0.6 + 0.4 * pulse : 1;
  drawMeter(ctx, 116, y + 19, 148, 22, integrity, color);
  ctx.globalAlpha = 1;
  drawText(ctx, `${Math.round(integrity * 100)}%`, 344, y + 31, { size: 26, color: PALETTE.ink, align: 'right', outline: 0 });
  drawStarShape(ctx, 384, y + 30, 15, 6.3);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawText(ctx, String(heirloomsKept(run.quilt)), 406, y + 31, { size: 26, color: PALETTE.goldDeep, align: 'left', outline: 0 });
}

function drawNeedleMeters(ctx, run) {
  const x = VIEW.width - 344;
  const y = VIEW.height - 74;
  drawFeltPanel(ctx, x, y, 330, 60, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  const p = run.player;
  const dash = 1 - p.dashReady / run.mods.dashCooldown;
  drawText(ctx, 'DASH', x + 20, y + 30, { size: 20, color: PALETTE.ink, align: 'left', outline: 0 });
  drawMeter(ctx, x + 80, y + 21, 70, 18, dash, dash >= 1 ? PALETTE.teal : PALETTE.steelDark);
  drawText(ctx, 'THREAD', x + 166, y + 30, { size: 20, color: PALETTE.ink, align: 'left', outline: 0 });
  drawMeter(ctx, x + 254, y + 21, 60, 18, run.thread.length / run.mods.threadLength, PALETTE.thread);
  if (run.partner) drawPartnerMeters(ctx, run, x, y - 68);
}

/** Two Needles: player two's dash and blue thread, and how many bound loops the pair has closed. */
function drawPartnerMeters(ctx, run, x, y) {
  const q = run.partner;
  drawFeltPanel(ctx, x, y, 330, 60, '#dcebf7', 'rgba(31,95,153,0.6)', 14);
  const dash = 1 - q.dashReady / run.mods.dashCooldown;
  drawText(ctx, 'P2', x + 20, y + 30, { size: 20, color: PARTNER.thread, align: 'left', outline: 0 });
  drawMeter(ctx, x + 58, y + 21, 70, 18, dash, dash >= 1 ? PALETTE.teal : PALETTE.steelDark);
  drawText(ctx, `BOUND ${run.stats.boundLoops ?? 0}`, x + 144, y + 30, { size: 20, color: '#1f5f99', align: 'left', outline: 0 });
  drawMeter(ctx, x + 254, y + 21, 60, 18, run.partnerThread.length / run.mods.threadLength, PARTNER.thread);
}

/** The boss's name in large plain capitals on a dark ribbon, with its health bar, low in the middle. */
function drawBossBar(ctx, run) {
  const boss = run.enemies.find((e) => !e.dead && (e.kind === 'matriarch' || e.kind === 'wyrm'));
  if (!boss) return;
  const name = boss.kind === 'matriarch' ? 'MOTH MATRIARCH' : 'YARN WYRM';
  const w = 460;
  const x = VIEW.width / 2 - w / 2;
  const y = VIEW.height - 168;
  drawFeltPanel(ctx, x, y, w, 96, '#2b1f33', 'rgba(245,197,66,0.6)', 14);
  drawText(ctx, name, VIEW.width / 2, y + 32, { size: 40, color: PALETTE.gold, outline: 6, font: FONT.plain, weight: 'bold' });
  drawMeter(ctx, x + 22, y + 60, w - 44, 22, boss.hp / boss.maxHp, boss.kind === 'matriarch' ? PALETTE.plumLight : PALETTE.terracotta);
  if (boss.kind === 'matriarch') {
    for (const f of [1 / 3, 2 / 3]) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 22 + (w - 44) * f - 2, y + 58, 4, 26);
    }
  }
}

/** The run's kit along the bottom: relic rosettes, then notion badges with their levels. */
function drawKit(ctx, run) {
  const ids = Object.keys(run.owned);
  const count = run.relics.length + ids.length;
  if (count === 0) return;
  // Shrink the badges so the row always fits between the quilt and needle panels.
  const gap = 4;
  const size = Math.min(32, Math.floor(466 / count) - gap);
  const total = count * (size + gap) - gap;
  let x = 462 + (466 - total) / 2 + size / 2;
  const y = VIEW.height - 36;
  for (const id of run.relics) {
    drawRelicIcon(ctx, relicById(id), x, y - 4, size);
    x += size + gap;
  }
  for (const id of ids) {
    drawNotionIcon(ctx, notionById(id), x, y, size);
    const level = run.owned[id];
    if (level > 1) drawText(ctx, String(level), x + 12, y + 11, { size: 15, color: PALETTE.gold, outline: 4 });
    x += size + gap;
  }
}

/** Teaching tips on the first nights: shown until the player has done the thing they teach. */
function drawTip(ctx, run, time) {
  let tip = null;
  // Two Needles: the first nights teach the bound loop until the pair has closed one.
  if (run.partner && run.depth <= 2 && !run.stats.boundLoops && run.waveTime > 2.5) tip = 'Two Needles: cross your partner\'s thread twice to BIND a loop (double power)!';
  else if (run.depth === 1 && run.stats.loops === 0 && run.waveTime > 2.5) tip = 'Circle the moths: cross your own thread to close a loop!';
  else if (run.depth === 2 && run.waveTime < 6) tip = 'Loops also darn holes shut. Space to snip-dash.';
  else if (run.depth === 3 && run.waveTime < 6) tip = 'Moths crave gold-star heirlooms: each one kept pays at dawn.';
  if (!tip) return;
  const y = VIEW.height - 118 + Math.sin(time * 3) * 3;
  ctx.font = `bold 24px ${FONT.ui}`;
  const w = ctx.measureText(tip).width + 50;
  drawFeltPanel(ctx, VIEW.width / 2 - w / 2, y - 26, w, 52, PALETTE.gold, 'rgba(42,29,26,0.5)', 14);
  drawText(ctx, tip, VIEW.width / 2, y + 1, { size: 24, color: PALETTE.ink, outline: 0 });
}

/** The ribbon that announces each night (and its modifier), easing in and out. */
function drawBanner(ctx, run) {
  const banner = run.banner;
  if (!banner) return;
  const t = banner.age;
  const appear = Math.min(1, t / 0.45);
  const fade = t > 2.5 ? Math.max(0, 1 - (t - 2.5) / 0.5) : 1;
  const scale = easeOutBack(appear);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(VIEW.width / 2, 320);
  ctx.scale(scale, scale);
  const boss = Boolean(run.night?.boss);
  const elite = Boolean(run.night?.elite);
  drawFeltPanel(ctx, -360, -80, 720, banner.note ? 190 : 150, boss ? PALETTE.plum : elite ? PALETTE.danger : PALETTE.terracotta, 'rgba(246,236,214,0.75)', 20);
  drawText(ctx, banner.title.toUpperCase(), 0, -28, { size: 56, color: PALETTE.cream, font: FONT.display, outline: 7, stitch: PALETTE.gold });
  drawText(ctx, banner.subtitle, 0, 30, { size: 32, color: PALETTE.gold, outline: 5 });
  if (banner.note) drawText(ctx, banner.note, 0, 76, { size: 22, color: PALETTE.cream, outline: 4 });
  ctx.restore();
}

/** "SYNERGY: PINSTORM" ribbons when a combination forms. */
function drawAnnouncements(ctx, run) {
  run.announcements.forEach((note, i) => {
    const t = note.age;
    const alpha = t < 0.3 ? t / 0.3 : t > 2.6 ? Math.max(0, (3.2 - t) / 0.6) : 1;
    ctx.globalAlpha = alpha;
    const y = 200 + i * 86;
    drawFeltPanel(ctx, VIEW.width / 2 - 330, y, 660, 74, '#2b1f33', PALETTE.gold, 14);
    drawText(ctx, note.title, VIEW.width / 2, y + 26, { size: 30, color: PALETTE.gold, outline: 5, font: FONT.plain });
    drawText(ctx, note.text, VIEW.width / 2, y + 55, { size: 18, color: PALETTE.cream, outline: 3 });
    ctx.globalAlpha = 1;
  });
}

/** The aiming cursor: a thimble ring with a red cross-stitch, drawn where the mouse points. */
export function drawCursor(ctx, x, y, firing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, firing ? 11 : 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.cream;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.thread;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(5, 5);
  ctx.moveTo(5, -5);
  ctx.lineTo(-5, 5);
  ctx.stroke();
  ctx.restore();
}
