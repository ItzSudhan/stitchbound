// Score and combo: every kill pays its kind's points times the combo multiplier, which climbs
// while kills keep coming and drops when the needle goes quiet. Loop kills pay half again.
import { COMBO, PALETTE } from './config.js';
import { floatText } from './effects.js';

export function createCombo() {
  return { count: 0, timer: 0, best: 1 };
}

export function comboMultiplier(run) {
  return Math.min(COMBO.max, 1 + Math.floor(run.combo.count / COMBO.killsPerStep));
}

export function registerKill(run, enemy, source) {
  const combo = run.combo;
  combo.count += 1;
  combo.timer = COMBO.window;
  const multiplier = comboMultiplier(run);
  combo.best = Math.max(combo.best, multiplier);
  const points = Math.round(enemy.score * multiplier * (source === 'loop' ? 1.5 : 1));
  run.score += points;
  run.stats.kills += 1;
  if (enemy.kind === 'moth') run.stats.moths += 1;
  floatText(run.fx, enemy.x, enemy.y - 18, `+${points}`, multiplier > 1 ? PALETTE.gold : PALETTE.cream, enemy.r > 40 ? 40 : 21);
}

export function addBonus(run, points, label, x, y) {
  run.score += points;
  floatText(run.fx, x, y, `${label}  +${points}`, PALETTE.gold, 34);
}

export function updateCombo(run, dt) {
  const combo = run.combo;
  if (combo.timer > 0) {
    combo.timer -= dt;
    if (combo.timer <= 0) combo.count = 0;
  }
}
