// The Two Needles pilot, for the attract mode, ?demo=1, the screenshots and the tests. It flies
// both needles as a practised pair would, with the pincer: the needles circle the target (the
// knot of pests, or the boss) the opposite way round from each other, the partner half a beat
// behind and weaving in and out across the leader's circle. Every half-turn the partner crosses
// the leader's thread on one side of the target and then on the other, and that second crossing
// closes a bound loop all the way round the target. Aim, fire and dodging follow the
// single-needle autopilot.
import { VIEW } from '../core/config.js';
import { clamp, distance } from '../core/geometry.js';

/** How far (in radians of the circle) the partner trails the leader. */
const LAG = 0.55;
/** The partner's path weaves this far in and out of the leader's circle. */
const BULGE = 36;
const SWEEP_SPEED = 255;

export function createPartnerPilot() {
  return { t: -0.4, side: Math.PI / 2, radius: 160, x: VIEW.width / 2, y: VIEW.height / 2, placed: false };
}

/** The target the pincer closes round: the boss when there is one, else the lead pilot's focus. */
function target(run, lead) {
  const boss = run.enemies.find((e) => (e.kind === 'matriarch' || e.kind === 'wyrm') && !e.dead && !e.entering && e.x > 60 && e.x < VIEW.width - 60 && e.y > 60 && e.y < VIEW.height - 60);
  // A boss sweeps the quilt faster than a needle can circle it: a wide circle that drifts slowly
  // after her keeps her inside most of the time.
  if (boss) return { x: boss.x, y: boss.y, radius: boss.r + 190, follow: 0.25 };
  return { x: lead.cx, y: lead.cy, radius: 150, follow: 1.5 };
}

/** Where each needle should be at pincer time t: the leader on the circle, the partner weaving. */
function pincerPoints(duet, t) {
  const u = t - LAG;
  const r1 = duet.radius;
  const r2 = duet.radius + BULGE * Math.sin(u);
  const a1 = duet.side + t;
  const a2 = duet.side - u;
  return [
    { x: duet.x + Math.cos(a1) * r1, y: duet.y + Math.sin(a1) * r1 },
    { x: duet.x + Math.cos(a2) * r2, y: duet.y + Math.sin(a2) * r2 },
  ];
}

/** A move toward (gx, gy) at full stick, with the autopilot's shy-away from shots and biters. */
function steerTo(run, needle, gx, gy) {
  const tx = clamp(gx, 30, VIEW.width - 30);
  const ty = clamp(gy, 30, VIEW.height - 30);
  let mx = tx - needle.x;
  let my = ty - needle.y;
  const len = Math.hypot(mx, my) || 1;
  const push = Math.min(1, len / 20);
  mx = (mx / len) * push;
  my = (my / len) * push;
  for (const s of run.shots) {
    const d = distance(s.x, s.y, needle.x, needle.y);
    if (d < 90 && d > 0) {
      const w = (90 - d) / 90;
      mx += ((needle.x - s.x) / d) * w * 1.6;
      my += ((needle.y - s.y) / d) * w * 1.6;
    }
  }
  for (const e of run.enemies) {
    if (e.dead || e.kind === 'moth' || e.passive || e.kind === 'matriarch') continue;
    const d = distance(e.x, e.y, needle.x, needle.y);
    const reach = e.r + 50;
    if (d < reach && d > 0) {
      const w = (reach - d) / reach;
      mx += ((needle.x - e.x) / d) * w * 2;
      my += ((needle.y - e.y) / d) * w * 2;
    }
  }
  return { moveX: mx, moveY: my };
}

/** Player two's aim: the nearest pest, as the single-needle autopilot aims. */
function nearestAim(run, needle) {
  let best = null;
  let nearest = Infinity;
  for (const e of run.enemies) {
    if (e.dead || e.buried) continue;
    const d = distance(needle.x, needle.y, e.x, e.y);
    if (d < nearest) {
      nearest = d;
      best = e;
    }
  }
  return best ? { aimX: best.x, aimY: best.y, fire: nearest < 900 } : { aimX: VIEW.width / 2, aimY: VIEW.height / 2, fire: false };
}

/**
 * Both needles' intents for this step. `leadIntent` is the single-needle autopilot's intent for
 * the first needle (its aim, fire and dash are kept) and `lead` is that pilot (its focus is used).
 */
export function duetIntents(run, duet, lead, leadIntent, dt) {
  const p = run.player;
  const q = run.partner;
  const goal = target(run, lead);
  if (!duet.placed) {
    duet.placed = true;
    duet.x = goal.x;
    duet.y = goal.y;
  }
  // The circle follows the target as it moves; the pincer turns at the needles' pace.
  duet.radius += (goal.radius - duet.radius) * Math.min(1, dt * 1.5);
  // The whole circle stays on the quilt, so neither needle is pinned against an edge.
  const gx = clamp(goal.x, duet.radius + 40, VIEW.width - duet.radius - 40);
  const gy = clamp(goal.y, duet.radius + 40, VIEW.height - duet.radius - 40);
  duet.x += (gx - duet.x) * Math.min(1, dt * goal.follow);
  duet.y += (gy - duet.y) * Math.min(1, dt * goal.follow);
  duet.t += (SWEEP_SPEED / duet.radius) * dt;
  const [a, b] = pincerPoints(duet, duet.t);
  const first = { ...leadIntent, ...steerTo(run, p, a.x, a.y) };
  const second = { ...steerTo(run, q, b.x, b.y), ...nearestAim(run, q), dash: run.shots.some((s) => distance(s.x, s.y, q.x, q.y) < 40) };
  return { first, second };
}
