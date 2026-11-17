// One synthesised sound for every game event: pins, hits, kills, the loop's rising zip, hurts,
// dashes, snips, bosses, dawn, picks, purchases, synergies and the road.
import { midi } from './synth.js';

export function soundTable({ tone, noise }) {
  const chord = (notes, base, opts, gap) => notes.forEach((n, i) => tone(midi(base + n), { ...opts, at: (opts.at ?? 0) + i * gap }));
  return {
    shoot: () => tone(1400, { type: 'square', dur: 0.05, vol: 0.05, slide: 0.6 }),
    hit: (e) => tone(e.boss ? 160 : 260, { type: 'triangle', dur: 0.07, vol: 0.12, slide: 0.5 }),
    kill: () => {
      tone(520, { dur: 0.09, vol: 0.18, slide: 1.8 });
      noise({ dur: 0.08, vol: 0.12, freq: 3000 });
    },
    cinch: (e) => {
      noise({ dur: 0.25, vol: 0.25, freq: 2400, q: 3, type: 'bandpass' });
      chord([0, 4, 7, 12, 16].slice(0, 2 + Math.min(3, e.caught)), 72, { type: 'triangle', dur: 0.22, vol: 0.2 }, 0.05);
    },
    hurt: () => {
      tone(140, { type: 'sawtooth', dur: 0.3, vol: 0.2, slide: 0.4 });
      noise({ dur: 0.2, vol: 0.2, freq: 400, type: 'lowpass' });
    },
    dash: () => noise({ dur: 0.18, vol: 0.18, freq: 1800, q: 0.7, type: 'highpass' }),
    snip: () => {
      noise({ dur: 0.05, vol: 0.3, freq: 5000, type: 'highpass' });
      noise({ dur: 0.05, vol: 0.3, freq: 5000, type: 'highpass', at: 0.07 });
    },
    block: () => tone(900, { type: 'square', dur: 0.05, vol: 0.06 }),
    nibble: () => noise({ dur: 0.04, vol: 0.05, freq: 2600, q: 6 }),
    patchLost: () => tone(220, { type: 'triangle', dur: 0.3, vol: 0.15, slide: 0.5 }),
    windup: () => tone(300, { type: 'sawtooth', dur: 0.4, vol: 0.05, slide: 1.6 }),
    enemyShoot: () => noise({ dur: 0.12, vol: 0.1, freq: 900, q: 2 }),
    summon: () => tone(200, { type: 'sine', dur: 0.5, vol: 0.12, slide: 2 }),
    roar: () => {
      tone(90, { type: 'sawtooth', dur: 0.9, vol: 0.2, slide: 0.6 });
      noise({ dur: 0.7, vol: 0.15, freq: 300, type: 'lowpass' });
    },
    phase: () => chord([0, 3, 6], 50, { type: 'sawtooth', dur: 0.5, vol: 0.12 }, 0.12),
    bossDie: () => {
      noise({ dur: 1.2, vol: 0.35, freq: 600, type: 'lowpass' });
      chord([0, 4, 7, 12], 60, { dur: 0.5, vol: 0.18 }, 0.1);
    },
    waveStart: () => chord([0, 7], 69, { type: 'sine', dur: 0.6, vol: 0.2 }, 0.18),
    bossWave: () => chord([0, -1, -5], 45, { type: 'sawtooth', dur: 0.6, vol: 0.14 }, 0.25),
    waveClear: () => chord([0, 4, 7, 12], 67, { dur: 0.3, vol: 0.18 }, 0.08),
    pick: () => chord([0, 7, 12], 76, { type: 'sine', dur: 0.3, vol: 0.18 }, 0.06),
    hover: () => tone(1200, { type: 'sine', dur: 0.04, vol: 0.05 }),
    start: () => chord([0, 4, 7, 12, 16], 64, { dur: 0.25, vol: 0.18 }, 0.06),
    lose: () => chord([7, 3, 0, -5], 57, { type: 'triangle', dur: 0.45, vol: 0.2 }, 0.22),
    win: () => chord([0, 4, 7, 12, 7, 12, 16, 19], 64, { dur: 0.35, vol: 0.2 }, 0.11),
    pause: () => tone(600, { type: 'sine', dur: 0.12, vol: 0.12 }),
    pickup: () => chord([0, 5, 9], 79, { type: 'sine', dur: 0.18, vol: 0.16 }, 0.04),
    dawn: () => chord([0, 4, 7], 72, { type: 'sine', dur: 0.5, vol: 0.12, at: 0.3 }, 0.1),
    buy: () => {
      noise({ dur: 0.06, vol: 0.15, freq: 6000, type: 'highpass' });
      chord([0, 12], 84, { type: 'square', dur: 0.12, vol: 0.06 }, 0.07);
    },
    deny: () => tone(150, { type: 'square', dur: 0.15, vol: 0.08 }),
    synergy: () => chord([0, 4, 7, 11, 14, 19], 67, { type: 'triangle', dur: 0.4, vol: 0.16 }, 0.07),
    map: () => noise({ dur: 0.3, vol: 0.08, freq: 800, q: 0.5, type: 'lowpass' }),
    event: () => chord([0, 3, 7], 62, { type: 'sine', dur: 0.4, vol: 0.14 }, 0.1),
    select: () => tone(700, { type: 'triangle', dur: 0.06, vol: 0.1 }),
  };
}
