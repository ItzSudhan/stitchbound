// The Sampler: a record of everything met across runs: pests, patch kinds, relics and synergies.
// Each finished run adds what it saw; the title screen's Sampler shows what is still unknown.
import { loadSave, writeSave } from '../core/storage.js';
import { PATCH_KINDS } from '../world/patches.js';
import { RELICS } from '../items/relics.js';
import { SYNERGIES } from '../items/synergies.js';

export const CODEX_PESTS = ['moth', 'silverfish', 'beetle', 'snipper', 'spitter', 'lintBall', 'burrower', 'carpetBeetle', 'wyrm', 'matriarch'];
export const PEST_NAMES = {
  moth: 'Moth', silverfish: 'Silverfish', beetle: 'Button Beetle', snipper: 'Snipper', spitter: 'Pincushion',
  lintBall: 'Lint Ball', burrower: 'Burrower', carpetBeetle: 'Carpet Beetle', wyrm: 'Yarn Wyrm', matriarch: 'Moth Matriarch',
};
export const PEST_EFFECTS = {
  moth: 'Eats holes in the quilt',
  silverfish: 'Fast; bites the needle',
  beetle: 'Winds up and charges',
  snipper: 'Snips your thread',
  spitter: 'Fires fans of pins',
  lintBall: 'Splits in two when hit',
  burrower: 'Tunnels, tears cloth',
  carpetBeetle: 'Chews along seams',
  wyrm: 'Boss: coils and lunges',
  matriarch: 'Boss: dust and brood',
};

export function loadCodex() {
  const save = loadSave();
  save.codex = { pests: [], patches: [], relics: [], synergies: [], ...(save.codex ?? {}) };
  return save.codex;
}

/** Folds what a run met into the Sampler. */
export function recordDiscoveries(run) {
  const codex = loadCodex();
  const add = (list, items) => {
    for (const item of items) if (!list.includes(item)) list.push(item);
  };
  add(codex.pests, [...run.seen.pests].filter((k) => CODEX_PESTS.includes(k)));
  add(codex.patches, [...run.seen.patches]);
  add(codex.relics, run.relics);
  add(codex.synergies, run.synergies);
  writeSave(loadSave());
}

export function codexCounts() {
  const codex = loadCodex();
  const total = CODEX_PESTS.length + Object.keys(PATCH_KINDS).length + RELICS.length + SYNERGIES.length;
  const found = codex.pests.length + codex.patches.length + codex.relics.length + codex.synergies.length;
  return { found, total };
}
