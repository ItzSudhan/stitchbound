// Notions: the sixteen stackable upgrades offered in the draft after every night and sold by the
// peddler. Each changes a number the rules read (run.mods); the draft never offers a maxed one.

export const NOTIONS = [
  { id: 'spool', name: 'Longer Spool', text: 'Thread +35% longer: wider loops', max: 4, color: '#d6333f', apply: (m) => { m.threadLength *= 1.35; } },
  { id: 'steel', name: 'Steel Pins', text: 'Pin damage +35%', max: 5, color: '#8a919c', apply: (m) => { m.pinDamage *= 1.35; } },
  { id: 'twin', name: 'Twin Pins', text: 'Fire one more pin per shot', max: 3, color: '#6f8fb3', apply: (m) => { m.pinCount += 1; } },
  { id: 'quick', name: 'Quick Fingers', text: 'Fire rate +25%', max: 4, color: '#e3a83b', apply: (m) => { m.fireDelay *= 0.8; } },
  { id: 'wax', name: 'Waxed Thread', text: 'Loops cinch +60% harder', max: 4, color: '#cf6a43', apply: (m) => { m.loopDamage *= 1.6; } },
  { id: 'mend', name: 'Darning Charm', text: 'Loops mend +60% more cloth', max: 3, color: '#f5c542', apply: (m) => { m.mendAmount *= 1.6; } },
  { id: 'thimble', name: 'Brass Thimble', text: '+1 max spool, heal 2', max: 3, color: '#c98d17', apply: (m) => { m.hp += 1; } },
  { id: 'swift', name: 'Swift Needle', text: 'Move 12% faster', max: 3, color: '#2f8178', apply: (m) => { m.speed *= 1.12; } },
  { id: 'ricochet', name: 'Bent Pins', text: 'Pins bounce off one more foe', max: 2, color: '#9c7bb0', apply: (m) => { m.bounce += 1; } },
  { id: 'pierce', name: 'Hatpins', text: 'Pins pierce one more foe', max: 2, color: '#5e4170', apply: (m) => { m.pierce += 1; } },
  { id: 'barbed', name: 'Barbed Thread', text: 'Your thread stings foes that cross it', max: 3, color: '#e0473a', apply: (m) => { m.barbed += 18; } },
  { id: 'buttons', name: 'Button Guard', text: 'A button orbits you and blocks shots', max: 3, color: '#2b4166', apply: (m) => { m.buttons += 1; } },
  { id: 'snip', name: 'Quick Snip', text: 'Dash recharges 30% faster', max: 2, color: '#94b283', apply: (m) => { m.dashCooldown *= 0.7; } },
  { id: 'golden', name: 'Golden Eye', text: '+15% chance of a critical pin', max: 3, color: '#f5c542', apply: (m) => { m.critChance += 0.15; } },
  { id: 'ripper', name: 'Seam Ripper', text: 'Your snip-dash cuts through pests', max: 2, color: '#b5c99a', apply: (m) => { m.dashDamage += 45; } },
  { id: 'heart', name: 'Pincushion Heart', text: 'When hit, burst a ring of 12 pins', max: 2, color: '#ef9a92', apply: (m) => { m.hurtPins += 12; } },
];

const BY_ID = new Map(NOTIONS.map((n) => [n.id, n]));

export function notionById(id) {
  return BY_ID.get(id);
}

/** `size` different notions the player does not yet have at their maximum. */
export function draftNotions(rng, owned, size = 3) {
  const pool = NOTIONS.filter((n) => (owned[n.id] ?? 0) < n.max);
  const picks = [];
  while (picks.length < size && pool.length > 0) picks.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return picks;
}
