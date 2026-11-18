// Each night is fought on a fresh stretch of the heirloom quilt: a new board generated from the
// run's seed and the night's depth, with its own fabric theme, patterns, heirlooms and special
// patches (world/patches.js). The damage the run has taken so far carries over as holes, so the
// quilt's integrity is shared across the whole road.
import { createRandom, mixSeed } from '../core/random.js';
import { createQuilt } from './quilt.js';
import { patchKindCounts } from './patches.js';

export function generateBoard(seed, depth, carriedEaten = 0) {
  const boardSeed = mixSeed(seed, depth * 977 + 31);
  const quilt = createQuilt(boardSeed);
  const rng = createRandom(mixSeed(boardSeed, 5));
  const free = () => quilt.patches.filter((p) => !p.heirloom && !p.kind && p.col > 0 && p.col < 15 && p.row > 0 && p.row < 9);
  for (const [kind, count] of Object.entries(patchKindCounts(depth))) {
    for (let i = 0; i < count; i += 1) {
      const open = free().filter((p) => kind !== 'candle' || quilt.patches.every((q) => q.kind !== 'candle' || Math.abs(q.col - p.col) + Math.abs(q.row - p.row) > 3));
      const pool = open.length > 0 ? open : free();
      if (pool.length === 0) break;
      rng.pick(pool).kind = kind;
    }
  }
  for (const patch of quilt.patches) if (patch.kind === 'frayed') patch.hp = 0.8;
  // Old wounds: the cloth already lost on the road shows as holes on the new board.
  let left = carriedEaten;
  const plain = quilt.patches.filter((p) => !p.heirloom && !p.kind);
  while (left > 0.01 && plain.length > 0) {
    const patch = plain.splice(Math.floor(rng.next() * plain.length), 1)[0];
    const bite = Math.min(left, rng.range(0.3, 1));
    patch.hp -= bite;
    left -= bite;
  }
  const frayLoss = quilt.patches.filter((p) => p.kind === 'frayed').length * 0.2;
  quilt.eaten = carriedEaten + frayLoss;
  quilt.depth = depth;
  return quilt;
}
