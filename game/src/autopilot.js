// A simple needle pilot that plays by the same rules as a person: it circles the busiest knot of
// pests so its thread closes loops around them, aims pins at the nearest one, and snip-dashes
// away from shots about to land. It drives the title screen's attract mode, ?demo=1 and the
// staged screenshot scenes; it reads the run and returns an intent, nothing more.
import { VIEW } from './config.js';
import { clamp, distance } from './geometry.js';
import { UPGRADES } from './upgrades.js';

const ORBIT_RADIUS = 105;
const ORBIT_SPEED = 2.7;

export function createPilot() {
  return { angle: 0, cx: VIEW.width / 2, cy: VIEW.height / 2, spin: 1 };
}

/** Picks where to circle: the eating moths first (they cost cloth), else the pests' middle. */
function pickFocus(run) {
  const live = run.enemies.filter((e) => !e.dead && e.kind !== 'wyrmSegment' && e.x > 0 && e.y > 0 && e.x < VIEW.width && e.y < VIEW.height);
  if (live.length === 0) return null;
  const boss = live.find((e) => e.kind === 'matriarch' && !e.entering);
  if (boss) return { x: boss.x, y: boss.y, radius: boss.r + 100 };
  const eaters = live.filter((e) => e.state === 'eat');
  const pool = eaters.length > 0 ? eaters : live;
  const p = run.player;
  let best = pool[0];
  let bestScore = -Infinity;
  for (const e of pool) {
    const crowd = pool.filter((o) => distance(o.x, o.y, e.x, e.y) < 120).length;
    const score = crowd * 120 - distance(p.x, p.y, e.x, e.y) * 0.5;
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return { x: best.x, y: best.y, radius: ORBIT_RADIUS };
}

export function pilotIntent(run, pilot, dt) {
  const p = run.player;
  const focus = pickFocus(run);
  const tx = focus ? focus.x : VIEW.width / 2;
  const ty = focus ? focus.y : VIEW.height / 2;
  const radius = focus ? focus.radius : 160;
  pilot.cx += (tx - pilot.cx) * Math.min(1, dt * 1.6);
  pilot.cy += (ty - pilot.cy) * Math.min(1, dt * 1.6);
  pilot.angle += (ORBIT_SPEED * ORBIT_RADIUS * pilot.spin * dt) / radius;
  const gx = clamp(pilot.cx + Math.cos(pilot.angle) * radius, 30, VIEW.width - 30);
  const gy = clamp(pilot.cy + Math.sin(pilot.angle) * radius, 30, VIEW.height - 30);
  let mx = gx - p.x;
  let my = gy - p.y;
  const len = Math.hypot(mx, my) || 1;
  const push = Math.min(1, len / 24);
  mx = (mx / len) * push;
  my = (my / len) * push;

  // Shy away from incoming shots and from pests that bite on contact.
  let ax = 0;
  let ay = 0;
  for (const s of run.shots) {
    const d = distance(s.x, s.y, p.x, p.y);
    if (d < 110 && d > 0) {
      const w = (110 - d) / 110;
      ax += ((p.x - s.x) / d) * w * 2;
      ay += ((p.y - s.y) / d) * w * 2;
    }
  }
  for (const e of run.enemies) {
    if (e.dead || e.kind === 'moth' || e.passive) continue;
    const d = distance(e.x, e.y, p.x, p.y);
    const reach = e.r + 70;
    if (d < reach && d > 0) {
      const w = (reach - d) / reach;
      ax += ((p.x - e.x) / d) * w * 2.5;
      ay += ((p.y - e.y) / d) * w * 2.5;
    }
  }
  mx += ax;
  my += ay;

  let aimX = tx;
  let aimY = ty;
  let nearest = Infinity;
  for (const e of run.enemies) {
    if (e.dead) continue;
    const d = distance(p.x, p.y, e.x, e.y);
    if (d < nearest) {
      nearest = d;
      aimX = e.x;
      aimY = e.y;
    }
  }

  let dash = false;
  for (const s of run.shots) {
    if (distance(s.x, s.y, p.x, p.y) < 48) {
      dash = true;
      break;
    }
  }
  return { moveX: mx, moveY: my, aimX, aimY, fire: nearest < 900, dash };
}

const PILOT_TASTE = ['wax', 'spool', 'twin', 'quick', 'steel', 'mend', 'thimble', 'buttons', 'barbed', 'golden', 'swift', 'pierce', 'ricochet', 'snip'];

/** The pilot's notion pick: the first of the offered three in its order of taste. */
export function pilotPick(choices) {
  const ranked = [...choices].sort((a, b) => PILOT_TASTE.indexOf(a.id) - PILOT_TASTE.indexOf(b.id));
  return ranked[0] ?? UPGRADES[0];
}
