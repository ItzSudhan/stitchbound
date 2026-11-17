// The best score, kept in localStorage. Storage can be blocked (private windows, file pages), so
// every read and write is guarded: the game then keeps the best for this visit only.
import { BEST_KEY } from './config.js';

let memoryBest = 0;

export function readBest() {
  try {
    const stored = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    return Math.max(stored, memoryBest);
  } catch {
    return memoryBest;
  }
}

/** Records a finished run's score; returns true when it beat the previous best. */
export function recordScore(score) {
  const before = readBest();
  if (score <= before) return false;
  memoryBest = score;
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage is off: the in-memory best still holds for this visit.
  }
  return true;
}
