// All sound is synthesised with WebAudio, no files: a pluck, a thud or a zip for every action,
// and a small folk tune of plucked strings (calm by night, driving for a boss). The audio
// context starts on the first click or key press, as browsers require.

const SCALE = [0, 3, 5, 7, 10];
const CHORDS = [57, 53, 48, 55];
const MELODY = [0, 2, 4, 2, 3, 1, 2, -1, 4, 3, 2, 0, 1, 2, 0, -1];

function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let sfx = null;
  let music = null;
  let muted = false;
  let mode = null;
  let nextNote = 0;
  let step = 0;
  let timer = null;
  const lastPlayed = new Map();

  function ensure() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
      sfx = ctx.createGain();
      sfx.gain.value = 0.55;
      sfx.connect(master);
      music = ctx.createGain();
      music.gain.value = 0.22;
      music.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, { type = 'triangle', dur = 0.15, vol = 0.3, slide = 0, attack = 0.004, at = 0, bus = sfx } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.15, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', at = 0, bus = sfx } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    src.start(t);
  }

  const SOUNDS = {
    shoot: () => tone(1400, { type: 'square', dur: 0.05, vol: 0.05, slide: 0.6 }),
    hit: (e) => tone(e.boss ? 160 : 260, { type: 'triangle', dur: 0.07, vol: 0.12, slide: 0.5 }),
    kill: () => {
      tone(520, { dur: 0.09, vol: 0.18, slide: 1.8 });
      noise({ dur: 0.08, vol: 0.12, freq: 3000 });
    },
    cinch: (e) => {
      noise({ dur: 0.25, vol: 0.25, freq: 2400, q: 3, type: 'bandpass' });
      const notes = [0, 4, 7, 12, 16].slice(0, 2 + Math.min(3, e.caught));
      notes.forEach((n, i) => tone(midi(72 + n), { type: 'triangle', dur: 0.22, vol: 0.2, at: i * 0.05 }));
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
    phase: () => [0, 3, 6].forEach((n, i) => tone(midi(50 + n), { type: 'sawtooth', dur: 0.5, vol: 0.12, at: i * 0.12 })),
    bossDie: () => {
      noise({ dur: 1.2, vol: 0.35, freq: 600, type: 'lowpass' });
      [0, 4, 7, 12].forEach((n, i) => tone(midi(60 + n), { dur: 0.5, vol: 0.18, at: i * 0.1 }));
    },
    waveStart: () => [0, 7].forEach((n, i) => tone(midi(69 + n), { type: 'sine', dur: 0.6, vol: 0.2, at: i * 0.18 })),
    bossWave: () => [0, -1, -5].forEach((n, i) => tone(midi(45 + n), { type: 'sawtooth', dur: 0.6, vol: 0.14, at: i * 0.25 })),
    waveClear: () => [0, 4, 7, 12].forEach((n, i) => tone(midi(67 + n), { dur: 0.3, vol: 0.18, at: i * 0.08 })),
    pick: () => [0, 7, 12].forEach((n, i) => tone(midi(76 + n), { type: 'sine', dur: 0.3, vol: 0.18, at: i * 0.06 })),
    hover: () => tone(1200, { type: 'sine', dur: 0.04, vol: 0.05 }),
    start: () => [0, 4, 7, 12, 16].forEach((n, i) => tone(midi(64 + n), { dur: 0.25, vol: 0.18, at: i * 0.06 })),
    lose: () => [7, 3, 0, -5].forEach((n, i) => tone(midi(57 + n), { type: 'triangle', dur: 0.45, vol: 0.2, at: i * 0.22 })),
    win: () => [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => tone(midi(64 + n), { dur: 0.35, vol: 0.2, at: i * 0.11 })),
    pause: () => tone(600, { type: 'sine', dur: 0.12, vol: 0.12 }),
    pickup: () => [0, 5, 9].forEach((n, i) => tone(midi(79 + n), { type: 'sine', dur: 0.18, vol: 0.16, at: i * 0.04 })),
    dawn: () => [0, 4, 7].forEach((n, i) => tone(midi(72 + n), { type: 'sine', dur: 0.5, vol: 0.12, at: 0.3 + i * 0.1 })),
  };

  /** One bar's worth of the tune: a plucked bass on the chord root and a pentatonic melody. */
  function scheduleMusic() {
    if (!ctx || !mode) return;
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
    unlock: ensure,
    play(type, event = {}) {
      if (!ctx || muted) return;
      const now = ctx.currentTime;
      if (now - (lastPlayed.get(type) ?? -1) < 0.03) return;
      lastPlayed.set(type, now);
      SOUNDS[type]?.(event);
    },
    setMusic(next) {
      if (next === mode) return;
      mode = next;
      if (!ctx) return;
      nextNote = ctx.currentTime + 0.05;
      step = 0;
      if (!timer) timer = window.setInterval(scheduleMusic, 90);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
