// The needle's thread: a trail of points the needle lays down as it moves. When the needle crosses
// its own thread, the part between the crossing and the needle is a closed loop; the loop is cut
// free and cinched shut, crushing whatever it holds. This is the game's signature move.
import { distance, distanceToSegment, polygonArea, segmentIntersection } from './geometry.js';

const SAMPLE_SPACING = 9;
/** The newest few segments touch the needle and never count as a crossing. */
const SKIP_RECENT = 3;
const MIN_LOOP_AREA = 3200;

export function createThread(x, y) {
  return { points: [{ x, y }], length: 0, pulse: 0 };
}

/**
 * Lays thread up to (x, y). Returns the closed loop polygon when the new piece crosses older
 * thread (and the loop is big enough to matter), else null. The thread is trimmed from its tail
 * so it never grows longer than `maxLength`.
 */
export function extendThread(thread, x, y, maxLength) {
  const points = thread.points;
  const last = points[points.length - 1];
  const step = distance(last.x, last.y, x, y);
  if (step < SAMPLE_SPACING) return null;
  const next = { x, y };
  let loop = null;
  for (let i = 0; i < points.length - 1 - SKIP_RECENT; i += 1) {
    const hit = segmentIntersection(last, next, points[i], points[i + 1]);
    if (!hit) continue;
    const polygon = [hit, ...points.slice(i + 1)];
    if (polygonArea(polygon) >= MIN_LOOP_AREA) loop = polygon;
    break;
  }
  if (loop) {
    thread.points = [next];
    thread.length = 0;
    thread.pulse = 1;
    return loop;
  }
  points.push(next);
  thread.length += step;
  while (thread.length > maxLength && points.length > 2) {
    thread.length -= distance(points[0].x, points[0].y, points[1].x, points[1].y);
    points.shift();
  }
  return null;
}

/** Snips the thread so only the needle's end remains. */
export function cutThread(thread) {
  const last = thread.points[thread.points.length - 1];
  const cut = thread.points;
  thread.points = [last];
  thread.length = 0;
  return cut;
}

/** True when a circle at (x, y) of radius r touches the laid thread (ignoring the needle's own end). */
export function threadTouches(thread, x, y, r) {
  const points = thread.points;
  for (let i = 0; i < points.length - 1 - SKIP_RECENT; i += 1) {
    if (distanceToSegment(x, y, points[i], points[i + 1]) < r) return true;
  }
  return false;
}

export function updateThread(thread, dt) {
  if (thread.pulse > 0) thread.pulse = Math.max(0, thread.pulse - dt * 3);
}
