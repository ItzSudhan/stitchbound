// Score, combo and sequins. Every kill pays its kind's points times the combo multiplier, which
// climbs while kills keep coming and drops when the needle goes quiet; loop kills pay half again.
// Sequins are the road's currency, spent at the peddler and on some mysteries.
import { COMBO, PALETTE } from '../core/config.js';
import { addCallout, floatText } from '../render/effects.js';

export function createCombo() {
  return { count: 0, timer: 0, best: 1 };
}

export function comboMultiplier(run) {
  return Math.min(COMBO.max, 1 + Math.floor(run.combo.count / COMBO.killsPerStep));
}

export function registerKill(run, enemy, source) {
  const combo = run.combo;
  const before = comboMultiplier(run);
  combo.count += 1;
  combo.timer = COMBO.window;
  const multiplier = comboMultiplier(run);
  if (multiplier > before && multiplier >= 3) addCallout(run.fx, `CHAIN x${multiplier}!`, '#ff7ab8');
  combo.best = Math.max(combo.best, multiplier);
  const points = Math.round(enemy.score * multiplier * (source === 'loop' ? 1.5 : 1));
  run.score += points;
  run.stats.kills += 1;
  if (enemy.kind === 'wyrm') run.stats.wyrmBeaten = true;
  floatText(run.fx, enemy.x, enemy.y - 18, `+${points}`, multiplier > 1 ? PALETTE.gold : PALETTE.cream, enemy.r > 40 ? 40 : 21);
}

/** Pays sequins (scaled by Lucky Button and friends); big payouts float up as text. */
export function awardSequins(run, amount, x, y, loud = false) {
  const paid = Math.max(amount > 0 ? 1 : 0, Math.round(amount * run.mods.sequinBonus));
  run.sequins += paid;
  run.stats.sequins += paid;
  run.sequinPulse = 1;
  if (loud || paid >= 5) floatText(run.fx, x, y, `+${paid} SEQUINS`, PALETTE.sequin, 26);
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
  if (run.sequinPulse > 0) run.sequinPulse = Math.max(0, run.sequinPulse - dt * 3);
}
