// Tea & Rest: a quiet patch on the road. Pick one: wind back spools, darn the quilt, or embroider
// (one more level of a notion you already own).
import { darnPatches } from '../world/quilt.js';
import { notionById } from '../items/notions.js';
import { takeNotion } from '../items/loadout.js';

export function restChoices(run) {
  const choices = [
    { id: 'tea', name: 'Tea & Rest', text: `Heal ${run.mods.restHeal} spools`, color: '#2f8178', icon: 'tea' },
    { id: 'darn', name: 'Darn the Quilt', text: 'Mend 6 patches of cloth', color: '#f5c542', icon: 'mend' },
  ];
  const growable = Object.keys(run.owned).filter((id) => run.owned[id] < notionById(id).max);
  if (growable.length > 0) choices.push({ id: 'embroider', name: 'Embroider', text: 'One more level of a notion you own', color: '#cf6a43', icon: 'book' });
  return choices;
}

export function takeRest(run, id) {
  if (id === 'tea') run.player.hp = Math.min(run.mods.hp, run.player.hp + run.mods.restHeal);
  else if (id === 'darn') run.stats.mended += darnPatches(run.quilt, 6);
  else {
    const growable = Object.keys(run.owned).filter((key) => run.owned[key] < notionById(key).max);
    takeNotion(run, run.rng.pick(growable));
  }
  run.events.push({ type: 'pickup' });
}
