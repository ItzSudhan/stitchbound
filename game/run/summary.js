// The numbers of a finished run, as the results card shows them.
import { heirloomsKept } from '../world/quilt.js';
import { needleById } from '../meta/needles.js';
import { modeById } from '../meta/modes.js';
import { synergyById } from '../items/synergies.js';

export function summarizeRun(run, previousBest, unlocked = []) {
  return {
    outcome: run.outcome,
    score: run.score,
    best: Math.max(previousBest, run.score),
    newBest: run.score > previousBest,
    night: run.depth,
    endless: run.endless,
    mode: modeById(run.modeId).name,
    needle: needleById(run.needleId).name,
    quiltName: run.quilt.theme.name,
    kills: run.stats.kills,
    loops: run.stats.loops,
    biggestLoop: run.stats.biggestLoop,
    mended: run.stats.mended,
    sequins: run.stats.sequins,
    combo: run.combo.best,
    heirlooms: heirloomsKept(run.quilt),
    time: run.time,
    owned: Object.keys(run.owned),
    relics: [...run.relics],
    synergies: run.synergies.map((id) => synergyById(id).name),
    unlocked: unlocked.map((n) => n.name),
  };
}
