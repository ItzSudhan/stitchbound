// The quilt road between nights: a map of patches joined by stitched paths. The patches you can
// step to next pulse; the path you took is sewn in red thread. Pick with a click or keys 1-3.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { modifierById } from '../world/modifiers.js';
import { NODE_TYPES, roadLinks } from '../run/route-map.js';
import { relicById } from '../items/relics.js';
import { drawNeedleShape } from '../render/sprites.js';
import { drawNodeIcon, drawRelicIcon, drawSequin } from '../render/icons.js';
import { needleById } from '../meta/needles.js';
import { dimScreen, drawFeltPanel, drawSpool, drawText } from './widgets.js';

const NODE = 70;
const COLUMNS_SHOWN = 10;

function firstColumn(run) {
  return Math.max(0, Math.min(run.depth - 2, run.road.columns.length - COLUMNS_SHOWN));
}

/** Where each visible patch sits on screen. */
export function nodeRect(run, node) {
  const col = node.depth - 1 - firstColumn(run);
  const lanes = run.road.columns[node.depth - 1].length;
  const x = 132 + col * 113;
  const y = lanes === 1 ? 400 : 270 + node.lane * 130;
  return { x: x - NODE / 2, y: y - NODE / 2, w: NODE, h: NODE, cx: x, cy: y };
}

export function visibleNodes(run) {
  const start = firstColumn(run);
  return run.road.columns.slice(start, start + COLUMNS_SHOWN).flat();
}

/** view: { reachable, hover (node or null), time } */
export function drawRoad(ctx, run, view) {
  const { time, reachable, hover } = view;
  dimScreen(ctx, VIEW.width, VIEW.height, 0.45);
  drawText(ctx, 'STITCHBOUND', 150, 42, { size: 34, color: PALETTE.cream, font: FONT.display, outline: 6, stitch: PALETTE.thread });
  drawText(ctx, 'THE QUILT ROAD', VIEW.width / 2, 52, { size: 52, color: PALETTE.gold, font: FONT.plain, outline: 8 });
  drawText(ctx, `Seed ${run.seed}  ·  click a glowing patch, or press 1, 2, 3`, VIEW.width / 2, 100, { size: 20, color: PALETTE.cream, outline: 4 });
  drawKitStrip(ctx, run);

  drawFeltPanel(ctx, 50, 170, 1180, 470, 'rgba(239,224,192,0.94)', 'rgba(42,29,26,0.45)', 24);
  const shown = new Set(visibleNodes(run).map((n) => n.id));
  const taken = run.road.columns.flat().filter((n) => n.visited);
  ctx.lineCap = 'round';
  for (const [from, to] of roadLinks(run.road)) {
    if (!shown.has(from.id) || !shown.has(to.id)) continue;
    const a = nodeRect(run, from);
    const b = nodeRect(run, to);
    const sewn = from.visited && to.visited;
    const open = run.node && from.id === run.node.id && reachable.includes(to);
    ctx.strokeStyle = sewn ? PALETTE.thread : open ? PALETTE.goldDeep : 'rgba(42,29,26,0.35)';
    ctx.lineWidth = sewn ? 7 : open ? 5 : 3;
    ctx.setLineDash(sewn ? [] : [10, 8]);
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.bezierCurveTo(a.cx + 50, a.cy, b.cx - 50, b.cy, b.cx, b.cy);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const node of visibleNodes(run)) {
    const r = nodeRect(run, node);
    const canGo = reachable.includes(node);
    const pulse = canGo ? 1 + Math.sin(time * 5) * 0.06 : 1;
    const size = (hover === node ? 1.15 : 1) * pulse * (node.type === 'boss' ? 1.25 : 1) * NODE;
    ctx.globalAlpha = node.visited || canGo || node.depth > run.depth ? 1 : 0.45;
    if (canGo) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(r.cx - size / 2 - 9, r.cy - size / 2 - 9, size + 18, size + 18);
      ctx.setLineDash([]);
    }
    drawNodeIcon(ctx, node.type, r.cx, r.cy, size, time, node.depth);
    if (node.modifier) {
      const mod = modifierById(node.modifier);
      ctx.fillStyle = mod.tone === 'good' ? PALETTE.teal : PALETTE.danger;
      ctx.beginPath();
      ctx.arc(r.cx + size / 2 - 4, r.cy - size / 2 + 4, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (canGo) drawText(ctx, String(reachable.indexOf(node) + 1), r.cx, r.cy + size / 2 + 22, { size: 22, color: PALETTE.ink, outline: 0 });
  }
  for (let d = 0; d < COLUMNS_SHOWN; d += 1) {
    const depth = firstColumn(run) + d + 1;
    if (depth > run.road.columns.length) break;
    drawText(ctx, String(depth), 132 + d * 113, 196, { size: 18, color: PALETTE.terracotta, outline: 0 });
  }
  if (run.node) {
    const here = nodeRect(run, run.node);
    ctx.save();
    ctx.translate(here.cx, here.cy - 58 + Math.sin(time * 3) * 4);
    ctx.rotate(Math.PI / 2);
    ctx.scale(1.3, 1.3);
    drawNeedleShape(ctx, needleById(run.needleId).color);
    ctx.restore();
  }
  drawNodeInfo(ctx, hover ?? reachable[0]);
  drawLegend(ctx, time, taken.length);
}

function drawKitStrip(ctx, run) {
  drawFeltPanel(ctx, 940, 14, 326, 132, PALETTE.cream, 'rgba(42,29,26,0.4)', 14);
  const max = run.mods.hp;
  for (let i = 0; i < max; i += 1) drawSpool(ctx, 968 + i * 30, 44, i < run.player.hp);
  drawSequin(ctx, 968, 88, 12);
  drawText(ctx, String(run.sequins), 988, 89, { size: 24, color: PALETTE.ink, align: 'left', outline: 0 });
  run.relics.slice(0, 6).forEach((id, i) => drawRelicIcon(ctx, relicById(id), 1060 + i * 34, 86, 30));
  drawText(ctx, `${Object.values(run.owned).reduce((a, b) => a + b, 0)} notions  ·  ${run.synergies.length} synergies`, 1103, 128, { size: 16, color: PALETTE.terracotta, outline: 0 });
}

function drawNodeInfo(ctx, node) {
  if (!node) return;
  const type = NODE_TYPES[node.type];
  const mod = modifierById(node.modifier);
  drawFeltPanel(ctx, 230, 600, 820, 76, '#2b1f33', type.color, 16);
  drawText(ctx, `${type.name.toUpperCase()}: ${type.text}`, VIEW.width / 2, 626, { size: 24, color: PALETTE.cream, outline: 4 });
  drawText(ctx, mod ? `${mod.name}: ${mod.text}` : node.type === 'fight' ? 'A quiet night' : ' ', VIEW.width / 2, 656, { size: 19, color: mod && mod.tone === 'good' ? '#9fe0c8' : mod ? PALETTE.threadLight : PALETTE.paper, outline: 3 });
}

/** The key to the road: every kind of patch and what it gives. */
const LEGEND = [
  ['fight', 'Night', 'a notion'],
  ['elite', 'Elite', 'notion + relic'],
  ['treasure', 'Sewing Box', 'a relic'],
  ['rest', 'Tea & Rest', 'heal or darn'],
  ['merchant', 'Peddler', 'spend sequins'],
  ['event', 'Mystery', 'a risky choice'],
  ['boss', 'Boss', 'a relic; night 10 wins'],
];

function drawLegend(ctx, time) {
  LEGEND.forEach(([type, name, gives], i) => {
    const row = i < 4 ? 0 : 1;
    const col = row === 0 ? i : i - 4;
    const x = (row === 0 ? 40 : 190) + col * 305;
    const y = 708 + row * 50;
    drawNodeIcon(ctx, type, x + 20, y, 40, time);
    drawText(ctx, `${name}:`, x + 48, y, { size: 19, color: PALETTE.gold, align: 'left', outline: 4, font: FONT.plain });
    ctx.font = `bold 19px ${FONT.plain}`;
    drawText(ctx, gives, x + 56 + ctx.measureText(`${name}:`).width, y, { size: 19, color: PALETTE.cream, align: 'left', outline: 4 });
  });
}
