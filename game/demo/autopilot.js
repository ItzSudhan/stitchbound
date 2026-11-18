// A simple needle pilot that plays by the same rules as a person. In a night it circles the
// busiest knot of pests so its thread closes loops, aims at the nearest one, dodges shots and
// fetches spare spools when hurt. Between nights it picks road patches, cards, wares and event
// choices by plain preferences. It drives the title's attract mode, ?demo=1 and the screenshots.
import { VIEW } from '../core/config.js';
import { clamp, distance } from '../core/geometry.js';
import { canBuy } from '../run/merchant.js';

const ORBIT_RADIUS = 105;
const ORBIT_SPEED = 2.7;
const TASTE = ['wax', 'spool', 'twin', 'quick', 'steel', 'mend', 'thimble', 'buttons', 'heart', 'barbed', 'golden', 'swift', 'pierce', 'ricochet', 'ripper', 'snip'];

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
  let focus = pickFocus(run);
  if (p.hp < run.mods.hp) {
    const spool = run.pickups.find((s) => distance(s.x, s.y, p.x, p.y) < 260);
    if (spool) focus = { x: spool.x, y: spool.y, radius: 4 };
  }
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
  for (const s of run.shots) {
    const d = distance(s.x, s.y, p.x, p.y);
    if (d < 110 && d > 0) {
      const w = (110 - d) / 110;
      mx += ((p.x - s.x) / d) * w * 2;
      my += ((p.y - s.y) / d) * w * 2;
    }
  }
  for (const e of run.enemies) {
    if (e.dead || e.kind === 'moth' || e.passive) continue;
    const d = distance(e.x, e.y, p.x, p.y);
    const reach = e.r + 70;
    if (d < reach && d > 0) {
      const w = (reach - d) / reach;
      mx += ((p.x - e.x) / d) * w * 2.5;
      my += ((p.y - e.y) / d) * w * 2.5;
    }
  }

  let aimX = tx;
  let aimY = ty;
  let nearest = Infinity;
  for (const e of run.enemies) {
    if (e.dead || e.buried) continue;
    const d = distance(p.x, p.y, e.x, e.y);
    if (d < nearest) {
      nearest = d;
      aimX = e.x;
      aimY = e.y;
    }
  }
  const dash = run.shots.some((s) => distance(s.x, s.y, p.x, p.y) < 48);
  return { moveX: mx, moveY: my, aimX, aimY, fire: nearest < 900, dash };
}

/** Which card to take: one that completes a synergy, else relics first, else by taste. */
export function pilotChooseCard(run, offer) {
  const choices = offer.choices;
  const synergy = choices.findIndex((c) => c.completes && c.completes.length > 0);
  if (synergy >= 0) return synergy;
  if (offer.kind === 'rest') return run.player.hp < run.mods.hp - 1 ? 0 : 1;
  if (offer.kind === 'relic') return 0;
  let best = 0;
  for (let i = 1; i < choices.length; i += 1) if (TASTE.indexOf(choices[i].id) < TASTE.indexOf(choices[best].id)) best = i;
  return best;
}

/** Which road patch to step to: rest when hurt, the peddler when rich, else boxes and fights. */
export function pilotChooseNode(run, options) {
  const p = run.player;
  const want = (node) => {
    if (node.type === 'rest') return p.hp <= run.mods.hp - 2 ? 10 : 2;
    if (node.type === 'merchant') return run.sequins >= 60 ? 9 : 1;
    if (node.type === 'treasure') return 8;
    if (node.type === 'elite') return p.hp >= 4 ? 6 : 0;
    if (node.type === 'event') return 4;
    return 5;
  };
  return options.reduce((best, node) => (want(node) > want(best) ? node : best), options[0]);
}

/** The ware to buy next at the peddler, or -1 to leave. */
export function pilotChooseWare(run, shop) {
  const order = shop.items
    .map((item, i) => ({ item, i, score: (item.completes.length ? 50 : 0) + (item.kind === 'relic' ? 20 : 0) + (item.kind === 'notion' ? 15 : 0) + (item.kind === 'spool' && run.player.hp < run.mods.hp - 1 ? 30 : 0) }))
    .filter(({ item }) => canBuy(run, item))
    .sort((a, b) => b.score - a.score);
  return order.length > 0 ? order[0].i : -1;
}

/** The event option to take: the first one it can afford. */
export function pilotChooseOption(run, event) {
  const index = event.options.findIndex((o) => !o.can || o.can(run));
  return Math.max(0, index);
}
