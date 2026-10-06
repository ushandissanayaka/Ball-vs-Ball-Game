// The game's sound, made live with the Web Audio API (no sound files to download): a mixer with a music bus and
// an effects bus, a shared reverb, and ducking, which turns the music down while effects play and brings it back
// up when they stop. Browsers only allow sound after the player has clicked or pressed a key, so it all starts
// on the first one; while the tab is hidden it sleeps.

let ctx = null;
let master = null;
let musicDuck = null; // the music's ducking gain (1 = full)
let musicBus = null;
let sfxBus = null;
let reverbIn = null;
let noiseBuffer = null;
const starters = [];
// The player's volume settings (0..1, from the portal's menu), on top of the mix's own levels.
const MASTER_LEVEL = 0.9;
const MUSIC_LEVEL = 0.55;
let masterVolume = 1;
let musicVolume = 1;

export const audioContext = () => ctx;
export const buses = () => ({ musicBus, sfxBus, reverbIn });

/** Runs `start(ctx)` once sound is allowed (at once if it already is). */
export function whenAudioReady(start) {
  if (ctx) start(ctx);
  else starters.push(start);
}

/** A stereo room: two seconds of noise fading away, a little different in each ear. */
function makeReverb(seconds = 2.4) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3.2;
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

function start() {
  if (ctx) return;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  ctx = new Context({ latencyHint: 'interactive' });

  // Everything meets in a gentle compressor, so loud moments (an explosion over the music) never clip.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 14;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;
  master = ctx.createGain();
  master.gain.value = MASTER_LEVEL * masterVolume;
  master.connect(compressor).connect(ctx.destination);

  musicDuck = ctx.createGain();
  musicDuck.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_LEVEL * musicVolume;
  musicBus.connect(musicDuck);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.85;
  sfxBus.connect(master);

  const reverb = makeReverb();
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.32;
  reverbIn = ctx.createGain();
  reverbIn.connect(reverb).connect(reverbOut).connect(master);

  // Two seconds of white noise, shared by every noisy sound (each plays it from a random point).
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  for (const run of starters.splice(0)) run(ctx);
}

export const sharedNoise = () => noiseBuffer;

const level = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1);
/** The overall volume, 0..1 (the portal's master volume). */
export function setMasterVolume(value) {
  masterVolume = level(value);
  master?.gain.setTargetAtTime(MASTER_LEVEL * masterVolume, ctx.currentTime, 0.05);
}
/** The music's volume, 0..1 (the portal's music volume). */
export function setMusicVolume(value) {
  musicVolume = level(value);
  musicBus?.gain.setTargetAtTime(MUSIC_LEVEL * musicVolume, ctx.currentTime, 0.05);
}

/**
 * Switches the sound on now. It plays straight away when the browser allows it (the player has already clicked
 * on the page or the portal that holds it); if not, it waits, silent, for the first click, tap or key.
 */
export function startAudioNow() {
  start();
  ctx?.resume().catch(() => {});
}

/** Starts the sound on the player's first click, tap or key (as browsers require). */
export function unlockAudioOnFirstInput() {
  const events = ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'touchend', 'click'];
  const unlock = () => {
    start();
    // Not allowed yet (this kind of event doesn't count for the browser): keep listening.
    ctx?.resume().then(() => {
      if (ctx.state === 'running') for (const type of events) window.removeEventListener(type, unlock, true);
    }, () => {});
  };
  for (const type of events) window.addEventListener(type, unlock, true);
}

// ---- Ducking ---------------------------------------------------------------------------------------------
let duckLevel = 1;
let duckUntil = 0;
let releaseTimer = 0;

/**
 * Turns the music down to `level` (0..1) for about `seconds`; another effect meanwhile keeps it down (the
 * lower level wins). It comes back up smoothly once everything has gone quiet.
 */
export function duckMusic(level = 0.4, seconds = 0.6) {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (level < duckLevel || now > duckUntil) {
    duckLevel = Math.min(level, now > duckUntil ? 1 : duckLevel);
    musicDuck.gain.cancelScheduledValues(now);
    musicDuck.gain.setTargetAtTime(duckLevel, now, 0.035);
  }
  duckUntil = Math.max(duckUntil, now + seconds);
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    duckLevel = 1;
    musicDuck.gain.cancelScheduledValues(ctx.currentTime);
    musicDuck.gain.setTargetAtTime(1, ctx.currentTime, 0.45);
  }, Math.max(0, (duckUntil - now) * 1000));
}
