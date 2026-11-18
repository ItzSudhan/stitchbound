// Paints the play scene: the quilt, the night's shade, the laid thread and cinching loops,
// telegraphs, spare spools, every creature, pins and shots, the needle, then the particles and
// screen flash, all under the screen shake.
import { PALETTE, VIEW } from '../core/config.js';
import { TAU } from '../core/geometry.js';
import { drawQuilt } from './quilt-art.js';
import { drawCandles, drawFrayedPatches } from './patch-art.js';
import { drawDarkness } from './darkness.js';
import { darknessFor } from '../world/lighting.js';
import { drawLintBall } from '../entities/lint-ball.js';
import { drawBurrower } from '../entities/burrower.js';
import { drawCarpetBeetle } from '../entities/carpet-beetle.js';
import { cinchShape } from '../run/night.js';
import { buttonPositions } from '../entities/player.js';
import { spoolTimeLeft } from '../entities/pickups.js';
import { needleById } from '../meta/needles.js';
import { drawSpool } from '../ui/widgets.js';
import { drawCallouts, drawFloaters, drawParticles, drawRings, drawScreenFlash, shakeOffset } from './effects.js';
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
  if (needle) drawThread(ctx, run, time);
  drawTelegraphs(ctx, run);
  drawPickups(ctx, run, time);
  const enemies = [...run.enemies].sort((a, b) => (DRAW_ORDER[a.kind] ?? 3) - (DRAW_ORDER[b.kind] ?? 3) || (b.index ?? 0) - (a.index ?? 0));
  const isBoss = (e) => e.kind === 'matriarch' || e.kind === 'wyrm' || e.kind === 'wyrmSegment';
  for (const enemy of enemies) if (!isBoss(enemy)) drawEnemy(ctx, enemy, time);
  // Deep nights: the dark hides the small pests; candles, bosses and shots show through it.
  if (run.inNight) drawDarkness(ctx, run, time);
  drawCandles(ctx, run.quilt, time);
  for (const enemy of enemies) if (enemy.kind === 'wyrmSegment') drawEnemy(ctx, enemy, time);
  for (const enemy of enemies) {
    if (!isBoss(enemy) || enemy.kind === 'wyrmSegment') continue;
    // A warm glow behind the boss so it reads at a glance, even on the darkest night.
    const r = enemy.r * (enemy.kind === 'matriarch' ? 3 : 2.4);
    const glow = ctx.createRadialGradient(enemy.x, enemy.y, enemy.r * 0.5, enemy.x, enemy.y, r);
    glow.addColorStop(0, 'rgba(255,200,90,0.55)');
    glow.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r, 0, TAU);
    ctx.fill();
    drawEnemy(ctx, enemy, time);
  }
  for (const shot of run.shots) drawShot(ctx, shot);
  for (const pin of run.pins) drawPin(ctx, pin);
  if (needle && (!run.outcome || run.outcome === 'win' || run.outcome === 'quilt')) {
    for (const b of buttonPositions(run)) drawGuardButton(ctx, b.x, b.y);
    ctx.shadowColor = 'rgba(255,255,255,0.95)';
    ctx.shadowBlur = 16;
    drawNeedle(ctx, run.player, time, needleById(run.needleId).color);
    ctx.shadowBlur = 0;
  }
  drawRings(ctx, run.fx);
  drawParticles(ctx, run.fx);
  drawFloaters(ctx, run.fx);
  drawCallouts(ctx, run.fx, VIEW.width);
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
  // On dark nights the darkness layer does this job, with light cut out of it.
  if (depth <= 0 || (run.inNight && darknessFor(run.depth) > 0)) return;
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

/** The red thread the needle lays, with a stitched highlight. */
function drawThread(ctx, run, time) {
  const points = run.thread.points;
  if (points.length < 2) return;
  const p = run.player;
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
  ctx.shadowColor = '#ff5a5a';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = PALETTE.thread;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,190,190,0.85)';
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
  ctx.fillStyle = PALETTE.thread;
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
    ctx.fillStyle = `rgba(255,214,90,${0.55 * (1 - t)})`;
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.shadowColor = '#ffd45a';
    ctx.shadowBlur = 26;
    ctx.strokeStyle = PALETTE.thread;
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
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
      const a = Math.atan2(run.player.y - e.y, run.player.x - e.x);
      ctx.fillStyle = 'rgba(224,71,58,0.16)';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.arc(e.x, e.y, 240, a - 0.45, a + 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }
}
