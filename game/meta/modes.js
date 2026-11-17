// Game modes, chosen on the title screen. Classic: a fresh seeded quilt and road every run, ten
// nights. Daily Seam: today's seed, the same quilt and road for everyone, with its own best.
// Endless: the road never ends; the bosses come back stronger every five nights.

export const MODES = [
  { id: 'classic', name: 'Classic', text: 'Ten nights. A new quilt and road every run.', endless: false, daily: false },
  { id: 'daily', name: 'Daily Seam', text: "Today's quilt and road: the same for everyone.", endless: false, daily: true },
  { id: 'endless', name: 'Endless', text: 'The road never ends. How far can you sew?', endless: true, daily: false },
];

export function modeById(id) {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

/** The UTC day as a key, e.g. "2026-11-17". */
export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** The seed a run of this mode starts from (a fixed ?seed= in the address wins). */
export function seedForMode(mode, fixedSeed, date = new Date()) {
  if (fixedSeed !== null) return fixedSeed;
  if (mode.daily) return Number(dayKey(date).replaceAll('-', ''));
  return Math.floor(Math.random() * 4294967296);
}
