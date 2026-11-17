// Relics: rare keepsakes from sewing boxes, elite nights, bosses, the peddler and mystery events.
// Unlike notions they do not stack; each changes the run in its own way, and several complete
// named synergies with notions (items/synergies.js).

export const RELICS = [
  { id: 'ironThimble', name: 'Iron Thimble', text: 'Blocks the first hit of every night', color: '#8a919c', apply: (m) => { m.nightShield += 1; } },
  { id: 'mothBalls', name: 'Moth Balls', text: 'Moths fly 20% slower', color: '#e8e1cf', apply: (m) => { m.mothSlow *= 0.8; } },
  { id: 'luckyButton', name: 'Lucky Button', text: '+40% sequins from every pest', color: '#e3a83b', apply: (m) => { m.sequinBonus *= 1.4; } },
  { id: 'needleCase', name: 'Needle Case', text: 'Notion drafts offer 4 cards', color: '#cf6a43', apply: (m) => { m.draftSize = 4; } },
  { id: 'beeswax', name: 'Beeswax Block', text: 'Loops cinch 40% harder', color: '#f5c542', apply: (m) => { m.loopDamage *= 1.4; } },
  { id: 'tapeMeasure', name: 'Tape Measure', text: 'Thread 25% longer', color: '#e9c46a', apply: (m) => { m.threadLength *= 1.25; } },
  { id: 'pinBox', name: 'Box of Pins', text: '+1 pin in every volley', color: '#6f8fb3', apply: (m) => { m.pinCount += 1; } },
  { id: 'darningEgg', name: 'Darning Egg', text: 'Loops darn 80% more cloth', color: '#d9a5b3', apply: (m) => { m.mendAmount *= 1.8; } },
  { id: 'hoop', name: 'Quilting Hoop', text: 'Every cinch sends out a shockwave', color: '#c98d17', apply: (m) => { m.hoopWave += 35; } },
  { id: 'seamGauge', name: 'Seam Gauge', text: 'Dash recharges 30% faster', color: '#2f8178', apply: (m) => { m.dashCooldown *= 0.7; } },
  { id: 'locket', name: 'Heirloom Locket', text: 'Heirloom bonuses are doubled', color: '#7a3a68', apply: (m) => { m.heirloomBonus *= 2; } },
  { id: 'crookedPin', name: 'Crooked Pin', text: '+12% chance of a critical pin', color: '#9c7bb0', apply: (m) => { m.critChance += 0.12; } },
  { id: 'teaTin', name: 'Tin of Tea', text: '+1 max spool; rests heal 1 more', color: '#94b283', apply: (m) => { m.hp += 1; m.restHeal += 1; } },
];

const BY_ID = new Map(RELICS.map((r) => [r.id, r]));

export function relicById(id) {
  return BY_ID.get(id);
}

/** Up to `count` relics the player does not own yet. */
export function draftRelics(rng, owned, count = 3) {
  const pool = RELICS.filter((r) => !owned.includes(r.id));
  const picks = [];
  while (picks.length < count && pool.length > 0) picks.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return picks;
}
