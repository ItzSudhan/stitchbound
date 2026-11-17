// The numbers of a finished run, as the results card shows them.
import { heirloomsKept } from './quilt.js';

export function summarizeRun(run, previousBest) {
  return {
    outcome: run.outcome,
    score: run.score,
    best: Math.max(previousBest, run.score),
    newBest: run.score > previousBest,
    wave: run.wave,
    kills: run.stats.kills,
    loops: run.stats.loops,
    biggestLoop: run.stats.biggestLoop,
    mended: run.stats.mended,
    combo: run.combo.best,
    heirlooms: heirloomsKept(run.quilt),
    time: run.time,
    owned: Object.keys(run.owned),
  };
}
