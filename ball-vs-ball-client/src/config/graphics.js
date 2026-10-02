// Graphics quality presets. None of them needs a shader rebuilt, so switching never stalls a frame.
// pixelRatio: the highest device pixel ratio drawn at. bloom: the neon glow pass. shadows / shadowSize: the
// sun's soft shadows (drawn once) and their resolution. waterFps: how often the gently moving sea is redrawn
// while the camera is still (camera moves always draw at full rate); 0 freezes the water.
export const QUALITY = {
  Low: { pixelRatio: 0.85, bloom: false, shadows: true, shadowSize: 1024, waterFps: 0 },
  Medium: { pixelRatio: 1, bloom: false, shadows: true, shadowSize: 2048, waterFps: 24 },
  High: { pixelRatio: 1.5, bloom: true, shadows: true, shadowSize: 2048, waterFps: 30 },
  Ultra: { pixelRatio: 2, bloom: true, shadows: true, shadowSize: 4096, waterFps: 60 },
};

/** A sensible default before the player picks one: phones get Medium (Low if short of memory), desktops High. */
export function defaultQuality() {
  const fromUrl = new URLSearchParams(window.location.search).get('quality');
  if (fromUrl && QUALITY[fromUrl]) return fromUrl;
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch) return navigator.deviceMemory && navigator.deviceMemory <= 3 ? 'Low' : 'Medium';
  return 'High';
}
