// A small seeded random generator (mulberry32), so a seed replays the same run: the same quilt,
// the same road, the same nights, the same drafts.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (low, high) => low + (high - low) * next(),
    int: (low, high) => low + Math.floor(next() * (high - low + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    /** A weighted pick from [[item, weight], ...]. */
    weighted(entries) {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [item, w] of entries) {
        roll -= w;
        if (roll <= 0) return item;
      }
      return entries[entries.length - 1][0];
    },
  };
}

/** Mixes two numbers into a new seed, so each part of a run gets its own stream. */
export function mixSeed(a, b) {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
