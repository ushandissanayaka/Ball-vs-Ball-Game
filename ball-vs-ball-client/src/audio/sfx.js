import { audioContext, buses, duckMusic, sharedNoise } from './engine.js';
import { playSample } from './samples.js';

// Every sound effect, made from oscillators and filtered noise. Each ball has its own voice: the vampire bites
// and slurps, the spider's web thwips and splats, the laser pews, electricity crackles, the axe whooshes and
// clangs... and its own victory jingle. Effects turn the music down while they play (footsteps don't: they would
// keep it down the whole walk). Fights throw out many events at once, so each sound has a minimum gap and only
// so many play together.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

const lastPlayed = new Map();
/** False if `key` played less than `ms` ago (so a burst of identical events makes one sound). */
function gap(key, ms) {
  const now = performance.now();
  if (now - (lastPlayed.get(key) ?? -1e9) < ms) return false;
  lastPlayed.set(key, now);
  return true;
}

let playing = 0;
const MAX_VOICES = 28;

/**
 * Where a sound goes: panned (-1 left .. 1 right), with some of it sent into the reverb. Returns null (play
 * nothing) when there is no sound yet or too much is already playing.
 */
function output(ctx, { pan = 0, reverb = 0.15, life = 1 }) {
  if (playing >= MAX_VOICES) return null;
  playing += 1;
  setTimeout(() => { playing -= 1; }, life * 1000);
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  panner.connect(buses().sfxBus);
  if (reverb) {
    const send = ctx.createGain();
    send.gain.value = reverb;
    panner.connect(send).connect(buses().reverbIn);
  }
  return panner;
}

/** A pitched note sliding from `f0` to `f1`, rising in `attack` and dying away over `dur`. */
function tone(ctx, dest, { at = ctx.currentTime, type = 'sine', f0, f1 = f0, dur, gain, attack = 0.005, slide = dur, filter, q = 0.7 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + slide);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let node = osc;
  if (filter) {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = filter;
    lowpass.Q.value = q;
    node = node.connect(lowpass);
  }
  node.connect(amp).connect(dest);
  osc.start(at);
  osc.stop(at + dur + 0.05);
  return osc;
}

/** Filtered noise: `type` filter sweeping from `f0` to `f1`, rising in `attack` and dying away over `dur`. */
function noise(ctx, dest, { at = ctx.currentTime, dur, gain, type = 'bandpass', f0, f1 = f0, q = 1, attack = 0.003 }) {
  const source = ctx.createBufferSource();
  source.buffer = sharedNoise();
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) filter.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  source.connect(filter).connect(amp).connect(dest);
  source.start(at, Math.random() * 1.4, dur + 0.05);
  return amp;
}

/** Struck metal: a few out-of-tune partials ringing at different lengths. */
function metal(ctx, dest, { at = ctx.currentTime, base, dur, gain }) {
  [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
    tone(ctx, dest, { at, type: 'sine', f0: base * ratio, dur: dur / (1 + i * 0.6), gain: gain / (1 + i * 0.7), attack: 0.001 });
  });
}

/** Wobbles a gain up and down `rate` times a second (a slurp, a buzz). */
function tremolo(ctx, amp, { at, dur, rate, depth }) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(amp.gain);
  lfo.start(at);
  lfo.stop(at + dur);
}

/** Plays `recipe(ctx, out, t)` if sound is on and there's room; ducks the music by `duck` (1 = not at all). */
function play(recipe, { pan = 0, reverb = 0.15, life = 1.2, duck = 0.45, duckFor = life } = {}) {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'running') return;
  const out = output(ctx, { pan, reverb, life });
  if (!out) return;
  recipe(ctx, out, ctx.currentTime + 0.005);
  if (duck < 1) duckMusic(duck, duckFor);
}

// ---- Interface --------------------------------------------------------------------------------------------

/** A soft, bubbly pop for every button. */
export const clickSound = () => gap('click', 40) && play((ctx, out, t) => {
  tone(ctx, out, { at: t, f0: 520, f1: 1180, slide: 0.035, dur: 0.11, gain: 0.22 });
  tone(ctx, out, { at: t, type: 'triangle', f0: 2400, dur: 0.035, gain: 0.04 });
}, { reverb: 0.06, life: 0.2, duck: 0.75, duckFor: 0.2 });

/** A window opening (the ball choice): a sparkle running up and a soft whoosh. */
export const popupSound = () => gap('popup', 300) && play((ctx, out, t) => {
  noise(ctx, out, { at: t, dur: 0.3, gain: 0.07, f0: 500, f1: 3500, q: 0.9, attack: 0.08 });
  [72, 76, 79, 84, 88].forEach((note, i) => {
    tone(ctx, out, { at: t + 0.05 + i * 0.055, f0: midi(note), dur: 0.5, gain: 0.09 });
    tone(ctx, out, { at: t + 0.05 + i * 0.055, f0: midi(note) * 3, dur: 0.18, gain: 0.015 });
  });
}, { reverb: 0.4, life: 1, duck: 0.45 });

/** The balls appearing in the box: two bubbly pops (left, right) and a shimmer. */
export const ballsAppearSound = () => gap('appear', 500) && play((ctx, out, t) => {
  tone(ctx, out, { at: t, f0: 260, f1: 880, slide: 0.07, dur: 0.18, gain: 0.25 });
  tone(ctx, out, { at: t + 0.14, f0: 330, f1: 1050, slide: 0.07, dur: 0.18, gain: 0.25 });
  [84, 88, 91, 96].forEach((note, i) => tone(ctx, out, { at: t + 0.25 + i * 0.04, f0: midi(note), dur: 0.35, gain: 0.03 }));
}, { reverb: 0.35, life: 0.9 });

/** The countdown: a beep for 3, 2, 1 and a brighter one with a whoosh for go (`n` 0). */
export const countdownSound = (n) => play((ctx, out, t) => {
  if (n > 0) {
    tone(ctx, out, { at: t, type: 'triangle', f0: 784, dur: 0.22, gain: 0.18 });
  } else {
    tone(ctx, out, { at: t, type: 'triangle', f0: 1175, dur: 0.5, gain: 0.2 });
    tone(ctx, out, { at: t, type: 'sawtooth', f0: 587, dur: 0.4, gain: 0.04, filter: 2000 });
    noise(ctx, out, { at: t, dur: 0.45, gain: 0.08, f0: 400, f1: 4000, attack: 0.05 });
  }
}, { reverb: 0.25, life: 0.6, duck: 0.5 });

/** A reward landing: a few bright coin chimes. */
export const coinSound = () => gap('coin', 120) && play((ctx, out, t) => {
  [[88, 0], [93, 0.07], [96, 0.14]].forEach(([note, dt]) => {
    tone(ctx, out, { at: t + dt, type: 'square', f0: midi(note), dur: 0.18, gain: 0.055, filter: 5000 });
    tone(ctx, out, { at: t + dt, f0: midi(note) * 2, dur: 0.25, gain: 0.07 });
  });
}, { reverb: 0.3, life: 0.6 });

/** A crate prize: bigger and brighter the rarer it is. */
export const revealSound = (rarity) => play((ctx, out, t) => {
  const level = { uncommon: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 }[rarity] ?? 1;
  noise(ctx, out, { at: t, dur: 0.5, gain: 0.08, f0: 300, f1: 5000, attack: 0.3 });
  const notes = [72, 76, 79, 84, 88, 91, 96].slice(0, 3 + level);
  notes.forEach((note, i) => {
    tone(ctx, out, { at: t + 0.3 + i * 0.06, type: 'triangle', f0: midi(note), dur: 0.7, gain: 0.08 });
    tone(ctx, out, { at: t + 0.3 + i * 0.06, f0: midi(note) * 2, dur: 0.4, gain: 0.02 });
  });
  if (level >= 3) tone(ctx, out, { at: t + 0.3, type: 'sawtooth', f0: midi(48), dur: 1.2, gain: 0.06, filter: 900 });
}, { reverb: 0.5, life: 1.6, duck: 0.35 });

// ---- The player ---------------------------------------------------------------------------------------------

let foot = 0;
/** One footfall; `speed` 0..1 (a jog lands harder than a stroll). Feet alternate a little left and right. */
export const footstepSound = (speed) => play((ctx, out, t) => {
  const weight = 0.45 + speed * 0.55;
  if (playSample(ctx, out, 'step', { at: t, gain: 0.2 * weight, rate: rand(0.92, 1.08) })) return;
  noise(ctx, out, { at: t, dur: 0.075, gain: 0.11 * weight, type: 'lowpass', f0: rand(700, 1050), q: 1.2 });
  noise(ctx, out, { at: t, dur: 0.03, gain: 0.03 * weight, type: 'highpass', f0: 3000 });
  tone(ctx, out, { at: t, f0: rand(95, 115), f1: 55, dur: 0.07, gain: 0.08 * weight });
}, { pan: (foot++ % 2 ? 0.12 : -0.12), reverb: 0.05, life: 0.15, duck: 1 });

export const jumpSound = () => play((ctx, out, t) => {
  noise(ctx, out, { at: t, dur: 0.22, gain: 0.1, f0: 350, f1: 1600, q: 1.5, attack: 0.04 });
  tone(ctx, out, { at: t, f0: 260, f1: 520, dur: 0.14, gain: 0.08 });
}, { reverb: 0.08, life: 0.3, duck: 0.85 });

export const landSound = () => play((ctx, out, t) => {
  if (playSample(ctx, out, 'step', { at: t, gain: 0.5, rate: 0.8 })) {
    playSample(ctx, out, 'thud', { at: t, gain: 0.18, rate: 0.85 });
    return;
  }
  noise(ctx, out, { at: t, dur: 0.12, gain: 0.16, type: 'lowpass', f0: 600 });
  tone(ctx, out, { at: t, f0: 110, f1: 45, dur: 0.14, gain: 0.14 });
}, { reverb: 0.06, life: 0.25, duck: 0.85 });

// ---- Ball abilities ---------------------------------------------------------------------------------------------

const SOUNDS = {
  /** Two balls crashing: a round thump and a plastic knock, harder with more power. */
  hit: (ctx, out, t, power = 1) => {
    const p = Math.min(1.6, 0.5 + power * 0.5);
    const rate = rand(0.9, 1.1) * (1.15 - Math.min(0.3, power * 0.12)); // harder hits sound heavier
    if (power < 0.5 ? playSample(ctx, out, 'tap', { at: t, gain: 0.12 + power * 0.3, rate: rand(0.9, 1.1) })
      : playSample(ctx, out, 'thud', { at: t, gain: 0.5 * p, rate })) {
      if (power > 1.1) playSample(ctx, out, 'smack', { at: t, gain: 0.16 * p, rate: rand(0.95, 1.05) });
      return;
    }
    tone(ctx, out, { at: t, f0: 170, f1: 55, dur: 0.2, gain: 0.3 * p });
    tone(ctx, out, { at: t, type: 'triangle', f0: rand(380, 460), f1: 300, dur: 0.07, gain: 0.08 * p });
    noise(ctx, out, { at: t, dur: 0.05, gain: 0.12 * p, type: 'lowpass', f0: 2800 });
  },
  wall: (ctx, out, t) => {
    if (playSample(ctx, out, 'tap', { at: t, gain: 0.12, rate: rand(1.1, 1.3) })) return;
    tone(ctx, out, { at: t, type: 'triangle', f0: 620, f1: 420, dur: 0.05, gain: 0.04 });
  },
  /** Vampire: a crunchy bite, then a long wet slurp and a gulp. */
  vampireBite: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.06, gain: 0.22, f0: 2600, q: 2 });
    tone(ctx, out, { at: t, f0: 300, f1: 140, dur: 0.06, gain: 0.12 });
    const slurp = noise(ctx, out, { at: t + 0.06, dur: 0.55, gain: 0.16, f0: 1500, f1: 320, q: 4, attack: 0.08 });
    tremolo(ctx, slurp, { at: t + 0.06, dur: 0.55, rate: 15, depth: 0.08 });
    tone(ctx, out, { at: t + 0.5, f0: 240, f1: 110, dur: 0.16, gain: 0.14 });
  },
  vampireDrink: (ctx, out, t) => {
    tone(ctx, out, { at: t, f0: 200, f1: 120, dur: 0.14, gain: 0.12 });
    tone(ctx, out, { at: t + 0.1, f0: midi(69), f1: midi(76), dur: 0.35, gain: 0.05 });
  },
  /** Snake: a sharp snap of the jaws and a long hiss. */
  snakeBite: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.05, gain: 0.18, f0: 2200, q: 2 });
    noise(ctx, out, { at: t + 0.03, dur: 0.5, gain: 0.1, type: 'highpass', f0: 4500, attack: 0.05 });
  },
  /** Spider: the web shooting out ("thwip") and landing with a sticky splat. */
  spiderShoot: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.12, gain: 0.14, type: 'highpass', f0: 5000, f1: 1800 });
    tone(ctx, out, { at: t, type: 'triangle', f0: 1500, f1: 380, dur: 0.12, gain: 0.08 });
  },
  spiderStick: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.16, gain: 0.14, type: 'lowpass', f0: 900, q: 2 });
    tone(ctx, out, { at: t, f0: 320, f1: 140, dur: 0.18, gain: 0.08 });
    tone(ctx, out, { at: t + 0.04, type: 'triangle', f0: 220, f1: 330, dur: 0.12, gain: 0.04 });
  },
  /** Laser: a falling "pew" with an echo. */
  laser: (ctx, out, t) => {
    for (const [delay, level] of [[0, 1], [0.1, 0.4], [0.2, 0.15]]) {
      tone(ctx, out, { at: t + delay, type: 'sawtooth', f0: 2400, f1: 170, slide: 0.26, dur: 0.3, gain: 0.15 * level, filter: 4500 });
      tone(ctx, out, { at: t + delay, type: 'square', f0: 1200, f1: 90, slide: 0.24, dur: 0.26, gain: 0.07 * level, filter: 3000 });
    }
  },
  /** A laser beam (or electricity) frying a ball: a harsh buzz. */
  zap: (ctx, out, t) => {
    const buzz = ctx.createGain();
    buzz.connect(out);
    tone(ctx, buzz, { at: t, type: 'sawtooth', f0: 110, dur: 0.28, gain: 0.09, filter: 2400 });
    tremolo(ctx, buzz, { at: t, dur: 0.28, rate: 55, depth: 0.6 });
    noise(ctx, out, { at: t, dur: 0.2, gain: 0.06, type: 'highpass', f0: 3000 });
  },
  /** Electric: a crackle of little sparks over a mains hum. */
  shock: (ctx, out, t) => {
    for (let i = 0; i < 7; i += 1) {
      noise(ctx, out, { at: t + i * 0.035 + rand(0, 0.02), dur: 0.03, gain: rand(0.08, 0.16), type: 'highpass', f0: rand(1500, 4000) });
    }
    const hum = ctx.createGain();
    hum.connect(out);
    tone(ctx, hum, { at: t, type: 'sawtooth', f0: 82, dur: 0.32, gain: 0.08, filter: 1500 });
    tremolo(ctx, hum, { at: t, dur: 0.32, rate: 60, depth: 0.7 });
  },
  /** Charge: a full charge letting go, a thump with a bright snap. */
  charged: (ctx, out, t) => {
    tone(ctx, out, { at: t, f0: 140, f1: 38, dur: 0.35, gain: 0.32 });
    tone(ctx, out, { at: t, type: 'square', f0: 1800, f1: 500, dur: 0.12, gain: 0.05, filter: 5000 });
    noise(ctx, out, { at: t, dur: 0.18, gain: 0.12, type: 'highpass', f0: 2500 });
  },
  /** Axe: a heavy swing and a ringing clang. */
  axe: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.22, gain: 0.1, f0: 300, f1: 1400, q: 1.2, attack: 0.07 });
    metal(ctx, out, { at: t + 0.06, base: 420, dur: 0.7, gain: 0.08 });
    tone(ctx, out, { at: t + 0.06, f0: 150, f1: 70, dur: 0.15, gain: 0.15 });
  },
  /** Spear: a quick thrust and a hard stab. */
  spearThrust: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.16, gain: 0.22, f0: 900, f1: 3200, q: 1.5, attack: 0.03 });
    tone(ctx, out, { at: t, f0: 300, f1: 700, dur: 0.12, gain: 0.04 });
  },
  spearStab: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.08, gain: 0.16, type: 'lowpass', f0: 1800 });
    metal(ctx, out, { at: t, base: 1300, dur: 0.3, gain: 0.04 });
  },
  /** Hook: the chain rattling out, then a clank as it catches. */
  hookThrow: (ctx, out, t) => {
    for (let i = 0; i < 8; i += 1) metal(ctx, out, { at: t + i * 0.03, base: 1500 + i * 60, dur: 0.06, gain: 0.055 });
  },
  hookLatch: (ctx, out, t) => {
    metal(ctx, out, { at: t, base: 520, dur: 0.5, gain: 0.08 });
    tone(ctx, out, { at: t, f0: 200, f1: 90, dur: 0.12, gain: 0.12 });
  },
  /** Thief: a knife swishing off, a ting as it lands and a sly chime as health is stolen. */
  knifeThrow: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.12, gain: 0.08, type: 'highpass', f0: 2500, f1: 6000 });
  },
  knifeHit: (ctx, out, t) => {
    metal(ctx, out, { at: t, base: 2100, dur: 0.35, gain: 0.05 });
    noise(ctx, out, { at: t, dur: 0.04, gain: 0.08, type: 'lowpass', f0: 2500 });
  },
  steal: (ctx, out, t) => {
    [76, 79, 83].forEach((note, i) => tone(ctx, out, { at: t + i * 0.05, type: 'triangle', f0: midi(note), dur: 0.25, gain: 0.09 }));
  },
  /** Poison: a dart puff, then bubbling and a hiss where it lands. */
  poisonThrow: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.08, gain: 0.24, f0: 1400, q: 2 });
  },
  poison: (ctx, out, t) => {
    for (let i = 0; i < 4; i += 1) {
      const f = rand(380, 900);
      tone(ctx, out, { at: t + i * 0.06, f0: f, f1: f * 1.8, dur: 0.07, gain: 0.07 });
    }
    noise(ctx, out, { at: t, dur: 0.35, gain: 0.05, type: 'highpass', f0: 3500 });
  },
  /** Virus: a gross squelch and slow bubbles. */
  infect: (ctx, out, t) => {
    const squelch = noise(ctx, out, { at: t, dur: 0.3, gain: 0.24, f0: 500, f1: 220, q: 6 });
    tremolo(ctx, squelch, { at: t, dur: 0.3, rate: 24, depth: 0.07 });
    for (let i = 0; i < 3; i += 1) tone(ctx, out, { at: t + 0.1 + i * 0.09, f0: rand(180, 300), f1: rand(400, 600), dur: 0.08, gain: 0.07 });
  },
  /** Burst: power gathering in a rush and going off in a boom. */
  burst: (ctx, out, t) => {
    noise(ctx, out, { at: t, dur: 0.25, gain: 0.12, f0: 300, f1: 3000, attack: 0.18 });
    tone(ctx, out, { at: t + 0.18, f0: 110, f1: 40, dur: 0.35, gain: 0.3 });
    noise(ctx, out, { at: t + 0.18, dur: 0.3, gain: 0.14, type: 'lowpass', f0: 1200 });
  },
  /** Cell: squishy blobs popping apart. */
  split: (ctx, out, t) => {
    for (const [dt, f] of [[0, 520], [0.09, 430]]) {
      const blob = ctx.createGain();
      blob.connect(out);
      tone(ctx, blob, { at: t + dt, f0: f, f1: 170, dur: 0.2, gain: 0.16 });
      tremolo(ctx, blob, { at: t + dt, dur: 0.2, rate: 30, depth: 0.4 });
    }
  },
  /** Verity: a magic swirl rising and a deep growl as it turns grim. */
  transform: (ctx, out, t) => {
    const swirl = tone(ctx, out, { at: t, type: 'sine', f0: 300, f1: 1400, dur: 0.6, gain: 0.08, slide: 0.5 });
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 9;
    const depth = ctx.createGain();
    depth.gain.value = 30;
    vibrato.connect(depth).connect(swirl.frequency);
    vibrato.start(t);
    vibrato.stop(t + 0.6);
    const growl = ctx.createGain();
    growl.connect(out);
    tone(ctx, growl, { at: t + 0.35, type: 'sawtooth', f0: 75, f1: 60, dur: 0.6, gain: 0.12, filter: 450, attack: 0.05 });
    tremolo(ctx, growl, { at: t + 0.35, dur: 0.6, rate: 18, depth: 0.5 });
  },
  orb: (ctx, out, t) => {
    tone(ctx, out, { at: t, f0: 1320, dur: 0.3, gain: 0.04 });
    tone(ctx, out, { at: t, f0: 1980, dur: 0.2, gain: 0.025 });
  },
  /** A ball knocked out: it pops in a little explosion. */
  death: (ctx, out, t) => {
    if (playSample(ctx, out, 'pop', { at: t, gain: 0.34, rate: rand(1.05, 1.2) })) {
      [88, 91, 96].forEach((note, i) => tone(ctx, out, { at: t + 0.05 + i * 0.04, f0: midi(note), dur: 0.2, gain: 0.02 }));
      return;
    }
    noise(ctx, out, { at: t, dur: 0.4, gain: 0.2, type: 'lowpass', f0: 1600, f1: 300 });
    tone(ctx, out, { at: t, f0: 220, f1: 45, dur: 0.4, gain: 0.25 });
    [88, 91, 96].forEach((note, i) => tone(ctx, out, { at: t + 0.05 + i * 0.04, f0: midi(note), dur: 0.2, gain: 0.025 }));
  },
};

/** Which sound a fight event makes, given the kind of ball it came from (null: none). */
function soundFor(event, kind) {
  switch (event.type) {
    case 'hit': return 'hit';
    case 'wall': return 'wall';
    case 'bite': return kind === 'snake' ? 'snakeBite' : 'vampireBite';
    case 'steal': return kind === 'vampire' ? 'vampireDrink' : 'steal';
    case 'strand': return 'spiderShoot';
    case 'snag': case 'web': return 'spiderStick';
    case 'laser': return 'laser';
    case 'zap': return 'zap';
    case 'shock': return 'shock';
    case 'charged': return 'charged';
    case 'axe': return kind === 'spear' ? 'spearStab' : 'axe';
    case 'thrust': return 'spearThrust';
    case 'throw': return { hook: 'hookThrow', knife: 'knifeThrow', spike: 'poisonThrow' }[event.kind] ?? null;
    case 'latch': return 'hookLatch';
    case 'knife': return 'knifeHit';
    case 'poison': return 'poison';
    case 'infect': return 'infect';
    case 'burst': return 'burst';
    case 'split': return 'split';
    case 'transform': return 'transform';
    case 'orb': return 'orb';
    case 'death': return 'death';
    default: return null;
  }
}
// The smallest gap between two of the same sound (ms), so a busy fight stays clear.
const GAPS = { hit: 70, wall: 120, shock: 160, zap: 140, axe: 160, orb: 120, poison: 150, steal: 200, knifeHit: 90, spiderStick: 120, spiderShoot: 90 };
const QUIET = new Set(['wall', 'orb']); // too small to turn the music down for

/**
 * Plays the sound of one fight event. `kind` is the ball it came from; `x` (0..100 across the box) pans it.
 */
export function fightSound(event, kind) {
  const name = soundFor(event, kind);
  if (!name || !gap(name, GAPS[name] ?? 60)) return;
  const pan = event.x == null ? 0 : (event.x / 100 - 0.5) * 1.2;
  play((ctx, out, t) => SOUNDS[name](ctx, out, t, event.power), {
    pan, reverb: 0.18, life: name === 'vampireBite' || name === 'transform' ? 1.1 : 0.6, duck: QUIET.has(name) ? 1 : 0.5,
  });
}

// ---- Winning --------------------------------------------------------------------------------------------------

// Each ball's victory: its signature sound, then a jingle in its own voice ([wave, notes, filter]).
const WINS = {
  verity: ['transform', 'triangle', [72, 76, 79, 84, 88], 6000],
  vampire: ['vampireBite', 'sawtooth', [62, 65, 69, 74, 73, 74], 1800],
  spider: ['spiderShoot', 'square', [84, 83, 79, 78, 74, 71], 2600],
  laser: ['laser', 'sawtooth', [60, 67, 72, 79, 84, 91], 5000],
  electric: ['shock', 'square', [67, 71, 74, 79, 83], 3500],
  charge: ['charged', 'triangle', [60, 64, 67, 72, 76, 79], 5000],
  axe: ['axe', 'sawtooth', [55, 62, 67, 74], 1600],
  spear: ['spearStab', 'sawtooth', [62, 69, 74, 78], 2200],
  hook: ['hookLatch', 'triangle', [65, 69, 72, 77], 4000],
  thief: ['steal', 'square', [76, 74, 79, 83, 88], 3000],
  poison: ['poison', 'square', [64, 67, 70, 76], 2400],
  virus: ['infect', 'square', [60, 63, 67, 70, 72], 2000],
  burst: ['burst', 'sawtooth', [60, 64, 67, 72, 76], 3000],
  cell: ['split', 'sine', [72, 79, 76, 84], 6000],
  snake: ['snakeBite', 'triangle', [69, 72, 76, 75, 81], 4000],
};

/** A ball winning the round: its own sound, then its own jingle. */
export function winSound(kind) {
  const [signature, wave, notes, filter] = WINS[kind] ?? WINS.verity;
  play((ctx, out, t) => {
    SOUNDS[signature](ctx, out, t, 1);
    notes.forEach((note, i) => {
      const at = t + 0.35 + i * 0.1;
      const last = i === notes.length - 1;
      tone(ctx, out, { at, type: wave, f0: midi(note), dur: last ? 0.7 : 0.18, gain: wave === 'sine' ? 0.12 : 0.06, filter });
      tone(ctx, out, { at, f0: midi(note) * 2, dur: last ? 0.5 : 0.12, gain: 0.02 });
    });
  }, { reverb: 0.35, life: 1.8, duck: 0.3 });
}

/** The winning ball smashing onto the loser's head: a big bomb blast. */
export const explosionSound = () => play((ctx, out, t) => {
  if (playSample(ctx, out, 'blast', { at: t, gain: 0.8, rate: rand(0.9, 1) })) {
    playSample(ctx, out, 'rumble', { at: t, gain: 0.6 });
    playSample(ctx, out, 'smack', { at: t, gain: 0.35, rate: 0.8 });
    return;
  }
  tone(ctx, out, { at: t, f0: 120, f1: 28, dur: 1.1, gain: 0.55, slide: 0.6 });
  noise(ctx, out, { at: t, dur: 1.3, gain: 0.38, type: 'lowpass', f0: 3200, f1: 180, q: 0.7 });
  noise(ctx, out, { at: t, dur: 0.12, gain: 0.25, type: 'highpass', f0: 2000 });
  for (let i = 0; i < 10; i += 1) {
    noise(ctx, out, { at: t + 0.15 + Math.random() * 0.7, dur: 0.04, gain: rand(0.03, 0.08), type: 'bandpass', f0: rand(1500, 5000), q: 3 });
  }
}, { reverb: 0.5, life: 2, duck: 0.2, duckFor: 1.6 });

/** The winning ball leaping out of the box toward the head. */
export const launchSound = () => play((ctx, out, t) => {
  noise(ctx, out, { at: t, dur: 0.6, gain: 0.24, f0: 300, f1: 2400, q: 1.2, attack: 0.3 });
  tone(ctx, out, { at: t, f0: 200, f1: 900, dur: 0.5, gain: 0.1, slide: 0.45 });
}, { reverb: 0.25, life: 0.8, duck: 0.4 });

/** The duel's end: a fanfare for the winner, a sad slide down for the loser. */
export const resultSound = (won) => play((ctx, out, t) => {
  if (won) {
    [[60, 0, 0.15], [64, 0.15, 0.15], [67, 0.3, 0.15], [72, 0.45, 0.9]].forEach(([note, dt, dur]) => {
      for (const n of [note, note + 4, note + 7]) tone(ctx, out, { at: t + dt, type: 'sawtooth', f0: midi(n), dur: dur + 0.1, gain: 0.08, filter: 2600, attack: 0.02 });
    });
    [84, 88, 91, 96].forEach((note, i) => tone(ctx, out, { at: t + 0.5 + i * 0.05, f0: midi(note), dur: 0.6, gain: 0.04 }));
  } else {
    [[62, 0], [61, 0.35], [60, 0.7]].forEach(([note, dt]) => tone(ctx, out, { at: t + dt, type: 'sawtooth', f0: midi(note), dur: 0.35, gain: 0.13, filter: 1200 }));
    tone(ctx, out, { at: t + 1.05, type: 'sawtooth', f0: midi(59), f1: midi(55), slide: 0.8, dur: 1, gain: 0.13, filter: 1000 });
  }
}, { reverb: 0.4, life: 2.2, duck: 0.25 });
