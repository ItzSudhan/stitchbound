// The WebAudio synthesiser every sound is made with: an audio context with master, effects and
// music buses, and two voices: a shaped oscillator tone and a filtered noise burst.

export function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export function createSynth() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.55;
  sfx.connect(master);
  const music = ctx.createGain();
  music.gain.value = 0.22;
  music.connect(master);

  function tone(freq, { type = 'triangle', dur = 0.15, vol = 0.3, slide = 0, attack = 0.004, at = 0, bus = sfx } = {}) {
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

  return { ctx, master, sfx, music, tone, noise };
}
