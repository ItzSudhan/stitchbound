// Progress across runs: loops closed, the furthest night, bosses beaten and quilts saved. Each
// finished run adds to the tally; the needles it newly unlocks are returned for the results card.
import { loadSave, writeSave } from '../core/storage.js';
import { NEEDLES, isUnlocked } from './needles.js';
import { recordDiscoveries } from './codex.js';

export function currentProgress() {
  return loadSave().progress;
}

/** Folds a finished run into the saved progress; returns the needles it unlocked. */
export function recordRunProgress(run) {
  const save = loadSave();
  const before = { ...save.progress };
  const p = save.progress;
  p.runs += 1;
  p.loops += run.stats.loops;
  p.bestNight = Math.max(p.bestNight, run.depth);
  if (run.stats.wyrmBeaten) p.wyrmBeaten += 1;
  if (run.outcome === 'win') p.wins += 1;
  if (run.endless) p.endlessBest = Math.max(p.endlessBest, run.depth);
  writeSave(save);
  recordDiscoveries(run);
  return NEEDLES.filter((n) => !isUnlocked(n, before) && isUnlocked(n, p));
}
