// The quilt road: a seeded, branching map of patches between nights. Each column is one night of
// the journey; each patch on it is a fight, an elite night, a sewing box (relic), a tea-and-rest,
// the peddler, or a mystery. From a patch you may step to the patches beside it in the next
// column. The Yarn Wyrm holds every fifth column, the Moth Matriarch every tenth.
import { createRandom, mixSeed } from '../core/random.js';
import { rollModifier } from '../world/modifiers.js';

export const NODE_TYPES = {
  fight: { name: 'Night', text: 'Fight the pests; take a notion', color: '#94b283' },
  elite: { name: 'Elite Night', text: 'Harder pests; a notion and a relic', color: '#e0473a' },
  boss: { name: 'Boss', text: 'A great pest; a relic if you win', color: '#5e4170' },
  treasure: { name: 'Sewing Box', text: 'Choose one of three relics', color: '#f5c542' },
  rest: { name: 'Tea & Rest', text: 'Heal spools, darn cloth or embroider', color: '#2f8178' },
  merchant: { name: 'Peddler', text: 'Spend sequins on notions and relics', color: '#e3a83b' },
  event: { name: 'Mystery', text: 'A stranger on the quilt...', color: '#8cc2d4' },
};

const LANES = 3;

/** Builds columns up to `length` (more can be added later for Endless). */
export function generateRoad(seed, length) {
  const road = { seed, columns: [] };
  extendRoad(road, length);
  return road;
}

export function extendRoad(road, length) {
  while (road.columns.length < length) {
    const depth = road.columns.length + 1;
    road.columns.push(generateColumn(road.seed, depth));
  }
}

function generateColumn(seed, depth) {
  const rng = createRandom(mixSeed(seed, depth * 7177));
  if (depth === 1) return [makeNode(rng, depth, 1, 'fight')];
  if (depth % 5 === 0) return [makeNode(rng, depth, 1, 'boss')];
  const types = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    const weights = [
      ['fight', 38],
      ['elite', depth >= 3 ? 14 : 0],
      ['event', 16],
      ['merchant', depth >= 2 && !types.includes('merchant') ? 12 : 0],
      ['rest', depth >= 3 ? 11 : 0],
      ['treasure', !types.includes('treasure') ? 8 : 0],
    ];
    types.push(rng.weighted(weights));
  }
  // Every column holds a fight, and the column before a boss offers a rest.
  if (!types.includes('fight') && !types.includes('elite')) types[rng.int(0, LANES - 1)] = 'fight';
  if (depth % 5 === 4 && !types.includes('rest')) types[types.indexOf('fight') === 0 ? 2 : 0] = 'rest';
  return types.map((type, lane) => makeNode(rng, depth, lane, type));
}

function makeNode(rng, depth, lane, type) {
  return { id: `${depth}-${lane}`, depth, lane, type, modifier: rollModifier(rng, depth, type), visited: false };
}

/** The patches the player may step to next. */
export function reachableNodes(road, current) {
  const column = road.columns[current ? current.depth : 0];
  if (!column) return [];
  if (!current || column.length === 1) return column;
  const lane = road.columns[current.depth - 1].length === 1 ? null : current.lane;
  return column.filter((node) => lane === null || Math.abs(node.lane - lane) <= 1);
}

/** Every road link, for drawing: [from, to] pairs. */
export function roadLinks(road) {
  const links = [];
  for (let d = 0; d < road.columns.length - 1; d += 1) {
    for (const from of road.columns[d]) {
      for (const to of road.columns[d + 1]) {
        if (road.columns[d].length === 1 || road.columns[d + 1].length === 1 || Math.abs(from.lane - to.lane) <= 1) links.push([from, to]);
      }
    }
  }
  return links;
}
