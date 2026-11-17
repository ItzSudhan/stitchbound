// The heirloom quilt the whole game is played on: 160 felt patches, each with its own fabric
// pattern, that moths eat into holes and that closed thread loops mend. The whole quilt is painted
// once to an offscreen canvas; only the damage on top of it is drawn each frame.
import { clamp, pointInPolygon, TAU } from './geometry.js';
import { createRandom } from './random.js';
import { PALETTE, PATCH, PATCH_COLORS, QUILT_BUDGET, VIEW } from './config.js';

const PATTERNS = ['plain', 'gingham', 'dots', 'stripes', 'flowers', 'chevron', 'cross', 'plain'];
const HEIRLOOMS = 8;

/** Heirloom patches still holding together (most of their cloth left). */
export function heirloomsKept(quilt) {
  return quilt.patches.filter((p) => p.heirloom && p.hp > 0.5).length;
}

export function createQuilt(seed) {
  const rng = createRandom(seed * 7919 + 13);
  const patches = [];
  for (let row = 0; row < PATCH.rows; row += 1) {
    for (let col = 0; col < PATCH.cols; col += 1) {
      const color = rng.pick(PATCH_COLORS);
      let accent = rng.pick(PATCH_COLORS);
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
        pattern: rng.pick(PATTERNS),
        hp: 1,
        holes,
        mendFlash: 0,
        biteFlash: 0,
        heirloom: false,
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
  // Painted at twice the logical size so the cloth stays crisp when the page scales the game up.
  const canvas = document.createElement('canvas');
  canvas.width = VIEW.width * 2;
  canvas.height = VIEW.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  for (const patch of patches) paintPatch(ctx, patch, rng);
  paintQuiltShade(ctx);
  return { patches, canvas, eaten: 0 };
}

export function patchAt(quilt, x, y) {
  const col = Math.floor(x / PATCH.size);
  const row = Math.floor(y / PATCH.size);
  if (col < 0 || row < 0 || col >= PATCH.cols || row >= PATCH.rows) return null;
  return quilt.patches[row * PATCH.cols + col];
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
  for (const patch of quilt.patches) {
    if (patch.hp >= 1 || !pointInPolygon(patch.cx, patch.cy, polygon)) continue;
    const before = patch.hp;
    patch.hp = Math.min(1, patch.hp + amount);
    restored += patch.hp - before;
    patch.mendFlash = 1;
  }
  quilt.eaten = Math.max(0, quilt.eaten - restored);
  return restored;
}

/** Dawn darning: restores up to `patches` worth of cloth, the most-eaten patches first. */
export function darnAtDawn(quilt, patches) {
  let left = patches;
  const worn = quilt.patches.filter((p) => p.hp < 1).sort((a, b) => a.hp - b.hp);
  for (const patch of worn) {
    if (left <= 0) break;
    const add = Math.min(1 - patch.hp, left);
    patch.hp += add;
    left -= add;
    quilt.eaten = Math.max(0, quilt.eaten - add);
    patch.mendFlash = 1;
  }
  return patches - left;
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

export function drawQuilt(ctx, quilt) {
  ctx.drawImage(quilt.canvas, 0, 0, VIEW.width, VIEW.height);
  for (const patch of quilt.patches) {
    if (patch.hp < 1) drawPatchDamage(ctx, patch);
    if (patch.mendFlash > 0) drawMendStitches(ctx, patch);
  }
}

function paintPatch(ctx, patch, rng) {
  const { x, y } = patch;
  const s = PATCH.size;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();
  ctx.fillStyle = patch.color;
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = patch.accent;
  ctx.strokeStyle = patch.accent;
  switch (patch.pattern) {
    case 'gingham':
      ctx.globalAlpha = 0.38;
      for (let i = 0; i < s; i += 20) {
        ctx.fillRect(x + i, y, 10, s);
        ctx.fillRect(x, y + i, s, 10);
      }
      break;
    case 'dots':
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 4; i += 1) {
        for (let j = 0; j < 4; j += 1) {
          ctx.beginPath();
          ctx.arc(x + 10 + i * 20 + (j % 2) * 10, y + 10 + j * 20, 4.2, 0, TAU);
          ctx.fill();
        }
      }
      break;
    case 'stripes':
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 7;
      for (let i = -s; i < s * 2; i += 18) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i + s, y + s);
        ctx.stroke();
      }
      break;
    case 'flowers':
      ctx.globalAlpha = 0.9;
      for (let k = 0; k < 3; k += 1) {
        const fx = x + rng.range(16, s - 16);
        const fy = y + rng.range(16, s - 16);
        for (let p = 0; p < 5; p += 1) {
          const a = (p / 5) * TAU;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 4.5, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = PALETTE.cream;
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = patch.accent;
      }
      break;
    case 'chevron':
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 5;
      for (let j = 6; j < s; j += 18) {
        ctx.beginPath();
        for (let i = 0; i <= s; i += 16) ctx.lineTo(x + i, y + j + ((i / 16) % 2 === 0 ? 0 : 8));
        ctx.stroke();
      }
      break;
    case 'cross':
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          const cx = x + 14 + i * 26;
          const cy = y + 14 + j * 26;
          ctx.beginPath();
          ctx.moveTo(cx - 5, cy - 5);
          ctx.lineTo(cx + 5, cy + 5);
          ctx.moveTo(cx + 5, cy - 5);
          ctx.lineTo(cx - 5, cy + 5);
          ctx.stroke();
        }
      }
      break;
    default:
      break;
  }
  // Felt fuzz: faint speckles so every patch reads as cloth, not flat colour.
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 70; i += 1) {
    ctx.fillStyle = rng.chance(0.5) ? '#ffffff' : '#000000';
    ctx.fillRect(x + rng.range(0, s), y + rng.range(0, s), 2, 2);
  }
  ctx.globalAlpha = 1;
  if (patch.heirloom) paintHeirloom(ctx, patch);
  // Raised seam shading and the running stitch just inside each edge.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, s, 3);
  ctx.fillRect(x, y, 3, s);
  ctx.fillStyle = 'rgba(42,29,26,0.22)';
  ctx.fillRect(x, y + s - 3, s, 3);
  ctx.fillRect(x + s - 3, y, 3, s);
  ctx.strokeStyle = 'rgba(255,248,230,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.strokeRect(x + 7, y + 7, s - 14, s - 14);
  ctx.setLineDash([]);
  ctx.restore();
}

/** A deep velvet square with a gold-thread star embroidered in its middle. */
function paintHeirloom(ctx, patch) {
  const s = PATCH.size;
  const cx = patch.x + s / 2;
  const cy = patch.y + s / 2;
  ctx.fillStyle = '#5b2a4e';
  ctx.fillRect(patch.x, patch.y, s, s);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(patch.x + 4, patch.y + 4, s - 8, s - 8);
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const r = i % 2 === 0 ? 24 : 10;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.strokeStyle = PALETTE.goldDeep;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.8)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * TAU - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
    ctx.stroke();
  }
}

function paintQuiltShade(ctx) {
  // Night falls on the quilt: a soft lavender dusk, so the creatures and thread read above the cloth.
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#c6c0da';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.globalCompositeOperation = 'source-over';
  const vignette = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 260, VIEW.width / 2, VIEW.height / 2, 820);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(30,20,40,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

/** Moth holes: ragged dark gaps that grow as a patch is eaten, the table showing through. */
function drawPatchDamage(ctx, patch) {
  const eaten = 1 - patch.hp;
  ctx.save();
  if (patch.hp <= 0) {
    ctx.fillStyle = PALETTE.table;
    ctx.beginPath();
    const s = PATCH.size;
    for (let i = 0; i < 24; i += 1) {
      const t = i / 24;
      const edge = Math.floor(t * 4);
      const f = (t * 4) % 1;
      const wob = 4 + Math.sin(i * 12.9898 + patch.col * 3.1 + patch.row) * 3;
      const px = edge === 0 ? f * s : edge === 1 ? s - wob : edge === 2 ? s - f * s : wob;
      const py = edge === 0 ? wob : edge === 1 ? f * s : edge === 2 ? s - wob : s - f * s;
      ctx.lineTo(patch.x + px, patch.y + py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,180,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    patch.holes.forEach((hole, index) => {
      const grow = clamp(eaten * patch.holes.length - index, 0, 1);
      if (grow <= 0) return;
      const r = hole.r * grow;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * TAU;
        const rr = r * (0.72 + 0.28 * Math.abs(Math.sin(hole.jag + i * 2.3)));
        ctx.lineTo(patch.x + hole.x + Math.cos(a) * rr, patch.y + hole.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = PALETTE.table;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }
  if (patch.biteFlash > 0) {
    ctx.fillStyle = `rgba(224,71,58,${0.25 * patch.biteFlash})`;
    ctx.fillRect(patch.x, patch.y, PATCH.size, PATCH.size);
  }
  ctx.restore();
}

/** A fresh golden cross-stitch that fades after a loop mends a patch. */
function drawMendStitches(ctx, patch) {
  ctx.save();
  ctx.globalAlpha = patch.mendFlash;
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(patch.x + 5, patch.y + 5, PATCH.size - 10, PATCH.size - 10);
  ctx.beginPath();
  ctx.moveTo(patch.x + 18, patch.y + 18);
  ctx.lineTo(patch.x + PATCH.size - 18, patch.y + PATCH.size - 18);
  ctx.moveTo(patch.x + PATCH.size - 18, patch.y + 18);
  ctx.lineTo(patch.x + 18, patch.y + PATCH.size - 18);
  ctx.stroke();
  ctx.restore();
}
