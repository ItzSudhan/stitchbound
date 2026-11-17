// Deterministic scenes for screenshots and tests, behind ?shot=<name>&seed=<n>. Every scene is a
// real run of the game's own rules, played forward from a fresh start by the autopilot (which
// also picks its notions), and stopped at the moment the scene names:
//   title  the title screen over its attract-mode quilt
//   cover  the Moth Matriarch fight, the instant a loop cinches around her brood
//   draft  the notion draft after a night
//   wyrm   the Yarn Wyrm fight
//   end    the results card of that same run
import { STEP } from './config.js';
import { createRun, stepRun, beginNextWave } from './game.js';
import { createPilot, pilotIntent, pilotPick } from './autopilot.js';
import { draftUpgrades, takeUpgrade } from './upgrades.js';
import { summarizeRun } from './summary.js';

const LIMIT_STEPS = 60 * 60 * 30;

/** Plays a run with the autopilot until `stop(run)` is true or the run ends; returns the run. */
export function playUntil(seed, stop, { immortal = true } = {}) {
  const run = createRun(seed);
  run.immortal = immortal;
  const pilot = createPilot();
  for (let i = 0; i < LIMIT_STEPS; i += 1) {
    if (stop(run)) return run;
    if (run.wavePhase === 'draft' && !run.outcome) {
      const choices = draftUpgrades(run.rng, run.owned);
      run.lastChoices = choices;
      if (stop(run)) return run;
      takeUpgrade(run, pilotPick(choices).id);
      beginNextWave(run);
    }
    stepRun(run, pilotIntent(run, pilot, STEP), STEP);
    run.events.length = 0;
    if (run.outcome && run.fx.hitstop <= 0 && stop(run)) return run;
  }
  return run;
}

export function stageShot(name, seed) {
  switch (name) {
    case 'title': {
      const run = playUntil(seed, (r) => r.time > 9);
      return { screen: 'title', run, time: 9 };
    }
    case 'draft': {
      const run = playUntil(seed, (r) => r.wave === 4 && r.wavePhase === 'draft' && Boolean(r.lastChoices));
      return { screen: 'draft', run, choices: run.lastChoices, hover: 1, draftAge: 2, time: run.time };
    }
    case 'wyrm': {
      const run = playUntil(seed, (r) => r.wave === 5 && r.waveTime > 9 && r.cinches.length > 0);
      return { screen: 'play', run, time: run.time };
    }
    case 'cover': {
      const run = playUntil(seed, (r) => r.wave === 10 && r.waveTime > 26 && r.cinches.some((c) => c.age > 0.06 && c.age < 0.2) && r.shots.length > 20);
      return { screen: 'play', run, time: run.time };
    }
    case 'end': {
      const run = playUntil(seed, (r) => Boolean(r.outcome) && r.fx.particles.length < 40);
      return { screen: 'over', run, summary: summarizeRun(run, run.score + 1), time: run.time };
    }
    default:
      return null;
  }
}
