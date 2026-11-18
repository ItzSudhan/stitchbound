// Light and dark. From night 3 the dark deepens with every night. Light comes from the needle's
// own glint, from lit candle patches and from loops as they cinch. In the dark you cannot see the
// pests; in the light they are exposed, and pins strike them a quarter harder.
import { distance } from '../core/geometry.js';
import { litCandles } from './patches.js';

export const CANDLE_RADIUS = 190;
const LIT_BONUS = 1.25;

/** How dark the night is: 0 on the first nights, up to 0.78 deep in the road. */
export function darknessFor(depth) {
  return depth < 3 ? 0 : Math.min(0.78, 0.13 * (depth - 2));
}

/** Every light on the board this frame: {x, y, r}. */
export function lightSources(run) {
  const lights = [{ x: run.player.x, y: run.player.y, r: 150 * run.mods.lightRadius }];
  if (run.partner) lights.push({ x: run.partner.x, y: run.partner.y, r: 150 * run.mods.lightRadius });
  for (const candle of litCandles(run.quilt)) lights.push({ x: candle.cx, y: candle.cy, r: CANDLE_RADIUS, candle: true });
  for (const cinch of run.cinches) lights.push({ x: cinch.centre.x, y: cinch.centre.y, r: 220 * (1 - cinch.age / cinch.life) + 60 });
  return lights;
}

export function isLit(run, x, y) {
  if (darknessFor(run.depth) === 0) return true;
  return lightSources(run).some((l) => distance(l.x, l.y, x, y) < l.r);
}

/** Pins hit harder on pests standing in the light (on dark nights). */
export function lightDamageBonus(run, enemy) {
  return darknessFor(run.depth) > 0 && isLit(run, enemy.x, enemy.y) ? LIT_BONUS : 1;
}
