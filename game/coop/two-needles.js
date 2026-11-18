// Two Needles: local co-op. A second needle joins the run with its own blue thread. Both needles
// share the spools of health and the sewing box (notions, relics, sequins), and pests go after
// whichever needle is nearer. Each needle still closes loops with its own thread, and the two
// threads can close a loop together: when one needle crosses its partner's thread a second time,
// the stretch of each thread between the two crossings makes a BOUND LOOP. A bound loop is pulled
// by two hands, so it cinches twice as hard, darns twice as much and scores double.
import { VIEW } from '../core/config.js';
import { angleDelta, distance, polygonArea, segmentIntersection } from '../core/geometry.js';
import { createThread } from '../world/thread.js';

/** The partner's thread and needle colours. */
export const PARTNER = { thread: '#2f8fe0', threadLight: '#bfe3ff', needle: '#e0b040', name: 'Brass Needle' };

// How much harder a bound loop pulls than a single needle's loop is mods.boundPower: 2, or 3 with
// the Cat's Cradle relic (items/relics.js). Love Knot and Cradle Song add to it too.

const MIN_BOUND_AREA = 4200;
/** The partner's newest segments sit under its needle and never count as a crossing. */
const SKIP_PARTNER_RECENT = 2;

/** Gives the run its second needle, beside the first, with an empty thread. */
export function addPartner(run) {
  const p = run.player;
  run.partner = {
    x: Math.min(VIEW.width - 40, p.x + 120),
    y: p.y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    aim: -Math.PI / 2,
    invuln: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashReady: 0,
    dashX: 0,
    dashY: -1,
    hurt: 0,
    orbit: 0,
    recoil: 0,
    volleys: 0,
    ripped: new Set(),
    partner: true,
  };
  run.partnerThread = createThread(run.partner.x, run.partner.y);
  run.stats.boundLoops = 0;
}

/** Puts both needles back at the start of a night, side by side, threads empty. */
export function resetPartnerForNight(run) {
  if (!run.partner) return;
  const p = run.player;
  const q = run.partner;
  p.x = VIEW.width / 2 - 70;
  q.x = VIEW.width / 2 + 70;
  q.y = p.y;
  q.vx = 0;
  q.vy = 0;
  q.invuln = 0;
  q.dashReady = 0;
  run.partnerThread = createThread(q.x, q.y);
}

/** Every needle on the quilt: the first, then the partner when there is one. */
export function needlesOf(run) {
  return run.partner ? [run.player, run.partner] : [run.player];
}

/** The needle nearer to (x, y): the one a pest goes after. */
export function nearestNeedle(run, x, y) {
  const q = run.partner;
  if (!q) return run.player;
  const p = run.player;
  return distance(x, y, q.x, q.y) < distance(x, y, p.x, p.y) ? q : p;
}

/** Each needle's thread, paired with its needle. */
export function threadsOf(run) {
  const list = [{ needle: run.player, thread: run.thread }];
  if (run.partner) list.push({ needle: run.partner, thread: run.partnerThread });
  return list;
}

/**
 * Checks whether the newest piece of `mine` crosses `theirs` and, together with an earlier
 * crossing of the two threads, closes a bound loop. Returns the loop polygon or null.
 *
 * With X the new crossing (my newest segment over their segment j) and Y the most recent earlier
 * crossing (my segment i over their segment k), the loop runs Y -> along my thread -> X -> back
 * along their thread -> Y.
 */
export function findBoundLoop(mine, theirs) {
  const a = mine.points;
  const b = theirs.points;
  const bEnd = b.length - 1 - SKIP_PARTNER_RECENT;
  if (a.length < 3 || bEnd < 2) return null;
  const last = a[a.length - 2];
  const next = a[a.length - 1];
  let j = -1;
  let x = null;
  for (let s = 0; s < bEnd; s += 1) {
    const hit = segmentIntersection(last, next, b[s], b[s + 1]);
    if (hit) {
      j = s;
      x = hit;
      break;
    }
  }
  if (!x) return null;
  // The most recent earlier crossing along my thread, and of those the nearest along theirs.
  for (let i = a.length - 3; i >= 0; i -= 1) {
    let k = -1;
    let y = null;
    for (let s = 0; s < bEnd; s += 1) {
      if (s === j) continue;
      const hit = segmentIntersection(a[i], a[i + 1], b[s], b[s + 1]);
      if (hit && (k < 0 || Math.abs(s - j) < Math.abs(k - j))) {
        k = s;
        y = hit;
      }
    }
    if (!y) continue;
    const polygon = [y, ...a.slice(i + 1, a.length - 1), x];
    if (k < j) for (let s = j; s > k; s -= 1) polygon.push(b[s]);
    else for (let s = j + 1; s <= k; s += 1) polygon.push(b[s]);
    // A sliver (two crossings side by side) is not a loop; look further back along the thread.
    if (polygonArea(polygon) >= MIN_BOUND_AREA) return polygon;
  }
  return null;
}

/** After a bound loop both threads are spent: each is cut back to its needle. */
export function spendBothThreads(run) {
  for (const { thread } of threadsOf(run)) {
    const end = thread.points[thread.points.length - 1];
    thread.points = [end];
    thread.length = 0;
    thread.pulse = 1;
  }
}

/** The partner's aim when it has no mouse: the nearest pest within a wide cone ahead, else ahead. */
export function partnerAim(run, needle) {
  const facing = needle.angle;
  let best = null;
  let bestScore = Infinity;
  for (const e of run.enemies) {
    if (e.dead || e.buried || e.passive) continue;
    const d = distance(needle.x, needle.y, e.x, e.y);
    if (d > 620) continue;
    // How far off the needle's heading the pest is, in radians (0 = dead ahead).
    const off = Math.abs(angleDelta(facing, Math.atan2(e.y - needle.y, e.x - needle.x)));
    if (off > 1.1) continue;
    const score = d * (1 + off);
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (best) return { aimX: best.x, aimY: best.y };
  return { aimX: needle.x + Math.cos(facing) * 200, aimY: needle.y + Math.sin(facing) * 200 };
}
