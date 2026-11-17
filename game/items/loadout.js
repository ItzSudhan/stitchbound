// The needle's build: base stats, then the chosen needle, every notion level, every relic, the
// synergies they complete, and (during a night) that night's modifier. Taking a notion or a
// relic goes through here, so new synergies are noticed and announced the moment they form.
import { PALETTE, PLAYER_BASE } from '../core/config.js';
import { notionById } from './notions.js';
import { relicById } from './relics.js';
import { activeSynergies } from './synergies.js';
import { needleById } from '../meta/needles.js';
import { applyModifierToMods } from '../world/modifiers.js';
import { floatText, ring, screenFlash } from '../render/effects.js';

export function computeMods(run) {
  const mods = { ...PLAYER_BASE };
  needleById(run.needleId).apply(mods);
  mods.hp += run.extraHp;
  for (const [id, level] of Object.entries(run.owned)) {
    const notion = notionById(id);
    for (let i = 0; i < level; i += 1) notion.apply(mods);
  }
  for (const id of run.relics) relicById(id).apply(mods);
  const synergies = activeSynergies(run.owned, run.relics);
  for (const synergy of synergies) synergy.apply(mods);
  if (run.inNight && run.night) applyModifierToMods(mods, run.night.modifier);
  return { mods, synergies };
}

/** Recomputes the build; announces any synergy that has just formed. Keeps current spools. */
export function refreshLoadout(run) {
  const { mods, synergies } = computeMods(run);
  run.mods = mods;
  if (run.player) run.player.hp = Math.min(run.player.hp, mods.hp);
  for (const synergy of synergies) {
    if (run.synergies.includes(synergy.id)) continue;
    run.synergies.push(synergy.id);
    run.events.push({ type: 'synergy' });
    run.announcements.push({ title: `SYNERGY: ${synergy.name.toUpperCase()}`, text: synergy.text, age: 0 });
    if (run.player) {
      ring(run.fx, run.player.x, run.player.y, PALETTE.gold, 160, 0.8, 10);
      floatText(run.fx, run.player.x, run.player.y - 60, synergy.name.toUpperCase(), PALETTE.gold, 30);
    }
    screenFlash(run.fx, PALETTE.gold, 0.3);
  }
}

/** Takes one level of a notion (a Brass Thimble also heals two spools). */
export function takeNotion(run, id) {
  run.owned[id] = (run.owned[id] ?? 0) + 1;
  refreshLoadout(run);
  if (id === 'thimble') run.player.hp = Math.min(run.mods.hp, run.player.hp + 2);
  run.stats.picks.push(notionById(id).name);
}

/** Adds a relic to the run (a Tin of Tea's extra spool arrives full). */
export function gainRelic(run, id) {
  if (run.relics.includes(id)) return;
  run.relics.push(id);
  const before = run.mods.hp;
  refreshLoadout(run);
  if (run.mods.hp > before) run.player.hp += run.mods.hp - before;
}
