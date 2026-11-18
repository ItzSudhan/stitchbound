// Synergies: named combinations. When the run holds every notion level and relic a synergy
// needs, it switches on and adds an effect of its own on top of its parts. The draft shows
// which card would complete one, so builds are something to aim for.

export const SYNERGIES = [
  { id: 'pinstorm', name: 'Pinstorm', text: 'Every 5th volley also fires a ring of pins', needs: { notions: { twin: 2, quick: 1 } }, apply: (m) => { m.ringEvery = 5; } },
  { id: 'barbedWire', name: 'Barbed Wire', text: 'Barbed thread stings 2.5x as hard', needs: { notions: { barbed: 1, wax: 1 } }, apply: (m) => { m.barbed *= 2.5; } },
  { id: 'ripstop', name: 'Ripstop', text: 'Dash cuts twice as deep and recharges faster', needs: { notions: { ripper: 1, snip: 1 } }, apply: (m) => { m.dashDamage *= 2; m.dashCooldown *= 0.6; } },
  { id: 'hedgehog', name: 'Hedgehog', text: 'Getting hurt fires twice the pins; pins pierce', needs: { notions: { heart: 1, pierce: 1 } }, apply: (m) => { m.hurtPins *= 2; m.pierce += 1; } },
  { id: 'seamstress', name: "Seamstress's Rhythm", text: 'Pins hit 25% harder and fly faster', needs: { notions: { steel: 2, quick: 2 } }, apply: (m) => { m.pinDamage *= 1.25; m.pinSpeed *= 1.2; } },
  { id: 'patchGuard', name: 'Patch Guard', text: 'Guard buttons hit 3x; loops darn 30% more', needs: { notions: { buttons: 1, mend: 1 } }, apply: (m) => { m.buttonDamage *= 3; m.mendAmount *= 1.3; } },
  { id: 'goldenHour', name: 'Golden Hour', text: 'Critical pins deal 5x instead of 3x', needs: { notions: { golden: 1 }, relics: ['crookedPin'] }, apply: (m) => { m.critMult = 5; } },
  { id: 'darningMaster', name: 'Darning Master', text: 'A loop that catches 3+ pests heals a spool', needs: { notions: { mend: 1 }, relics: ['darningEgg'] }, apply: (m) => { m.loopHeal = true; } },
  { id: 'buttonFortress', name: 'Button Fortress', text: '+2 guard buttons', needs: { notions: { buttons: 1 }, relics: ['ironThimble'] }, apply: (m) => { m.buttons += 2; } },
  { id: 'longHaul', name: 'Long Haul', text: 'Loops cinch 30% harder and darn 50% more', needs: { notions: { spool: 2 }, relics: ['tapeMeasure'] }, apply: (m) => { m.loopDamage *= 1.3; m.mendAmount *= 1.5; } },
  { id: 'tightWeave', name: 'Tight Weave', text: 'Cinch shockwaves hit twice as hard', needs: { notions: { wax: 1 }, relics: ['hoop'] }, apply: (m) => { m.hoopWave *= 2; } },
  { id: 'cradleSong', name: 'Cradle Song', text: 'Co-op: every bound loop sends out a shockwave', needs: { notions: { wax: 1 }, relics: ['catsCradle'] }, apply: (m) => { m.boundWave += 60; } },
];

export function synergyById(id) {
  return SYNERGIES.find((s) => s.id === id);
}

/** Does a set of owned notion levels and relics meet this synergy's needs? */
export function synergyMet(synergy, owned, relics) {
  const notions = synergy.needs.notions ?? {};
  for (const [id, level] of Object.entries(notions)) if ((owned[id] ?? 0) < level) return false;
  for (const id of synergy.needs.relics ?? []) if (!relics.includes(id)) return false;
  return true;
}

export function activeSynergies(owned, relics) {
  return SYNERGIES.filter((s) => synergyMet(s, owned, relics));
}

/** The synergies that taking one more level of a notion (or a relic) would switch on. */
export function synergiesCompletedBy(owned, relics, { notion = null, relic = null }) {
  const nextOwned = notion ? { ...owned, [notion]: (owned[notion] ?? 0) + 1 } : owned;
  const nextRelics = relic ? [...relics, relic] : relics;
  return SYNERGIES.filter((s) => !synergyMet(s, owned, relics) && synergyMet(s, nextOwned, nextRelics));
}
