// The full in-game HUD: the night is played in a framed field in the middle, with felt side
// panels around it that say everything at a glance: how to win and lose, spools, quilt and
// sequins, tonight's goals, the needle's meters, the controls, the score, the boss's phase and
// attack, every pest on the board with its effect and count, the relics and notions held with
// their effects, the active synergies, and the combo. H hides the panels to give the field room.
import { FONT, PALETTE, ROAD_LENGTH } from '../core/config.js';
import { heirloomsKept, quiltIntegrity } from '../world/quilt.js';
import { foesRemaining } from '../world/nights.js';
import { modifierById } from '../world/modifiers.js';
import { goalStatus } from '../world/goals.js';
import { PATCH_KINDS } from '../world/patches.js';
import { comboMultiplier } from '../run/scoring.js';
import { notionById } from '../items/notions.js';
import { relicById } from '../items/relics.js';
import { synergyById } from '../items/synergies.js';
import { PEST_EFFECTS, PEST_NAMES } from '../meta/codex.js';
import { drawNotionIcon, drawRelicIcon, drawSequin } from '../render/icons.js';
import { drawPortrait } from '../render/portraits.js';
import { drawStarShape } from '../render/quilt-art.js';
import { drawFeltPanel, drawMeter, drawSpool, drawText, drawWrapped, formatNumber } from './widgets.js';

/** Where the night's field sits on screen when the panels are shown (62% scale). */
export const FIELD_VIEW = { x: 243, y: 58, w: 794, h: 496, s: 794 / 1280 };

const LEFT = 8;
const RIGHT = 1045;
const COL = 227;

function panel(ctx, x, y, w, h, title, fill = PALETTE.cream, titleColor = PALETTE.thread) {
  drawFeltPanel(ctx, x, y, w, h, fill, 'rgba(42,29,26,0.4)', 12);
  if (title) drawText(ctx, title, x + w / 2, y + 22, { size: 17, color: titleColor, outline: 0, font: FONT.plain });
}

const line = (ctx, text, x, y, opts = {}) => drawText(ctx, text, x, y, { size: 17, color: PALETTE.ink, align: 'left', outline: 0, ...opts });

export function drawFieldFrame(ctx) {
  const v = FIELD_VIEW;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(v.x - 2, v.y - 2, v.w + 4, v.h + 4);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(v.x - 6, v.y - 6, v.w + 12, v.h + 12);
  ctx.setLineDash([]);
}

export function drawHudPanels(ctx, run, best, time) {
  drawNightBar(ctx, run);
  drawWinLose(ctx, run);
  drawStatus(ctx, run);
  drawGoals(ctx, run);
  drawNeedleMeters(ctx, run);
  drawControls(ctx);
  drawScore(ctx, run, best);
  drawBossOrWeather(ctx, run);
  drawPestRoster(ctx, run, time);
  drawBuild(ctx, run);
  drawSynergiesAndCombo(ctx, run);
}

function drawNightBar(ctx, run) {
  drawFeltPanel(ctx, 243, 4, 794, 46, PALETTE.navy, 'rgba(246,236,214,0.6)', 12);
  const label = run.endless ? `NIGHT ${run.depth}` : `NIGHT ${run.depth} / ${ROAD_LENGTH}`;
  drawText(ctx, label, 262, 28, { size: 24, color: PALETTE.cream, align: 'left', outline: 4, font: FONT.plain });
  drawText(ctx, run.night?.name ?? '', 640, 28, { size: 22, color: PALETTE.gold, outline: 4 });
  const left = foesRemaining(run);
  drawText(ctx, `${left} pests left`, 1020, 28, { size: 19, color: PALETTE.cream, align: 'right', outline: 3 });
}

function drawWinLose(ctx, run) {
  panel(ctx, LEFT, 4, COL, 150, 'WIN AND LOSE');
  drawText(ctx, 'WIN', LEFT + 14, 52, { size: 17, color: PALETTE.teal, align: 'left', outline: 0, font: FONT.plain });
  const goal = run.endless ? 'Endless: sew as far as you can' : `Survive ${ROAD_LENGTH} nights, beat the Moth Matriarch`;
  drawWrapped(ctx, goal, LEFT + 66, 52, 150, 19, { size: 15, color: PALETTE.ink, align: 'left', outline: 0, weight: 'normal' });
  drawText(ctx, 'LOSE', LEFT + 14, 112, { size: 17, color: PALETTE.danger, align: 'left', outline: 0, font: FONT.plain });
  drawWrapped(ctx, 'Spools run out, or the quilt unravels', LEFT + 66, 112, 150, 19, { size: 15, color: PALETTE.ink, align: 'left', outline: 0, weight: 'normal' });
}

function drawStatus(ctx, run) {
  panel(ctx, LEFT, 160, COL, 156, 'SPOOLS AND QUILT');
  const max = run.mods.hp;
  const step = Math.min(30, 190 / max);
  for (let i = 0; i < max; i += 1) {
    ctx.save();
    ctx.translate(LEFT + 26 + i * step, 210);
    ctx.scale(0.85, 0.85);
    drawSpool(ctx, 0, 0, i < run.player.hp);
    ctx.restore();
  }
  const integrity = quiltIntegrity(run.quilt);
  line(ctx, 'QUILT', LEFT + 14, 250, { font: FONT.plain });
  drawMeter(ctx, LEFT + 78, 240, 90, 18, integrity, integrity > 0.6 ? PALETTE.sage : integrity > 0.35 ? PALETTE.mustard : PALETTE.danger);
  line(ctx, `${Math.round(integrity * 100)}%`, LEFT + 174, 250, { size: 18 });
  drawSequin(ctx, LEFT + 26, 288, 11);
  line(ctx, `${run.sequins}`, LEFT + 44, 289, { size: 20 });
  drawStarShape(ctx, LEFT + 132, 288, 12, 5);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, `${heirloomsKept(run.quilt)}/8`, LEFT + 150, 289, { size: 20, color: PALETTE.goldDeep });
}

function drawGoals(ctx, run) {
  panel(ctx, LEFT, 322, COL, 168, "TONIGHT'S GOALS");
  goalStatus(run).forEach((goal, i) => {
    const y = 366 + i * 42;
    ctx.fillStyle = goal.done ? PALETTE.teal : PALETTE.cream;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.fillRect(LEFT + 12, y - 9, 18, 18);
    ctx.strokeRect(LEFT + 12, y - 9, 18, 18);
    if (goal.done) drawText(ctx, '✓', LEFT + 21, y + 1, { size: 15, color: PALETTE.cream, outline: 0 });
    drawWrapped(ctx, goal.text, LEFT + 36, y - 2, 130, 17, { size: 15, color: PALETTE.ink, align: 'left', outline: 0 });
    line(ctx, `${goal.value}/${goal.target}`, LEFT + COL - 12, y, { size: 17, align: 'right', color: goal.done ? PALETTE.teal : PALETTE.terracotta, font: FONT.plain });
  });
}

function drawNeedleMeters(ctx, run) {
  panel(ctx, LEFT, 496, COL, 92, null);
  const p = run.player;
  const dash = 1 - p.dashReady / run.mods.dashCooldown;
  line(ctx, 'DASH', LEFT + 14, 524, { font: FONT.plain });
  drawMeter(ctx, LEFT + 92, 515, 120, 18, dash, dash >= 1 ? PALETTE.teal : PALETTE.steelDark);
  line(ctx, 'THREAD', LEFT + 14, 562, { font: FONT.plain });
  drawMeter(ctx, LEFT + 92, 553, 120, 18, run.thread.length / run.mods.threadLength, PALETTE.thread);
}

function drawControls(ctx) {
  panel(ctx, LEFT, 594, COL, 202, 'CONTROLS', PALETTE.navy, PALETTE.gold);
  const keys = [['WASD', 'move'], ['MOUSE', 'aim, hold to fire'], ['SPACE', 'snip-dash'], ['LOOP', 'cross your thread'], ['P / M', 'pause / mute'], ['H', 'hide panels']];
  keys.forEach(([key, what], i) => {
    const y = 636 + i * 26;
    drawText(ctx, key, LEFT + 14, y, { size: 16, color: PALETTE.gold, align: 'left', outline: 0, font: FONT.plain });
    drawText(ctx, what, LEFT + 92, y, { size: 16, color: PALETTE.cream, align: 'left', outline: 0 });
  });
}

function drawScore(ctx, run, best) {
  panel(ctx, RIGHT, 4, COL, 96, 'SCORE');
  drawText(ctx, formatNumber(run.score), RIGHT + COL / 2, 56, { size: 30, color: PALETTE.ink, outline: 0, font: FONT.plain });
  drawText(ctx, `BEST ${formatNumber(Math.max(best, run.score))}`, RIGHT + COL / 2, 84, { size: 16, color: PALETTE.terracotta, outline: 0 });
}

function drawBossOrWeather(ctx, run) {
  const boss = run.enemies.find((e) => !e.dead && (e.kind === 'matriarch' || e.kind === 'wyrm'));
  if (boss) {
    panel(ctx, RIGHT, 106, COL, 176, 'BOSS', '#2b1f33', PALETTE.gold);
    const name = boss.kind === 'matriarch' ? 'MOTH MATRIARCH' : 'YARN WYRM';
    drawText(ctx, name, RIGHT + COL / 2, 156, { size: 21, color: PALETTE.gold, outline: 3, font: FONT.plain });
    drawText(ctx, `PHASE ${boss.phase ?? 1}/${boss.phases ?? 1}`, RIGHT + COL / 2, 186, { size: 20, color: PALETTE.cream, outline: 3, font: FONT.plain });
    drawMeter(ctx, RIGHT + 14, 202, COL - 28, 18, boss.hp / boss.maxHp, boss.kind === 'matriarch' ? PALETTE.plumLight : PALETTE.terracotta);
    drawWrapped(ctx, boss.attack ?? '', RIGHT + COL / 2, 244, COL - 24, 19, { size: 16, color: PALETTE.threadLight, outline: 2 });
    return;
  }
  const mod = modifierById(run.night?.modifier);
  panel(ctx, RIGHT, 106, COL, 176, 'THE NIGHT', '#2b1f33', PALETTE.gold);
  drawText(ctx, mod ? mod.name.toUpperCase() : 'A QUIET NIGHT', RIGHT + COL / 2, 160, { size: 20, color: mod && mod.tone === 'good' ? '#9fe0c8' : PALETTE.gold, outline: 3, font: FONT.plain });
  drawWrapped(ctx, mod ? mod.text : 'No weather tonight', RIGHT + COL / 2, 196, COL - 24, 20, { size: 16, color: PALETTE.cream, outline: 2 });
  if (run.night?.elite) drawText(ctx, 'ELITE: gold-ringed pests', RIGHT + COL / 2, 256, { size: 16, color: PALETTE.danger, outline: 2 });
}

function drawPestRoster(ctx, run, time) {
  panel(ctx, RIGHT, 288, COL, 508, 'PESTS ON THE BOARD');
  const counts = new Map();
  for (const e of run.enemies) if (!e.dead && e.kind !== 'wyrmSegment') counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  for (const q of run.spawnQueue) counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  drawPatchList(ctx, run, 342 + Math.max(1, rows.length) * 64);
  if (rows.length === 0) line(ctx, 'The board is quiet.', RIGHT + 16, 340);
  rows.forEach(([kind, count], i) => {
    const y = 342 + i * 64;
    drawPortrait(ctx, kind, RIGHT + 34, y + 6, kind === 'matriarch' ? 0.75 : 0.95, time);
    drawText(ctx, `x${count}`, RIGHT + 34, y + 34, { size: 16, color: PALETTE.cream, outline: 4, font: FONT.plain });
    drawText(ctx, PEST_NAMES[kind], RIGHT + 66, y, { size: 17, color: PALETTE.ink, align: 'left', outline: 0, font: FONT.plain });
    drawText(ctx, PEST_EFFECTS[kind], RIGHT + 66, y + 22, { size: 14, color: PALETTE.terracotta, align: 'left', outline: 0 });
  });
}

/** The special patches on this night's board, with their counts and what they do. */
function drawPatchList(ctx, run, top) {
  const counts = {};
  for (const p of run.quilt.patches) if (p.kind && p.hp > 0) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
  const kinds = Object.keys(PATCH_KINDS).filter((k) => counts[k]);
  drawText(ctx, 'PATCHES HERE', RIGHT + COL / 2, top, { size: 17, color: PALETTE.thread, outline: 0, font: FONT.plain });
  if (kinds.length === 0) line(ctx, 'Plain cloth tonight', RIGHT + 16, top + 30, { size: 15, weight: 'normal' });
  kinds.forEach((kind, i) => {
    const info = PATCH_KINDS[kind];
    const y = top + 34 + i * 42;
    ctx.fillStyle = info.color;
    ctx.fillRect(RIGHT + 14, y - 12, 24, 24);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(RIGHT + 14, y - 12, 24, 24);
    drawText(ctx, `${info.name} x${counts[kind]}`, RIGHT + 46, y - 6, { size: 16, color: PALETTE.ink, align: 'left', outline: 0, font: FONT.plain });
    drawText(ctx, info.short, RIGHT + 46, y + 12, { size: 14, color: PALETTE.terracotta, align: 'left', outline: 0 });
  });
}

function drawBuild(ctx, run) {
  panel(ctx, 243, 560, 517, 236, null);
  drawText(ctx, `RELICS (${run.relics.length})`, 260, 582, { size: 17, color: PALETTE.thread, align: 'left', outline: 0, font: FONT.plain });
  const shown = run.relics.slice(0, 4);
  if (shown.length === 0) line(ctx, 'None yet: sewing boxes, elites and bosses give relics', 262, 612, { size: 15, weight: 'normal' });
  shown.forEach((id, i) => {
    const relic = relicById(id);
    const y = 612 + i * 30;
    drawRelicIcon(ctx, relic, 272, y - 2, 24);
    line(ctx, `${relic.name}:`, 292, y, { size: 16, font: FONT.plain });
    line(ctx, relic.text, 292 + ctx.measureText(`${relic.name}: `).width + 4, y, { size: 15, weight: 'normal' });
  });
  if (run.relics.length > 4) line(ctx, `+${run.relics.length - 4} more`, 740, 582, { size: 15, align: 'right', color: PALETTE.terracotta });
  const ids = Object.keys(run.owned);
  drawText(ctx, `NOTIONS (${ids.length})`, 260, 740, { size: 17, color: PALETTE.thread, align: 'left', outline: 0, font: FONT.plain });
  const size = Math.min(34, Math.floor(350 / Math.max(1, ids.length)) - 4);
  ids.forEach((id, i) => {
    const x = 396 + size / 2 + i * (size + 4);
    drawNotionIcon(ctx, notionById(id), x, 740, size);
    if (run.owned[id] > 1) drawText(ctx, String(run.owned[id]), x + size / 2 - 3, 752, { size: 14, color: PALETTE.gold, outline: 3 });
  });
  if (ids.length === 0) line(ctx, 'Clear a night to choose one', 380, 740, { size: 15, weight: 'normal' });
  if (ids.length > 0) {
    const top = notionById(ids[ids.length - 1]);
    line(ctx, `Latest: ${top.name}, ${top.text}`, 262, 772, { size: 14, weight: 'normal', color: PALETTE.terracotta });
  }
}

function drawSynergiesAndCombo(ctx, run) {
  panel(ctx, 768, 560, 269, 236, 'SYNERGIES', '#2b1f33', PALETTE.gold);
  const active = run.synergies.map((id) => synergyById(id));
  if (active.length === 0) drawWrapped(ctx, 'None yet: a gold ribbon on a card marks one', 902, 606, 240, 19, { size: 15, color: 'rgba(246,236,214,0.7)', outline: 0, weight: 'normal' });
  active.slice(0, 2).forEach((s, i) => {
    const y = 606 + i * 54;
    drawText(ctx, s.name, 902, y, { size: 18, color: PALETTE.gold, outline: 2, font: FONT.plain });
    drawWrapped(ctx, s.text, 902, y + 21, 248, 16, { size: 13, color: PALETTE.cream, outline: 0, weight: 'normal' });
  });
  if (active.length > 2) drawText(ctx, `+${active.length - 2} more`, 1022, 706, { size: 14, color: PALETTE.gold, align: 'right', outline: 0 });
  const combo = comboMultiplier(run);
  drawFeltPanel(ctx, 780, 718, 245, 66, combo > 1 ? PALETTE.thread : PALETTE.terracotta, 'rgba(246,236,214,0.6)', 10);
  drawText(ctx, `COMBO x${combo}`, 902, 740, { size: 22, color: PALETTE.cream, outline: 3, font: FONT.plain });
  drawText(ctx, `best chain x${run.combo.best}`, 902, 766, { size: 16, color: PALETTE.cream, outline: 2 });
}
