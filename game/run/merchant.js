// The Peddler: a road patch where sequins buy notions, relics, a spool of health or darning.
// The stock is drawn from the run's seed when you arrive; each item sells once.
import { createRandom, mixSeed } from '../core/random.js';
import { darnPatches } from '../world/quilt.js';
import { draftNotions } from '../items/notions.js';
import { draftRelics } from '../items/relics.js';
import { gainRelic, takeNotion } from '../items/loadout.js';
import { synergiesCompletedBy } from '../items/synergies.js';

export function stockMerchant(run, node) {
  const rng = createRandom(mixSeed(run.seed, node.depth * 53 + node.lane));
  const items = [];
  for (const notion of draftNotions(rng, run.owned, 3)) {
    items.push({ kind: 'notion', id: notion.id, name: notion.name, text: notion.text, color: notion.color, price: 28 + 10 * (run.owned[notion.id] ?? 0) + rng.int(0, 6) });
  }
  for (const relic of draftRelics(rng, run.relics, 2, run.coop)) {
    items.push({ kind: 'relic', id: relic.id, name: relic.name, text: relic.text, color: relic.color, price: 70 + rng.int(0, 15) });
  }
  items.push({ kind: 'spool', id: 'spool', name: 'Spare Spool', text: 'Heal 1 spool', color: '#d6333f', price: 18 });
  items.push({ kind: 'darn', id: 'darn', name: 'Darning Kit', text: 'Mend 5 patches', color: '#f5c542', price: 22 });
  for (const item of items) {
    item.sold = false;
    item.completes = item.kind === 'notion' ? synergiesCompletedBy(run.owned, run.relics, { notion: item.id }) : item.kind === 'relic' ? synergiesCompletedBy(run.owned, run.relics, { relic: item.id }) : [];
  }
  return { items, message: 'Fine notions! Fair prices!' };
}

export function canBuy(run, item) {
  if (item.sold || run.sequins < item.price) return false;
  if (item.kind === 'spool') return run.player.hp < run.mods.hp;
  return true;
}

/** Buys an item if it can; returns true when it did. */
export function buyItem(run, shop, item) {
  if (!canBuy(run, item)) {
    shop.message = item.sold ? 'Already sold!' : run.sequins < item.price ? 'Not enough sequins.' : 'You are at full spools.';
    return false;
  }
  run.sequins -= item.price;
  item.sold = true;
  if (item.kind === 'notion') takeNotion(run, item.id);
  else if (item.kind === 'relic') gainRelic(run, item.id);
  else if (item.kind === 'spool') run.player.hp += 1;
  else darnPatches(run.quilt, 5);
  shop.message = `${item.name}: a fine choice!`;
  run.events.push({ type: 'buy' });
  return true;
}
