// The audio mixer, the game's one audio front door: starts the synthesiser on the first click or
// key (as browsers require), plays the effect for each game event (rate-limited per kind), picks
// the music for the moment, and mutes.
import { createSynth } from './synth.js';
import { soundTable } from './sfx.js';
import { createMusic } from './music.js';

export function createAudio() {
  let synth = null;
  let sounds = null;
  let music = null;
  let muted = false;
  let wanted = null;
  const lastPlayed = new Map();

  function ensure() {
    if (!synth) {
      synth = createSynth();
      if (!synth) return false;
      sounds = soundTable(synth);
      music = createMusic(synth);
      synth.master.gain.value = muted ? 0 : 0.8;
      if (wanted) music.setMode(wanted);
    }
    if (synth.ctx.state === 'suspended') synth.ctx.resume();
    return true;
  }

  return {
    unlock: ensure,
    play(type, event = {}) {
      if (!synth || muted) return;
      const now = synth.ctx.currentTime;
      if (now - (lastPlayed.get(type) ?? -1) < 0.03) return;
      lastPlayed.set(type, now);
      sounds[type]?.(event);
    },
    setMusic(mode) {
      wanted = mode;
      if (music) music.setMode(mode);
    },
    toggleMute() {
      muted = !muted;
      if (synth) synth.master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
