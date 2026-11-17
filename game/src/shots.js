// Deterministic scenes for screenshots and tests, behind ?shot=<name>&seed=<n>. Every scene is a
// real run of the game's own rules, played forward from a fresh start by the autopilot (which
// also picks its notions), and stopped at the moment the scene names:
//   title  the title screen over its attract-mode quilt
//   cover  the Moth Matriarch fight, at its busiest moment as a loop cinches
//   wyrm   the Yarn Wyrm fight, at its busiest moment
//   draft  the notion draft after a night
//   end    the results card of that same run
// "Busiest moment" is found by playing the run once, scoring every frame, then replaying the
// same seed to the best frame: the run is deterministic, so the replay is the same game.
import { STEP } from './config.js';
import { createRun, stepRun, beginNextWave } from './game.js';
import { createPilot, pilotIntent, pilotPick } from './autopilot.js';
import { draftUpgrades, takeUpgrade } from './upgrades.js';
import { summarizeRun } from './summary.js';

const LIMIT_STEPS = 60 * 60 * 30;

/** Plays a run with the autopilot until `stop(run, step)` is true or the run ends; returns the run. */
export function playUntil(seed, stop, { immortal = true } = {}) {
  const run = createRun(seed);
  run.immortal = immortal;
  const pilot = createPilot();
  for (let step = 0; step < LIMIT_STEPS; step += 1) {
    if (stop(run, step)) return run;
    if (run.wavePhase === 'draft' && !run.outcome) {
      const choices = draftUpgrades(run.rng, run.owned);
      run.lastChoices = choices;
      if (stop(run, step)) return run;
      takeUpgrade(run, pilotPick(choices).id);
      beginNextWave(run);
    }
    stepRun(run, pilotIntent(run, pilot, STEP), STEP);
    run.events.length = 0;
  }
  return run;
}

/** Replays the seed to the frame that `score` rates highest. */
function playToBestFrame(seed, score) {
  let bestStep = -1;
  let bestScore = -Infinity;
  playUntil(seed, (run, step) => {
    const s = score(run);
    if (s > bestScore) {
      bestScore = s;
      bestStep = step;
    }
    return Boolean(run.outcome);
  });
  return playUntil(seed, (run, step) => step >= bestStep);
}

/** How much is going on: a fresh cinch, flying shots, creatures and particles. */
function spectacle(run) {
  const fresh = run.cinches.some((c) => c.age > 0.04 && c.age < 0.16);
  return (fresh ? 60 : 0) + Math.min(60, run.shots.length) * 0.8 + run.enemies.length * 2 + Math.min(300, run.fx.particles.length) * 0.05 + run.pins.length * 0.3;
}

function bossOnScreen(run, kind) {
  return run.enemies.some((e) => e.kind === kind && !e.dead && !e.entering && e.x > 200 && e.x < 1080 && e.y > 180 && e.y < 600);
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
      const run = playToBestFrame(seed, (r) => (r.wave === 5 && bossOnScreen(r, 'wyrm') ? spectacle(r) : -1));
      return { screen: 'play', run, time: run.time };
    }
    case 'cover': {
      const run = playToBestFrame(seed, (r) => {
        if (r.wave !== 10 || !bossOnScreen(r, 'matriarch')) return -1;
        const boss = r.enemies.find((e) => e.kind === 'matriarch');
        const p = r.player;
        if (boss.flash > 0.5 || r.fx.flash > 0.02 || r.fx.floaters.length > 3) return -1;
        if (p.x < 120 || p.x > 1160 || p.y < 190 || p.y > 660 || p.invuln > 0) return -1;
        const apart = Math.hypot(p.x - boss.x, p.y - boss.y);
        const offCentre = Math.hypot(boss.x - 640, boss.y - 380);
        return spectacle(r) - offCentre * 0.12 + (boss.spiralLeft > 0 ? 40 : 0) + (boss.hp / boss.maxHp) * 60 + (p.hp >= 3 ? 20 : 0) + (apart > 180 && apart < 420 ? 30 : 0);
      });
      return { screen: 'play', run, time: run.time };
    }
    case 'end': {
      const run = playUntil(seed, (r) => Boolean(r.outcome) && r.fx.particles.length < 40);
      return { screen: 'over', run, summary: summarizeRun(run, 0), time: run.time };
    }
    default:
      return null;
  }
}
