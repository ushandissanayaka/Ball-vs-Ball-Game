import { audioContext, buses, sharedNoise, whenAudioReady } from './engine.js';

// The background music, played live: a bright, easy-going tune in C major. A warm pad holds the chords, a plucked
// arpeggio and a round bass move under them, soft drums keep time and a bell-like lead sings the melody on some
// passes. 16 bars (A A B A), then it comes round again, at the same lively tempo throughout; in a duel ('duel'
// mood) the drums push harder. Notes are queued a moment ahead by a small scheduler, so the timing never wobbles.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// Each bar: its bass root and chord tones (MIDI numbers).
const SECTIONS = {
  A: [
    { root: 36, chord: [60, 64, 67, 71] }, // Cmaj7
    { root: 33, chord: [57, 60, 64, 67] }, // Am7
    { root: 29, chord: [57, 60, 65, 69] }, // Fmaj7
    { root: 31, chord: [55, 59, 62, 67] }, // G
  ],
  B: [
    { root: 29, chord: [57, 60, 64, 69] }, // Fmaj7
    { root: 31, chord: [55, 59, 62, 65] }, // G7
    { root: 28, chord: [55, 59, 62, 64] }, // Em7
    { root: 33, chord: [57, 60, 64, 67] }, // Am7
  ],
};
// The melody, bar by bar: [sixteenth, note, length in sixteenths].
const MELODY = {
  A: [
    [[0, 76, 3], [3, 79, 3], [6, 81, 2], [8, 79, 2], [10, 76, 2], [12, 74, 4]],
    [[0, 72, 3], [3, 76, 3], [6, 74, 2], [8, 72, 4], [14, 69, 2]],
    [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 77, 2], [10, 76, 2], [12, 72, 4]],
    [[0, 74, 3], [3, 79, 3], [6, 74, 2], [8, 71, 4], [12, 74, 4]],
  ],
  B: [
    [[0, 81, 4], [4, 79, 2], [6, 77, 2], [8, 76, 4], [12, 72, 4]],
    [[0, 79, 4], [4, 77, 2], [6, 74, 2], [8, 71, 6], [14, 74, 2]],
    [[0, 76, 3], [3, 79, 3], [6, 83, 2], [8, 81, 4], [12, 79, 4]],
    [[0, 81, 6], [6, 79, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2]],
  ],
};
// The form: which section each 4-bar block plays, and whether the lead sings over it.
const FORM = [['A', true], ['A', true], ['B', true], ['A', false]];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
// One tempo throughout, so it is lively from the very first bar; a duel only makes the drums push harder.
const MOODS = { lobby: { bpm: 112, hats: 2, kick: [0, 8, 10] }, duel: { bpm: 112, hats: 1, kick: [0, 6, 8, 11] } };

let mood = 'lobby';
let step = 0; // sixteenths since the start
let nextAt = 0;
let timer = 0;
let out = null;

export function setMusicMood(next) {
  if (MOODS[next]) mood = next;
}

function envelope(gain, at, peak, attack, hold, release) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
}

function voice(ctx, { type, freq, at, peak, attack, hold, release, filter, detune = 0, reverb = 0.2 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const gain = ctx.createGain();
  envelope(gain, at, peak, attack, hold, release);
  let node = osc;
  if (filter) {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = filter;
    node = node.connect(lowpass);
  }
  node.connect(gain).connect(out);
  if (reverb) {
    const send = ctx.createGain();
    send.gain.value = reverb;
    gain.connect(send).connect(buses().reverbIn);
  }
  osc.start(at);
  osc.stop(at + attack + hold + release + 0.05);
}

function hit(ctx, { at, peak, decay, type, freq, q = 1 }) {
  const source = ctx.createBufferSource();
  source.buffer = sharedNoise();
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  source.connect(filter).connect(gain).connect(out);
  source.start(at, Math.random() * 1.5, decay + 0.05);
}

function kick(ctx, at, peak) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(140, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.3);
}

/** Queues everything that sounds on sixteenth `n`, starting at `at`. */
function playStep(ctx, n, at, sixteenth) {
  const bar = Math.floor(n / 16);
  const s = n % 16;
  const [name, sings] = FORM[Math.floor(bar / 4) % FORM.length];
  const index = bar % 4;
  const { root, chord } = SECTIONS[name][index];
  const { hats, kick: kicks } = MOODS[mood];
  const barLength = sixteenth * 16;

  if (s === 0) {
    // The pad: each chord tone on two slightly detuned saws, darkened, swelling in.
    for (const note of chord) {
      for (const detune of [-7, 7]) {
        voice(ctx, { type: 'sawtooth', freq: midi(note), at, peak: 0.011, attack: 0.5, hold: barLength - 0.6, release: 0.9, filter: 1100, detune, reverb: 0.35 });
      }
    }
  }
  // The bass: the root on the beat, a push before beat three, the octave on the last sixteenth.
  const bass = { 0: [root, 5], 6: [root, 2], 8: [root, 5], 14: [root + 12, 2] }[s];
  if (bass) {
    voice(ctx, { type: 'triangle', freq: midi(bass[0] + 12), at, peak: 0.13, attack: 0.01, hold: sixteenth * bass[1] * 0.6, release: 0.18, filter: 700, reverb: 0 });
  }
  // The arpeggio: chord tones an octave up, on every eighth.
  if (s % 2 === 0) {
    const note = chord[ARP[(s / 2) % ARP.length]] + 12;
    voice(ctx, { type: 'triangle', freq: midi(note), at, peak: 0.028, attack: 0.005, hold: 0.02, release: 0.32, filter: 3200, reverb: 0.4 });
  }
  // The lead: a soft bell (a sine with a fainter one two octaves up).
  if (sings) {
    for (const [at16, note, length] of MELODY[name][index]) {
      if (at16 !== s) continue;
      const hold = sixteenth * length * 0.55;
      voice(ctx, { type: 'sine', freq: midi(note), at, peak: 0.07, attack: 0.008, hold, release: 0.5, reverb: 0.45 });
      voice(ctx, { type: 'sine', freq: midi(note) * 4, at, peak: 0.012, attack: 0.004, hold: 0.01, release: 0.25, reverb: 0.3 });
    }
  }
  // Drums: a soft kick, a brushed snare on two and four, light hats.
  if (kicks.includes(s)) kick(ctx, at, mood === 'duel' ? 0.32 : 0.24);
  if (s === 4 || s === 12) hit(ctx, { at, peak: 0.07, decay: 0.16, type: 'bandpass', freq: 1700, q: 0.8 });
  if (s % hats === 0) hit(ctx, { at, peak: s % 4 === 2 ? 0.03 : 0.016, decay: 0.035, type: 'highpass', freq: 7500 });
}

function schedule() {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'running') return;
  const sixteenth = 60 / MOODS[mood].bpm / 4;
  if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05; // after a pause, pick up from now
  while (nextAt < ctx.currentTime + 0.25) {
    playStep(ctx, step, nextAt, sixteenth);
    step += 1;
    nextAt += sixteenth;
  }
}

/** Starts the music (once sound is allowed), straight in at full pace. */
export function startMusic() {
  whenAudioReady((ctx) => {
    if (timer) return;
    out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.15);
    out.connect(buses().musicBus);
    nextAt = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 60);
    schedule();
  });
}
