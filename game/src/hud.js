// The heads-up display: spools of health, the night and foes left, score, best and combo, the
// quilt's integrity, the dash and thread meters, the boss bar, owned notions and the night banner.
import { PALETTE, WAVE_COUNT, VIEW } from './config.js';
import { easeOutBack } from './geometry.js';
import { heirloomsKept, quiltIntegrity } from './quilt.js';
import { comboMultiplier } from './scoring.js';
import { foesRemaining, WAVES } from './waves.js';
import { upgradeById } from './upgrades.js';
import { drawUpgradeIcon } from './sprites.js';
import { drawFeltPanel, drawMeter, drawSpool, drawText, formatNumber } from './ui.js';

export function drawHud(ctx, run, best, time) {
  drawHealth(ctx, run);
  drawNight(ctx, run);
  drawScore(ctx, run, best);
  drawQuiltMeter(ctx, run, time);
  drawNeedleMeters(ctx, run);
  drawBossBar(ctx, run);
  drawOwnedNotions(ctx, run);
  drawTip(ctx, run, time);
  drawBanner(ctx, run);
}

/** Teaching tips on the first nights: shown until the player has done the thing they teach. */
function drawTip(ctx, run, time) {
  let tip = null;
  if (run.wave === 1 && run.stats.loops === 0 && run.time > 2.5) tip = 'Circle the moths: cross your own thread to close a loop!';
  else if (run.wave === 2 && run.waveTime < 6) tip = 'Loops also darn holes shut. Space to snip-dash.';
  else if (run.wave === 3 && run.waveTime < 6) tip = 'Moths crave gold-star heirlooms: each one kept pays at dawn.';
  else if (run.wave === 6 && run.waveTime < 6) tip = 'Snippers cut your thread: pin them first!';
  if (!tip) return;
  const y = VIEW.height - 118 + Math.sin(time * 3) * 3;
  ctx.font = `bold 24px ${'"Trebuchet MS", sans-serif'}`;
  const w = ctx.measureText(tip).width + 50;
  drawFeltPanel(ctx, VIEW.width / 2 - w / 2, y - 26, w, 52, PALETTE.gold, 'rgba(42,29,26,0.5)', 14);
  drawText(ctx, tip, VIEW.width / 2, y + 1, { size: 24, color: PALETTE.ink, outline: 0 });
}

function drawHealth(ctx, run) {
  const max = run.mods.hp;
  const w = 64 + max * 34;
  drawFeltPanel(ctx, 14, 12, w, 66, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  for (let i = 0; i < max; i += 1) drawSpool(ctx, 44 + i * 34, 45, i < run.player.hp);
  if (run.player.hurt > 0) {
    ctx.fillStyle = `rgba(224,71,58,${run.player.hurt * 0.4})`;
    ctx.fillRect(14, 12, w, 66);
  }
}

function drawNight(ctx, run) {
  const cx = VIEW.width / 2;
  drawFeltPanel(ctx, cx - 170, 10, 340, 74, PALETTE.navy, 'rgba(246,236,214,0.6)', 14);
  drawText(ctx, `NIGHT ${run.wave} / ${WAVE_COUNT}`, cx, 36, { size: 30, color: PALETTE.cream, outline: 5 });
  const left = foesRemaining(run);
  const total = Math.max(1, run.waveTotal);
  drawMeter(ctx, cx - 140, 58, 200, 14, 1 - left / total, PALETTE.gold);
  drawText(ctx, `${left} left`, cx + 104, 65, { size: 18, color: PALETTE.cream, outline: 4 });
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
  drawStar(ctx, 384, y + 30, 15);
  drawText(ctx, String(heirloomsKept(run.quilt)), 406, y + 31, { size: 26, color: PALETTE.goldDeep, align: 'left', outline: 0 });
  const pulse = low ? 0.5 + 0.5 * Math.sin(time * 10) : 1;
  drawText(ctx, 'QUILT', 34, y + 30, { size: 24, color: low ? PALETTE.danger : PALETTE.ink, align: 'left', outline: 0 });
  const color = integrity > 0.6 ? PALETTE.sage : integrity > 0.35 ? PALETTE.mustard : PALETTE.danger;
  ctx.globalAlpha = low ? 0.6 + 0.4 * pulse : 1;
  drawMeter(ctx, 116, y + 19, 148, 22, integrity, color);
  ctx.globalAlpha = 1;
  drawText(ctx, `${Math.round(integrity * 100)}%`, 344, y + 31, { size: 26, color: PALETTE.ink, align: 'right', outline: 0 });
}

/** The gold heirloom star, as embroidered on the heirloom patches. */
function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
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
}

function drawBossBar(ctx, run) {
  const boss = run.enemies.find((e) => !e.dead && (e.kind === 'matriarch' || e.kind === 'wyrm'));
  if (!boss) return;
  const name = boss.kind === 'matriarch' ? 'THE MOTH MATRIARCH' : 'THE YARN WYRM';
  const w = 560;
  const x = VIEW.width / 2 - w / 2;
  const y = 98;
  drawText(ctx, name, VIEW.width / 2, y + 2, { size: 24, color: PALETTE.gold, outline: 6, font: 'Georgia, serif' });
  drawMeter(ctx, x, y + 18, w, 20, boss.hp / boss.maxHp, boss.kind === 'matriarch' ? PALETTE.plumLight : PALETTE.terracotta);
  if (boss.kind === 'matriarch') {
    for (const f of [1 / 3, 2 / 3]) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + w * f - 2, y + 16, 4, 24);
    }
  }
}

function drawOwnedNotions(ctx, run) {
  const ids = Object.keys(run.owned);
  if (ids.length === 0) return;
  const size = 34;
  const gap = 6;
  const total = ids.length * (size + gap) - gap;
  let x = VIEW.width / 2 - total / 2 + size / 2;
  const y = VIEW.height - 34;
  for (const id of ids) {
    drawUpgradeIcon(ctx, upgradeById(id), x, y, size);
    const level = run.owned[id];
    if (level > 1) drawText(ctx, String(level), x + 13, y + 12, { size: 15, color: PALETTE.gold, outline: 4 });
    x += size + gap;
  }
}

/** The ribbon that announces each night, easing in and out. */
function drawBanner(ctx, run) {
  const banner = run.banner;
  if (!banner) return;
  const t = banner.age;
  const appear = Math.min(1, t / 0.45);
  const fade = t > 2.1 ? Math.max(0, 1 - (t - 2.1) / 0.5) : 1;
  const scale = easeOutBack(appear);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(VIEW.width / 2, 300);
  ctx.scale(scale, scale);
  const boss = Boolean(WAVES[run.wave - 1].boss);
  drawFeltPanel(ctx, -330, -70, 660, 140, boss ? PALETTE.plum : PALETTE.terracotta, 'rgba(246,236,214,0.75)', 20);
  drawText(ctx, banner.title.toUpperCase(), 0, -20, { size: 56, color: PALETTE.cream, font: 'Georgia, serif', outline: 7, stitch: PALETTE.gold });
  drawText(ctx, banner.subtitle, 0, 38, { size: 30, color: PALETTE.gold, outline: 5 });
  ctx.restore();
}
