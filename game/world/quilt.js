// The heirloom quilt the whole game is played on: 160 patches that moths eat into holes and that
// closed thread loops mend. Each run's seed picks the quilt's fabric theme, the pattern of every
// patch and where the eight gold-star heirloom patches lie. Rules only; render/quilt-art.js paints it.
import { clamp, pointInPolygon } from '../core/geometry.js';
import { createRandom } from '../core/random.js';
import { PALETTE, PATCH, QUILT_BUDGET } from '../core/config.js';

export const QUILT_THEMES = [
  { name: 'Summer Gingham', colors: ['#e9c46a', '#e07a5f', '#f2cc8f', '#81b29a', '#98c1d9', '#f4a7a1'] },
  { name: 'Orchard Patchwork', colors: ['#e07a5f', '#b5c99a', '#a7c4a0', '#f2cc8f', '#c9ada7', '#e9c46a'] },
  { name: 'Seaside Squares', colors: ['#6f8fb3', '#98c1d9', '#f1e3c8', '#81b29a', '#f4a7a1', '#e9c46a'] },
  { name: 'Rosehip Calico', colors: ['#d9a5b3', '#f4a7a1', '#c9ada7', '#f1e3c8', '#b5c99a', '#e07a5f'] },
  { name: 'Meadow Plaid', colors: ['#a7c4a0', '#81b29a', '#e9c46a', '#f2cc8f', '#6f8fb3', '#d9a5b3'] },
];

const PATTERNS = ['plain', 'gingham', 'dots', 'stripes', 'flowers', 'chevron', 'cross', 'plain'];
const HEIRLOOMS = 8;

export function createQuilt(seed) {
  const rng = createRandom(seed * 7919 + 13);
  const theme = rng.pick(QUILT_THEMES);
  const patterns = PATTERNS.filter(() => rng.chance(0.75));
  if (patterns.length < 3) patterns.push('plain', 'dots', 'gingham');
  const patches = [];
  for (let row = 0; row < PATCH.rows; row += 1) {
    for (let col = 0; col < PATCH.cols; col += 1) {
      const color = rng.pick(theme.colors);
      let accent = rng.pick(theme.colors);
      if (accent === color) accent = PALETTE.cream;
      const holes = [];
      for (let k = 0; k < 6; k += 1) {
        holes.push({ x: rng.range(14, PATCH.size - 14), y: rng.range(14, PATCH.size - 14), r: rng.range(9, 17), jag: rng.int(0, 1000) });
      }
      patches.push({
        col,
        row,
        x: col * PATCH.size,
        y: row * PATCH.size,
        cx: col * PATCH.size + PATCH.size / 2,
        cy: row * PATCH.size + PATCH.size / 2,
        color,
        accent,
        pattern: rng.pick(patterns),
        hp: 1,
        holes,
        mendFlash: 0,
        biteFlash: 0,
        heirloom: false,
        kind: null,
      });
    }
  }
  // Heirloom patches: gold-embroidered squares the moths crave, worth a bonus each dawn they survive.
  const inner = patches.filter((p) => p.col > 0 && p.row > 1 && p.col < PATCH.cols - 1 && p.row < PATCH.rows - 2);
  for (let i = 0; i < HEIRLOOMS; i += 1) {
    if (inner.length === 0) break;
    const pick = inner.splice(Math.floor(rng.next() * inner.length), 1)[0];
    pick.heirloom = true;
    inner.splice(0, inner.length, ...inner.filter((p) => Math.abs(p.col - pick.col) + Math.abs(p.row - pick.row) > 1));
  }
  return { patches, theme, artSeed: seed, eaten: 0, art: null };
}

/** Heirloom patches still holding together (most of their cloth left). */
export function heirloomsKept(quilt) {
  return quilt.patches.filter((p) => p.heirloom && p.hp > 0.5).length;
}

/** Takes a bite out of a patch; returns true when the patch is eaten through. */
export function nibblePatch(quilt, patch, amount) {
  const before = patch.hp;
  patch.hp = Math.max(0, patch.hp - amount);
  quilt.eaten += before - patch.hp;
  patch.biteFlash = 1;
  return patch.hp <= 0;
}

/** Mends every patch whose centre lies inside the loop; returns how much cloth came back. */
export function mendInside(quilt, polygon, amount) {
  let restored = 0;
  quilt.lastMended = 0;
  for (const patch of quilt.patches) {
    if (!pointInPolygon(patch.cx, patch.cy, polygon)) continue;
    if (patch.hp < 1 || patch.kind === 'frayed') quilt.lastMended += 1;
    // Darning a frayed patch stops it unravelling.
    if (patch.kind === 'frayed') patch.kind = null;
    if (patch.hp >= 1) continue;
    const before = patch.hp;
    patch.hp = Math.min(1, patch.hp + amount);
    restored += patch.hp - before;
    patch.mendFlash = 1;
  }
  quilt.eaten = Math.max(0, quilt.eaten - restored);
  return restored;
}

/** Darning: restores up to `patches` worth of cloth, the most-eaten patches first. */
export function darnPatches(quilt, patches) {
  let left = patches;
  const worn = quilt.patches.filter((p) => p.hp < 1).sort((a, b) => a.hp - b.hp);
  for (const patch of worn) {
    if (left <= 0) break;
    if (patch.kind === 'frayed') patch.kind = null;
    const add = Math.min(1 - patch.hp, left);
    patch.hp += add;
    left -= add;
    quilt.eaten = Math.max(0, quilt.eaten - add);
    patch.mendFlash = 1;
  }
  return patches - left;
}

/** Tears cloth away (an event's cost): the least-eaten patches lose `patches` worth in all. */
export function tearPatches(quilt, rng, patches) {
  let left = patches;
  while (left > 0) {
    const whole = quilt.patches.filter((p) => p.hp > 0 && !p.heirloom);
    if (whole.length === 0) break;
    const patch = rng.pick(whole);
    const bite = Math.min(patch.hp, left, 0.5);
    nibblePatch(quilt, patch, bite);
    left -= bite;
  }
}

/** 1 while the quilt is whole, 0 when it unravels. */
export function quiltIntegrity(quilt) {
  return clamp(1 - quilt.eaten / QUILT_BUDGET, 0, 1);
}

export function updateQuilt(quilt, dt) {
  for (const patch of quilt.patches) {
    if (patch.mendFlash > 0) patch.mendFlash = Math.max(0, patch.mendFlash - dt * 1.6);
    if (patch.biteFlash > 0) patch.biteFlash = Math.max(0, patch.biteFlash - dt * 4);
  }
}
