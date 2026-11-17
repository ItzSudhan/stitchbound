// Needles: the character you sew with. Each changes how a run plays, and all but the first are
// unlocked by what you achieve across runs (meta/progress.js keeps the tally).

export const NEEDLES = [
  { id: 'steel', name: 'Steel Needle', text: 'Balanced: the trusty sharp', color: '#d9dde3', unlock: null, apply: () => {} },
  {
    id: 'darning', name: 'Darning Needle', text: 'Thread +40%, loops darn +50%, pins -25%', color: '#e3a83b',
    unlock: { key: 'loops', at: 40, text: 'Close 40 loops' },
    apply: (m) => { m.threadLength *= 1.4; m.mendAmount *= 1.5; m.pinDamage *= 0.75; },
  },
  {
    id: 'embroidery', name: 'Embroidery Needle', text: 'Starts with twin pins, one spool fewer', color: '#ef9a92',
    unlock: { key: 'bestNight', at: 5, text: 'Reach night 5' },
    apply: (m) => { m.pinCount += 1; m.hp -= 1; },
  },
  {
    id: 'bodkin', name: 'Bodkin', text: '7 spools, pins +30%, moves 12% slower', color: '#a07a52',
    unlock: { key: 'wyrmBeaten', at: 1, text: 'Beat the Yarn Wyrm' },
    apply: (m) => { m.hp += 2; m.pinDamage *= 1.3; m.speed *= 0.88; },
  },
  {
    id: 'golden', name: 'Golden Needle', text: '+15% crits, +30% sequins, starts with a relic', color: '#f5c542',
    unlock: { key: 'wins', at: 1, text: 'Save the quilt once' },
    startRelic: true,
    apply: (m) => { m.critChance += 0.15; m.sequinBonus *= 1.3; },
  },
];

export function needleById(id) {
  return NEEDLES.find((n) => n.id === id) ?? NEEDLES[0];
}

export function isUnlocked(needle, progress) {
  return !needle.unlock || (progress[needle.unlock.key] ?? 0) >= needle.unlock.at;
}
