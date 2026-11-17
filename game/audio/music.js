// The soundtrack: a little folk tune of plucked strings over a chord loop, calm on the road and
// in ordinary nights, driving (faster, lower, with a brushed beat) when a boss is out.
import { midi } from './synth.js';

const SCALE = [0, 3, 5, 7, 10];
const CHORDS = [57, 53, 48, 55];
const MELODY = [0, 2, 4, 2, 3, 1, 2, -1, 4, 3, 2, 0, 1, 2, 0, -1];

export function createMusic(synth) {
  let mode = null;
  let nextNote = 0;
  let step = 0;
  let timer = null;

  function schedule() {
    if (!mode) return;
    const { ctx, tone, noise, music } = synth;
    const boss = mode === 'boss';
    const beat = boss ? 0.2 : 0.27;
    while (nextNote < ctx.currentTime + 0.3) {
      const at = nextNote - ctx.currentTime;
      const chord = CHORDS[Math.floor(step / 16) % CHORDS.length] - (boss ? 12 : 0);
      if (step % 4 === 0) tone(midi(chord - 12), { type: boss ? 'sawtooth' : 'triangle', dur: beat * 3, vol: boss ? 0.16 : 0.22, at, bus: music });
      const m = MELODY[step % 16];
      if (m >= 0 && (boss || step % 2 === 0)) {
        const degree = SCALE[m % SCALE.length] + 12 * Math.floor(m / SCALE.length);
        tone(midi(chord + 12 + degree), { type: 'triangle', dur: beat * 1.6, vol: 0.14, at, bus: music });
      }
      if (boss && step % 2 === 0) noise({ dur: 0.05, vol: step % 8 === 4 ? 0.2 : 0.08, freq: step % 8 === 4 ? 1800 : 7000, at, bus: music });
      nextNote += beat;
      step += 1;
    }
  }

  return {
    setMode(next) {
      if (next === mode) return;
      mode = next;
      nextNote = synth.ctx.currentTime + 0.05;
      step = 0;
      if (!timer) timer = window.setInterval(schedule, 90);
    },
  };
}
