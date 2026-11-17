// Notions: the upgrades the player picks one of three after every cleared wave. Each one changes a
// number the rules read (run.mods), and some stack. The draft never offers a maxed notion twice.
import { PLAYER_BASE } from './config.js';

export const UPGRADES = [
  { id: 'spool', name: 'Longer Spool', text: 'Thread +35% longer: wider loops', max: 4, color: '#d6333f', apply: (m) => { m.threadLength *= 1.35; } },
  { id: 'steel', name: 'Steel Pins', text: 'Pin damage +35%', max: 5, color: '#8a919c', apply: (m) => { m.pinDamage *= 1.35; } },
  { id: 'twin', name: 'Twin Pins', text: 'Fire one more pin per shot', max: 3, color: '#6f8fb3', apply: (m) => { m.pinCount += 1; } },
  { id: 'quick', name: 'Quick Fingers', text: 'Fire rate +25%', max: 4, color: '#e3a83b', apply: (m) => { m.fireDelay *= 0.8; } },
  { id: 'wax', name: 'Waxed Thread', text: 'Loops cinch +60% harder', max: 4, color: '#cf6a43', apply: (m) => { m.loopDamage *= 1.6; } },
  { id: 'mend', name: 'Darning Charm', text: 'Loops mend +60% more cloth', max: 3, color: '#f5c542', apply: (m) => { m.mendAmount *= 1.6; } },
  { id: 'thimble', name: 'Brass Thimble', text: '+1 max spool, heal 2', max: 3, color: '#c98d17', apply: (m, run) => { m.hp += 1; if (run) run.player.hp = Math.min(m.hp, run.player.hp + 2); } },
  { id: 'swift', name: 'Swift Needle', text: 'Move 12% faster', max: 3, color: '#2f8178', apply: (m) => { m.speed *= 1.12; } },
  { id: 'ricochet', name: 'Bent Pins', text: 'Pins bounce off one more foe', max: 2, color: '#9c7bb0', apply: (m) => { m.bounce += 1; } },
  { id: 'pierce', name: 'Hatpins', text: 'Pins pierce one more foe', max: 2, color: '#5e4170', apply: (m) => { m.pierce += 1; } },
  { id: 'barbed', name: 'Barbed Thread', text: 'Your thread stings foes that cross it', max: 3, color: '#e0473a', apply: (m) => { m.barbed += 18; } },
  { id: 'buttons', name: 'Button Guard', text: 'A button orbits you and blocks shots', max: 3, color: '#2b4166', apply: (m) => { m.buttons += 1; } },
  { id: 'snip', name: 'Quick Snip', text: 'Dash recharges 30% faster', max: 2, color: '#94b283', apply: (m) => { m.dashCooldown *= 0.7; } },
  { id: 'golden', name: 'Golden Eye', text: '+15% chance of a triple-damage pin', max: 3, color: '#f5c542', apply: (m) => { m.critChance += 0.15; } },
];

const BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export function upgradeById(id) {
  return BY_ID.get(id);
}

/** The player's numbers with every owned notion applied, from the base stats up. */
export function computeMods(owned) {
  const mods = { ...PLAYER_BASE };
  for (const [id, level] of Object.entries(owned)) {
    const upgrade = BY_ID.get(id);
    for (let i = 0; i < level; i += 1) upgrade.apply(mods, null);
  }
  return mods;
}

/** Three different notions the player does not yet have at their maximum. */
export function draftUpgrades(rng, owned) {
  const pool = UPGRADES.filter((u) => (owned[u.id] ?? 0) < u.max);
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    picks.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  }
  return picks;
}

/** Takes a notion: records it, recomputes the numbers and applies its one-off effect (a heal). */
export function takeUpgrade(run, id) {
  run.owned[id] = (run.owned[id] ?? 0) + 1;
  run.mods = computeMods(run.owned);
  const upgrade = BY_ID.get(id);
  if (id === 'thimble') run.player.hp = Math.min(run.mods.hp, run.player.hp + 2);
  run.stats.picks.push(upgrade.name);
  return upgrade;
}
