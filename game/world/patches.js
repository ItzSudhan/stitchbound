// Patch kinds: special squares laid into each night's board, each with a rule of its own.
//   snag    pulled loops of thread: the needle drags through at half speed
//   button  a big sewn button: pins that cross it ricochet toward the nearest pest
//   candle  a lit candle: lights the dark around it, and moths are drawn to it; eaten, it goes out
//   frayed  a fraying square: it unravels on its own and spreads to its neighbours unless darned
// Later nights bring more kinds, and more of each.
import { PATCH } from '../core/config.js';
import { distance } from '../core/geometry.js';
import { nibblePatch } from './quilt.js';

export const PATCH_KINDS = {
  snag: { name: 'Snag', text: 'Pulled loops: the needle drags at half speed', from: 1, color: '#7a3b2e' },
  button: { name: 'Button Patch', text: 'Pins that cross it ricochet to a pest', from: 2, color: '#2b4166' },
  candle: { name: 'Candle Patch', text: 'Lights the dark; moths flock to it', from: 3, color: '#f5c542' },
  frayed: { name: 'Frayed Patch', text: 'Unravels and spreads unless darned', from: 4, color: '#e0473a' },
};

const FRAY_RATE = 0.018;
const FRAY_SPREAD_AT = 0.45;

/** How many of each kind a night at this depth lays down. */
export function patchKindCounts(depth) {
  const d = Math.min(depth, 12);
  return {
    snag: depth >= 1 ? 2 + Math.floor(d / 3) : 0,
    button: depth >= 2 ? 2 + Math.floor(d / 4) : 0,
    candle: depth >= 3 ? 3 + Math.floor(d / 4) : 0,
    frayed: depth >= 4 ? 1 + Math.floor((d - 4) / 3) : 0,
  };
}

export function patchUnder(quilt, x, y) {
  const col = Math.floor(x / PATCH.size);
  const row = Math.floor(y / PATCH.size);
  if (col < 0 || row < 0 || col >= PATCH.cols || row >= PATCH.rows) return null;
  return quilt.patches[row * PATCH.cols + col];
}

/** Snags slow the needle; 1 elsewhere. */
export function dragAt(quilt, x, y) {
  const patch = patchUnder(quilt, x, y);
  return patch && patch.kind === 'snag' && patch.hp > 0 ? 0.5 : 1;
}

export function litCandles(quilt) {
  return quilt.patches.filter((p) => p.kind === 'candle' && p.hp > 0.4);
}

/** A button patch the pin is passing over (and has not bounced off yet), or null. */
export function buttonPatchHit(quilt, pin) {
  const patch = patchUnder(quilt, pin.x, pin.y);
  if (!patch || patch.kind !== 'button' || patch.hp <= 0 || pin.buttons?.has(patch)) return null;
  return distance(pin.x, pin.y, patch.cx, patch.cy) < 26 ? patch : null;
}

/** Fraying: frayed patches lose cloth on their own and, worn far enough, fray a neighbour. */
export function updatePatches(run, dt) {
  const quilt = run.quilt;
  for (const patch of quilt.patches) {
    if (patch.kind !== 'frayed' || patch.hp <= 0) continue;
    nibblePatch(quilt, patch, FRAY_RATE * dt);
    patch.biteFlash = 0;
    if (patch.hp < FRAY_SPREAD_AT && !patch.spread) {
      patch.spread = true;
      const near = quilt.patches.filter((p) => Math.abs(p.col - patch.col) + Math.abs(p.row - patch.row) === 1 && !p.kind && !p.heirloom && p.hp > 0.5);
      if (near.length > 0) {
        run.rng.pick(near).kind = 'frayed';
        run.events.push({ type: 'patchLost' });
      }
    }
  }
}
