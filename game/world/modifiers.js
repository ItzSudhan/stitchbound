// Night modifiers: the weather of a night on the quilt road. The road rolls them when it is
// generated, so the map shows them before you choose. Some help, some hurt; elite nights always
// carry a harsh one. A modifier changes the night's own numbers (`night`) or the needle's (`mods`).

export const MODIFIERS = [
  { id: 'fullMoon', name: 'Full Moon', text: 'Moths fly 30% faster', tone: 'bad', night: { mothSpeed: 1.3 } },
  { id: 'swarm', name: 'Swarm', text: '50% more moths, each frailer', tone: 'bad', night: { swarm: 1.5, mothHp: 0.7 } },
  { id: 'damp', name: 'Damp Night', text: 'Your thread is 20% shorter', tone: 'bad', mods: { threadLength: 0.8 } },
  { id: 'newMoon', name: 'New Moon', text: 'Pests 25% sturdier, worth 25% more', tone: 'bad', night: { hpScale: 1.25, scoreScale: 1.25 } },
  { id: 'gale', name: 'Gale', text: "Pests' shots fly 25% faster", tone: 'bad', night: { shotSpeed: 1.25 } },
  { id: 'frost', name: 'Frost', text: 'All pests move 15% slower', tone: 'good', night: { speedScale: 0.85 } },
  { id: 'silk', name: 'Silk Night', text: 'Loops darn twice as much', tone: 'good', mods: { mendAmount: 2 } },
  { id: 'harvest', name: 'Sequin Harvest', text: 'Pests drop 60% more sequins', tone: 'good', night: { sequinScale: 1.6 } },
];

const HARSH = MODIFIERS.filter((m) => m.tone === 'bad');

/** Rolls the weather for a node of the road: none, any, or (for an elite) always a harsh one. */
export function rollModifier(rng, depth, type) {
  if (type === 'elite') return rng.pick(HARSH).id;
  if (type !== 'fight' || depth < 2) return null;
  return rng.chance(0.55) ? rng.pick(MODIFIERS).id : null;
}

export function modifierById(id) {
  return MODIFIERS.find((m) => m.id === id) ?? null;
}

/** Multiplies the needle's numbers by the night's modifier, if it touches them. */
export function applyModifierToMods(mods, modifierId) {
  const mod = modifierById(modifierId);
  if (!mod || !mod.mods) return;
  for (const [key, factor] of Object.entries(mod.mods)) mods[key] *= factor;
}
