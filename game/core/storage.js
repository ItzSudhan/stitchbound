// Saved data in localStorage: best scores per mode, the daily seam's best, and the progress that
// unlocks needles. Storage can be blocked (private windows, file pages), so every read and write
// is guarded and the game falls back to an in-memory copy for this visit.
import { STORAGE_KEY } from './config.js';

let memory = null;

function blank() {
  return { best: {}, daily: {}, progress: { runs: 0, loops: 0, bestNight: 0, wyrmBeaten: 0, wins: 0, endlessBest: 0 } };
}

export function loadSave() {
  if (memory) return memory;
  memory = blank();
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (text) {
      const data = JSON.parse(text);
      memory = { ...memory, ...data, progress: { ...memory.progress, ...(data.progress ?? {}) } };
    }
  } catch {
    // Unreadable or blocked storage: start from a blank save.
  }
  return memory;
}

export function writeSave(save) {
  memory = save;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage is off: the in-memory save still holds for this visit.
  }
}

/** The best score for a mode (and, for the daily seam, for that day). */
export function bestScore(modeId, dayKey = null) {
  const save = loadSave();
  return (dayKey ? save.daily[dayKey] : save.best[modeId]) ?? 0;
}

/** Records a finished run's score; returns true when it beat the previous best. */
export function recordScore(modeId, score, dayKey = null) {
  const save = loadSave();
  const before = bestScore(modeId, dayKey);
  if (score <= before) return false;
  if (dayKey) save.daily[dayKey] = score;
  save.best[modeId] = Math.max(save.best[modeId] ?? 0, score);
  writeSave(save);
  return true;
}
