import { whenAudioReady } from './engine.js';

// Recorded sounds (public/audio, CC0 clips from Kenney.nl's Impact Sounds and Sci-Fi Sounds packs): real thuds,
// explosions and footsteps, where synthesis sounds too much like a machine. Each set has a few takes, played at
// random so repeats never sound identical. They load in the background once the game is running; until a set
// has loaded, its sound falls back to the synthesized version.

const SETS = {
  thud: ['impactSoft_heavy_0', 'impactSoft_heavy_1', 'impactSoft_heavy_2', 'impactSoft_heavy_3', 'impactSoft_heavy_4'],
  smack: ['impactPunch_heavy_0', 'impactPunch_heavy_1', 'impactPunch_heavy_2'],
  tap: ['impactGeneric_light_0', 'impactGeneric_light_1', 'impactGeneric_light_2'],
  step: ['footstep_concrete_0', 'footstep_concrete_1', 'footstep_concrete_2', 'footstep_concrete_3', 'footstep_concrete_4'],
  blast: ['explosionCrunch_1', 'explosionCrunch_2', 'explosionCrunch_3', 'explosionCrunch_4'],
  pop: ['explosionCrunch_0'],
  rumble: ['lowFrequency_explosion_0', 'lowFrequency_explosion_1'],
};

const buffers = new Map(); // set name -> AudioBuffer[]
const lastTake = new Map();

export function loadSamples() {
  whenAudioReady(async (ctx) => {
    for (const [set, files] of Object.entries(SETS)) {
      const takes = await Promise.all(files.map(async (file) => {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}audio/${file}.wav`);
          return await ctx.decodeAudioData(await response.arrayBuffer());
        } catch {
          return null;
        }
      }));
      const loaded = takes.filter(Boolean);
      if (loaded.length) buffers.set(set, loaded);
    }
  });
}

/**
 * Plays a random take of `set` into `dest` (never the same take twice running). `rate` changes its pitch and
 * speed a little (1 = as recorded). Returns false if the set hasn't loaded yet.
 */
export function playSample(ctx, dest, set, { at = ctx.currentTime, gain = 1, rate = 1, offset = 0 } = {}) {
  const takes = buffers.get(set);
  if (!takes) return false;
  let i = Math.floor(Math.random() * takes.length);
  if (takes.length > 1 && i === lastTake.get(set)) i = (i + 1) % takes.length;
  lastTake.set(set, i);
  const source = ctx.createBufferSource();
  source.buffer = takes[i];
  source.playbackRate.value = rate;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(amp).connect(dest);
  source.start(at, offset);
  return true;
}
