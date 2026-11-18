// Night goals: every night sets three, shown with live progress in the side panel. Clearing the
// night (or felling its boss) is required; closing enough loops and keeping six heirlooms whole
// are optional, and each one met pays sequins at dawn.
import { heirloomsKept } from './quilt.js';
import { foesRemaining } from './nights.js';
import { awardSequins } from '../run/scoring.js';

export function createNightGoals(run, night) {
  const loops = 2 + Math.ceil(night.depth / 3);
  run.goalStart = { loops: run.stats.loops };
  run.goals = [
    { id: 'clear', text: night.boss ? `Defeat the ${night.name.replace('The ', '')}` : 'Stitch every pest', reward: 0 },
    { id: 'loops', text: `Close ${loops} loops`, target: loops, reward: 10 + night.depth },
    { id: 'heirlooms', text: 'Keep 6 heirlooms', target: 6, reward: 8 + night.depth },
  ];
}

/** Each goal with its current value, target and whether it is met. */
export function goalStatus(run) {
  if (!run.goals) return [];
  return run.goals.map((goal) => {
    let value = 0;
    let target = goal.target;
    if (goal.id === 'clear' && run.night?.boss) {
      const boss = run.night.boss;
      target = 1;
      value = run.waveTime > 3 && !run.enemies.some((e) => e.kind === boss && !e.dead) && !run.spawnQueue.some((q) => q.kind === boss) ? 1 : 0;
    } else if (goal.id === 'clear') {
      target = Math.max(1, run.waveTotal);
      value = Math.max(0, target - foesRemaining(run));
    } else if (goal.id === 'loops') value = run.stats.loops - run.goalStart.loops;
    else value = heirloomsKept(run.quilt);
    return { ...goal, value: Math.min(value, target), target, done: value >= target };
  });
}

/** Dawn: pays the optional goals that were met. */
export function payGoals(run) {
  let y = 480;
  for (const goal of goalStatus(run)) {
    if (!goal.done || goal.reward === 0) continue;
    awardSequins(run, goal.reward, 640, y, true);
    run.stats.goals += 1;
    y += 40;
  }
  if (y > 480) run.events.push({ type: 'pickup' });
}
