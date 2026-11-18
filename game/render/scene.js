// Paints the play scene: the quilt, the night's shade, the laid thread and cinching loops,
// telegraphs, spare spools, every creature, pins and shots, the needle, then the particles and
// screen flash, all under the screen shake.
import { FONT, PALETTE, VIEW } from '../core/config.js';
import { TAU } from '../core/geometry.js';
import { drawQuilt } from './quilt-art.js';
import { drawCandles, drawFrayedPatches } from './patch-art.js';
import { drawDarkness } from './darkness.js';
import { PARTNER, nearestNeedle } from '../coop/two-needles.js';
import { drawLintBall } from '../entities/lint-ball.js';
import { drawBurrower } from '../entities/burrower.js';
import { drawCarpetBeetle } from '../entities/carpet-beetle.js';
import { cinchShape } from '../run/night.js';
import { buttonPositions } from '../entities/player.js';
import { spoolTimeLeft } from '../entities/pickups.js';
import { needleById } from '../meta/needles.js';
import { drawSpool, drawText } from '../ui/widgets.js';
import { drawFloaters, drawParticles, drawRings, drawScreenFlash, shakeOffset } from './effects.js';
import {
  drawBeetle,
  drawGuardButton,
  drawMatriarch,
  drawMoth,
  drawNeedle,
  drawPin,
  drawShot,
  drawSilverfish,
  drawSnipper,
  drawSpitter,
  drawYarnBall,
} from './sprites.js';

const DRAW_ORDER = { wyrmSegment: 0, moth: 1, silverfish: 2, snipper: 3, beetle: 4, spitter: 5, wyrm: 6, matriarch: 7 };

export function drawScene(ctx, run, time, { needle = true } = {}) {
  const shake = shakeOffset(run.fx);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawQuilt(ctx, run.quilt);
  drawNightShade(ctx, run);
  drawFrayedPatches(ctx, run.quilt, time);
  drawCinches(ctx, run);
  if (needle) drawThreads(ctx, run, time);
  drawTelegraphs(ctx, run);
  drawPickups(ctx, run, time);
  const enemies = [...run.enemies].sort((a, b) => (DRAW_ORDER[a.kind] ?? 3) - (DRAW_ORDER[b.kind] ?? 3) || (b.index ?? 0) - (a.index ?? 0));
  const isBoss = (e) => e.kind === 'matriarch' || e.kind === 'wyrm' || e.kind === 'wyrmSegment';
  for (const enemy of enemies) if (!isBoss(enemy)) drawEnemy(ctx, enemy, time);
  // Deep nights: the dark hides the small pests; candles, bosses and shots show through it.
  if (run.inNight) drawDarkness(ctx, run, time);
  drawCandles(ctx, run.quilt, time);
  for (const enemy of enemies) if (isBoss(enemy)) drawEnemy(ctx, enemy, time);
  for (const shot of run.shots) drawShot(ctx, shot);
  for (const pin of run.pins) drawPin(ctx, pin);
  if (needle && (!run.outcome || run.outcome === 'win' || run.outcome === 'quilt')) {
    for (const b of buttonPositions(run)) drawGuardButton(ctx, b.x, b.y);
    drawNeedle(ctx, run.player, time, needleById(run.needleId).color);
    if (run.partner) drawNeedle(ctx, run.partner, time, PARTNER.needle);
    if (run.partner && !run.outcome) {
      // Who is who: a small tag over each needle in its thread's colour.
      drawText(ctx, 'P1', run.player.x, run.player.y - 36, { size: 18, color: PALETTE.threadLight, outline: 4, font: FONT.plain });
      drawText(ctx, 'P2', run.partner.x, run.partner.y - 36, { size: 18, color: PARTNER.threadLight, outline: 4, font: FONT.plain });
    }
  }
  drawRings(ctx, run.fx);
  drawParticles(ctx, run.fx);
  drawFloaters(ctx, run.fx);
  ctx.restore();
  drawScreenFlash(ctx, run.fx, VIEW.width, VIEW.height);
}

/** Spare spools bob on the quilt inside a gold stitched ring, and blink before they vanish. */
function drawPickups(ctx, run, time) {
  for (const pickup of run.pickups) {
    if (spoolTimeLeft(pickup) < 2 && Math.floor(time * 10) % 2 === 0) continue;
    const bob = Math.sin(time * 4 + pickup.x) * 4;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(pickup.x + 4, pickup.y + 16, 16, 6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, 24 + Math.sin(time * 6) * 2, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(pickup.x, pickup.y + bob);
    ctx.scale(1.25, 1.25);
    drawSpool(ctx, 0, 0, true);
    ctx.restore();
  }
}

/** The night deepens as the road goes on: evening on night 1, deep indigo by the Matriarch. */
function drawNightShade(ctx, run) {
  const depth = Math.min(1, Math.max(0, run.depth - 1) / 9);
  if (depth <= 0) return;
  ctx.fillStyle = `rgba(28,20,64,${(0.2 * depth).toFixed(3)})`;
  ctx.fillRect(-40, -40, VIEW.width + 80, VIEW.height + 80);
}

function drawEnemy(ctx, enemy, time) {
  if (enemy.elite) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r * 1.6 + Math.sin(time * 6) * 2, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  switch (enemy.kind) {
    case 'lintBall':
      drawLintBall(ctx, enemy, time);
      break;
    case 'burrower':
      drawBurrower(ctx, enemy, time);
      break;
    case 'carpetBeetle':
      drawCarpetBeetle(ctx, enemy, time);
      break;
    case 'moth':
      drawMoth(ctx, enemy, time);
      break;
    case 'silverfish':
      drawSilverfish(ctx, enemy, time);
      break;
    case 'beetle':
      drawBeetle(ctx, enemy, time);
      break;
    case 'snipper':
      drawSnipper(ctx, enemy, time);
      break;
    case 'spitter':
      drawSpitter(ctx, enemy, time);
      break;
    case 'wyrm':
      drawYarnBall(ctx, enemy, time, true);
      break;
    case 'wyrmSegment':
      if (!enemy.head.dead) drawYarnBall(ctx, enemy, time, false);
      break;
    case 'matriarch':
      drawMatriarch(ctx, enemy, time);
      break;
    default:
      break;
  }
}

/** The red thread the needle lays (and, in a Two Needles run, the partner's blue one). */
function drawThreads(ctx, run, time) {
  drawThread(ctx, run, run.thread, run.player, PALETTE.thread, 'rgba(255,190,190,0.85)', time);
  if (run.partner) drawThread(ctx, run, run.partnerThread, run.partner, PARTNER.thread, PARTNER.threadLight, time);
}

/** One needle's thread, with a stitched highlight. */
function drawThread(ctx, run, thread, p, color, light, time) {
  const points = thread.points;
  if (points.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineTo(p.x - Math.cos(p.angle) * 20, p.y - Math.sin(p.angle) * 20);
  };
  path();
  ctx.strokeStyle = 'rgba(42,29,26,0.3)';
  ctx.lineWidth = 7;
  ctx.save();
  ctx.translate(3, 4);
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = light;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 7]);
  ctx.lineDashOffset = -time * 30;
  ctx.stroke();
  ctx.setLineDash([]);
  if (run.mods.barbed > 0) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    for (let i = 2; i < points.length - 1; i += 4) {
      const a = points[i];
      const b = points[i + 1];
      const n = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(a.x - Math.cos(n) * 6, a.y - Math.sin(n) * 6);
      ctx.lineTo(a.x + Math.cos(n) * 6, a.y + Math.sin(n) * 6);
      ctx.stroke();
    }
  }
  // The thread's loose tail: a little knot so the player can see where it ends.
  ctx.beginPath();
  ctx.arc(points[0].x, points[0].y, 5, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** A closing loop: a gold-filled shape pulled tight toward its centre. */
function drawCinches(ctx, run) {
  for (const cinch of run.cinches) {
    const shape = cinchShape(cinch);
    const t = cinch.age / cinch.life;
    ctx.beginPath();
    shape.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.closePath();
    ctx.fillStyle = `rgba(245,197,66,${0.45 * (1 - t)})`;
    ctx.fill();
    // A bound loop is pulled by both needles: a thick cord of red and blue twisted together.
    const cord = cinch.bound ? 1.6 : 1;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 10 * cord;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.thread;
    ctx.lineWidth = 6.5 * cord;
    ctx.stroke();
    if (cinch.bound) {
      ctx.strokeStyle = PARTNER.thread;
      ctx.setLineDash([16, 16]);
      ctx.stroke();
    }
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Warnings before an attack: a beetle's charge lane and a pincushion's firing fan. */
function drawTelegraphs(ctx, run) {
  for (const e of run.enemies) {
    if (e.kind === 'beetle' && e.state === 'windup') {
      ctx.strokeStyle = 'rgba(224,71,58,0.75)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.chargeAngle) * 280, e.y + Math.sin(e.chargeAngle) * 280);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (e.kind === 'spitter' && e.state === 'aim') {
      const target = nearestNeedle(run, e.x, e.y);
      const a = Math.atan2(target.y - e.y, target.x - e.x);
      ctx.fillStyle = 'rgba(224,71,58,0.16)';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, 240, a - 0.45, a + 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }
}
