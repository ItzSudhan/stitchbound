// Mystery patches: small stories on the quilt road, each with a choice that trades spools,
// sequins, cloth, notions and relics. The run's seed decides which one waits on which patch.
import { createRandom, mixSeed } from '../core/random.js';
import { darnPatches, tearPatches } from '../world/quilt.js';
import { draftNotions, notionById } from '../items/notions.js';
import { draftRelics } from '../items/relics.js';
import { gainRelic, refreshLoadout, takeNotion } from '../items/loadout.js';

function randomRelic(run, rng) {
  const [relic] = draftRelics(rng, run.relics, 1);
  if (!relic) {
    run.sequins += 40;
    return 'Nothing left to find: +40 sequins instead.';
  }
  gainRelic(run, relic.id);
  return `You gain the ${relic.name}.`;
}

export const EVENTS = [
  {
    id: 'thimble', title: 'A Lost Thimble', text: 'A brass thimble glints between two patches.',
    options: [
      { label: 'Wear it', detail: '+1 max spool', apply: (run) => { run.extraHp += 1; refreshLoadout(run); run.player.hp += 1; return 'Snug fit: +1 max spool.'; } },
      { label: 'Sell it on', detail: '+35 sequins', apply: (run) => { run.sequins += 35; return '+35 sequins.'; } },
    ],
  },
  {
    id: 'oracle', title: 'The Moth Oracle', text: 'An old moth offers a keepsake, for a price in thread.',
    options: [
      { label: 'Bargain', detail: 'Lose 2 spools, gain a relic', can: (run) => run.player.hp > 2, apply: (run, rng) => { run.player.hp -= 2; return randomRelic(run, rng); } },
      { label: 'Refuse politely', detail: 'Nothing happens', apply: () => 'The oracle flutters off.' },
    ],
  },
  {
    id: 'box', title: 'A Forgotten Sewing Box', text: 'Someone left their sewing box open on the quilt.',
    options: [
      { label: 'Rummage', detail: 'A random notion', apply: (run, rng) => { const [n] = draftNotions(rng, run.owned, 1); if (!n) return 'Empty.'; takeNotion(run, n.id); return `You find ${n.name}.`; } },
      { label: 'Pocket the sequins', detail: '+30 sequins', apply: (run) => { run.sequins += 30; return '+30 sequins.'; } },
    ],
  },
  {
    id: 'corner', title: 'An Unravelling Corner', text: 'A corner of the quilt is coming loose.',
    options: [
      { label: 'Darn it', detail: 'Pay 25 sequins, mend 6 patches', can: (run) => run.sequins >= 25, apply: (run) => { run.sequins -= 25; darnPatches(run.quilt, 6); return 'Neatly darned.'; } },
      { label: 'Leave it', detail: 'The corner frays: lose 2 patches', apply: (run, rng) => { tearPatches(run.quilt, rng, 2); return 'Threads come loose...'; } },
    ],
  },
  {
    id: 'spider', title: 'The Gambling Spider', text: '"Double or nothing," she clicks, shuffling buttons.',
    options: [
      { label: 'Bet 30 sequins', detail: 'Win 70, or lose it all', can: (run) => run.sequins >= 30, apply: (run, rng) => { run.sequins -= 30; if (rng.chance(0.5)) { run.sequins += 70; return 'You win 70 sequins!'; } return 'The spider wins.'; } },
      { label: 'Walk away', detail: 'Keep your sequins', apply: () => 'Wise.' },
    ],
  },
  {
    id: 'book', title: "Grandmother's Pattern Book", text: 'Pages of old stitches and clever tricks.',
    options: [
      { label: 'Study it', detail: '+1 level to a notion you own', can: (run) => Object.keys(run.owned).some((id) => run.owned[id] < notionById(id).max), apply: (run, rng) => { const ids = Object.keys(run.owned).filter((id) => run.owned[id] < notionById(id).max); const id = rng.pick(ids); takeNotion(run, id); return `${notionById(id).name} improves.`; } },
      { label: 'Tear out a page', detail: '+20 sequins', apply: (run) => { run.sequins += 20; return '+20 sequins.'; } },
    ],
  },
  {
    id: 'cat', title: 'The Quilt Cat', text: 'A cat is curled up asleep on the warmest patch.',
    options: [
      { label: 'Let it purr', detail: 'Heal 2 spools', apply: (run) => { run.player.hp = Math.min(run.mods.hp, run.player.hp + 2); return 'Purring mends the soul: +2 spools.'; } },
      { label: 'Search its bed', detail: 'A relic, but the cat scratches (-1 spool)', can: (run) => run.player.hp > 1, apply: (run, rng) => { run.player.hp -= 1; return randomRelic(run, rng); } },
    ],
  },
];

/** The mystery waiting on a road patch, chosen by the run's seed. */
export function eventForNode(run, node) {
  const rng = createRandom(mixSeed(run.seed, node.depth * 31 + node.lane * 7 + 5));
  return { ...rng.pick(EVENTS), rng, result: null };
}

/** Takes an option of the open event; returns false when it cannot be afforded. */
export function chooseEventOption(run, event, index) {
  const option = event.options[index];
  if (!option || (option.can && !option.can(run))) return false;
  event.result = option.apply(run, event.rng);
  event.chosen = index;
  run.events.push({ type: 'event' });
  return true;
}
