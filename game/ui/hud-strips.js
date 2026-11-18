// The in-game HUD as slim translucent strips over a full-screen field: how to win and lose and
// the score along the top, the road's progress, the boss's name, phase, health and attack in a
// banner, the needle's state, tonight's goals and the pests at the left, the build (synergies,
// relics, notions) at the right, and the controls and combo along the bottom. H hides them.
import { FONT, PALETTE, ROAD_LENGTH, VIEW } from '../core/config.js';
import { heirloomsKept, quiltIntegrity } from '../world/quilt.js';
import { modifierById } from '../world/modifiers.js';
import { goalStatus } from '../world/goals.js';
import { NODE_TYPES } from '../run/route-map.js';
import { comboMultiplier } from '../run/scoring.js';
import { notionById } from '../items/notions.js';
import { relicById } from '../items/relics.js';
import { synergyById } from '../items/synergies.js';
import { drawNotionIcon, drawSequin } from '../render/icons.js';
import { drawPortrait } from '../render/portraits.js';
import { drawStarShape } from '../render/quilt-art.js';
import { drawMeter, drawSpool, drawText, formatNumber, roundRect } from './widgets.js';

const GLASS = 'rgba(16,10,28,0.74)';

function strip(ctx, x, y, w, h) {
  ctx.fillStyle = GLASS;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,197,66,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 9);
  ctx.stroke();
  ctx.setLineDash([]);
}

const say = (ctx, text, x, y, opts = {}) => drawText(ctx, text, x, y, { size: 18, color: PALETTE.cream, align: 'left', outline: 3, ...opts });

export function drawHudStrips(ctx, run, best, time) {
  drawTopStrip(ctx, run, best);
  drawBossBanner(ctx, run);
  drawLeftStrip(ctx, run, time);
  drawRightStrip(ctx, run);
  drawBottomStrip(ctx, run);
}

function drawTopStrip(ctx, run, best) {
  strip(ctx, 4, 4, VIEW.width - 8, 64);
  say(ctx, 'WIN', 18, 24, { color: '#7df0a8', font: FONT.plain, size: 18 });
  say(ctx, run.endless ? 'Sew as far as you can' : `Beat the Moth Matriarch, night ${ROAD_LENGTH}`, 84, 24, { size: 18 });
  say(ctx, 'LOSE', 18, 50, { color: '#ff7a7a', font: FONT.plain, size: 18 });
  say(ctx, 'Spools run out or quilt unravels', 84, 50, { size: 18 });
  // The road so far: one pip per night, coloured by the patch taken.
  const nights = run.endless ? Math.max(10, run.depth + 2) : ROAD_LENGTH;
  const label = run.endless ? `NIGHT ${run.depth}` : `NIGHT ${run.depth} / ${ROAD_LENGTH}`;
  drawText(ctx, label, 640, 22, { size: 24, color: PALETTE.gold, outline: 4, font: FONT.plain });
  const taken = run.road.columns.flat().filter((n) => n.visited);
  for (let i = 0; i < Math.min(nights, 14); i += 1) {
    const x = 640 - (Math.min(nights, 14) - 1) * 13 + i * 26;
    const node = taken.find((n) => n.depth === i + 1);
    ctx.beginPath();
    ctx.arc(x, 50, i + 1 === run.depth ? 9 : 7, 0, Math.PI * 2);
    ctx.fillStyle = node ? NODE_TYPES[node.type].color : 'rgba(246,236,214,0.25)';
    ctx.fill();
    ctx.strokeStyle = i + 1 === run.depth ? '#ffffff' : PALETTE.ink;
    ctx.lineWidth = i + 1 === run.depth ? 3 : 2;
    ctx.stroke();
  }
  drawText(ctx, formatNumber(run.score), VIEW.width - 18, 26, { size: 30, color: '#ffffff', align: 'right', outline: 4, font: FONT.plain });
  drawText(ctx, `BEST ${formatNumber(Math.max(best, run.score))}`, VIEW.width - 18, 54, { size: 16, color: PALETTE.gold, align: 'right', outline: 3 });
}

function drawBossBanner(ctx, run) {
  const boss = run.enemies.find((e) => !e.dead && (e.kind === 'matriarch' || e.kind === 'wyrm'));
  if (!boss) {
    const mod = modifierById(run.night?.modifier);
    const text = run.night ? `${run.night.name}${mod ? `  ·  ${mod.name}: ${mod.text}` : ''}` : '';
    if (!text) return;
    ctx.font = `bold 20px ${FONT.ui}`;
    const w = ctx.measureText(text).width + 40;
    strip(ctx, 640 - w / 2, 74, w, 40);
    drawText(ctx, text, 640, 95, { size: 20, color: run.night.elite ? '#ff9a9a' : PALETTE.cream, outline: 3 });
    return;
  }
  const name = boss.kind === 'matriarch' ? 'MOTH MATRIARCH' : 'YARN WYRM';
  strip(ctx, 340, 74, 600, 92);
  drawText(ctx, name, 620, 102, { size: 34, color: PALETTE.gold, outline: 5, font: FONT.plain });
  ctx.fillStyle = PALETTE.danger;
  roundRect(ctx, 820, 86, 104, 32, 10);
  ctx.fill();
  drawText(ctx, `PHASE ${boss.phase ?? 1}/${boss.phases ?? 1}`, 872, 103, { size: 17, color: '#ffffff', outline: 2, font: FONT.plain });
  drawMeter(ctx, 360, 128, 300, 20, boss.hp / boss.maxHp, boss.kind === 'matriarch' ? PALETTE.plumLight : PALETTE.terracotta);
  say(ctx, boss.attack ?? '', 676, 139, { size: 17, color: '#ffb0b0' });
}

function drawLeftStrip(ctx, run, time) {
  const kinds = new Set([...run.enemies.filter((e) => !e.dead && e.kind !== 'wyrmSegment').map((e) => e.kind), ...run.spawnQueue.map((q) => q.kind)]);
  strip(ctx, 4, 76, 238, kinds.size > 4 ? 446 : 388);
  const max = run.mods.hp;
  const step = Math.min(28, 200 / max);
  for (let i = 0; i < max; i += 1) {
    ctx.save();
    ctx.translate(26 + i * step, 106);
    ctx.scale(0.85, 0.85);
    drawSpool(ctx, 0, 0, i < run.player.hp);
    ctx.restore();
  }
  const integrity = quiltIntegrity(run.quilt);
  say(ctx, 'QUILT', 16, 146, { font: FONT.plain, size: 17 });
  drawMeter(ctx, 82, 136, 92, 18, integrity, integrity > 0.6 ? PALETTE.sage : integrity > 0.35 ? PALETTE.mustard : PALETTE.danger);
  say(ctx, `${Math.round(integrity * 100)}%`, 182, 146, { size: 18 });
  drawSequin(ctx, 26, 180, 11);
  say(ctx, String(run.sequins), 44, 181, { size: 20, color: '#ffc6e6' });
  drawStarShape(ctx, 132, 180, 12, 5);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  say(ctx, `${heirloomsKept(run.quilt)}/8`, 150, 181, { size: 20, color: PALETTE.gold });
  say(ctx, "TONIGHT'S GOALS", 16, 218, { size: 16, color: PALETTE.gold, font: FONT.plain });
  goalStatus(run).forEach((goal, i) => {
    const y = 248 + i * 30;
    say(ctx, goal.done ? '✔' : '○', 16, y, { size: 18, color: goal.done ? '#7df0a8' : PALETTE.cream });
    say(ctx, goal.text.replace('Defeat the ', 'Beat '), 38, y, { size: 15 });
    drawText(ctx, `${goal.value}/${goal.target}`, 232, y, { size: 16, color: goal.done ? '#7df0a8' : PALETTE.gold, align: 'right', outline: 3, font: FONT.plain });
  });
  say(ctx, 'PESTS', 16, 352, { size: 16, color: PALETTE.gold, font: FONT.plain });
  const counts = new Map();
  for (const e of run.enemies) if (!e.dead && e.kind !== 'wyrmSegment') counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  for (const q of run.spawnQueue) counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
  [...counts.entries()].slice(0, 8).forEach(([kind, count], i) => {
    const x = 34 + (i % 4) * 54;
    const y = 396 + Math.floor(i / 4) * 58;
    drawPortrait(ctx, kind, x, y, kind === 'matriarch' ? 0.55 : 0.75, time);
    drawText(ctx, `x${count}`, x + 10, y + 24, { size: 15, color: '#ffffff', outline: 3, font: FONT.plain });
  });
}

function drawRightStrip(ctx, run) {
  strip(ctx, VIEW.width - 242, 76, 238, 336);
  const x = VIEW.width - 228;
  say(ctx, 'SYNERGIES', x, 100, { size: 16, color: PALETTE.gold, font: FONT.plain });
  const active = run.synergies.map((id) => synergyById(id).name);
  if (active.length === 0) say(ctx, 'none yet', x, 126, { size: 16, color: 'rgba(246,236,214,0.6)' });
  active.slice(0, 2).forEach((name, i) => say(ctx, name, x, 126 + i * 26, { size: 19, color: PALETTE.gold }));
  say(ctx, `RELICS (${run.relics.length})`, x, 196, { size: 16, color: PALETTE.gold, font: FONT.plain });
  run.relics.slice(0, 4).forEach((id, i) => say(ctx, relicById(id).name, x, 222 + i * 24, { size: 17 }));
  if (run.relics.length > 4) say(ctx, `+${run.relics.length - 4} more`, x + 140, 196, { size: 15, color: PALETTE.gold });
  if (run.relics.length === 0) say(ctx, 'none yet', x, 222, { size: 16, color: 'rgba(246,236,214,0.6)' });
  const ids = Object.keys(run.owned);
  const size = Math.min(30, Math.floor(214 / Math.max(1, ids.length)) - 3);
  ids.slice(0, 12).forEach((id, i) => drawNotionIcon(ctx, notionById(id), x + size / 2 + i * (size + 3), 384, size));
  say(ctx, `NOTIONS (${ids.length})`, x, 352, { size: 16, color: PALETTE.gold, font: FONT.plain });
}

function drawBottomStrip(ctx, run) {
  strip(ctx, 4, VIEW.height - 50, VIEW.width - 8, 46);
  const y = VIEW.height - 26;
  say(ctx, 'WASD move · MOUSE aim, hold to fire · SPACE dash · cross your thread to LOOP · P pause · H hide', 18, y, { size: 17 });
  const p = run.player;
  say(ctx, 'DASH', 880, y, { size: 15, color: PALETTE.gold, font: FONT.plain });
  drawMeter(ctx, 932, y - 8, 70, 16, 1 - p.dashReady / run.mods.dashCooldown, PALETTE.teal);
  const combo = comboMultiplier(run);
  ctx.fillStyle = combo > 1 ? PALETTE.thread : 'rgba(246,236,214,0.18)';
  roundRect(ctx, 1020, VIEW.height - 44, 252, 36, 10);
  ctx.fill();
  drawText(ctx, `COMBO x${combo}  ·  best x${run.combo.best}`, 1146, y, { size: 18, color: '#ffffff', outline: 3, font: FONT.plain });
}
