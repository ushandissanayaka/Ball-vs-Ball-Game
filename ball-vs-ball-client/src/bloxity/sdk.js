// The game's one way into the Bloxity Legion SDK (window.Legion.SDK). Every call is safe without the SDK
// (a local preview, or if its script failed to load): it does nothing.

const GAME_SLUG = import.meta.env.VITE_GAME_SLUG || 'ball-vs-ball';
// Named outright: left out, the SDK assumes on localhost that the portal itself runs locally.
const PORTAL_URL = import.meta.env.VITE_BLOXITY_PORTAL_URL || 'https://bloxity.io';
const API_URL = import.meta.env.VITE_BLOXITY_API_URL || 'https://api.bloxity.io';

const sdk = () => (typeof window !== 'undefined' ? window.Legion?.SDK ?? null : null);
const noop = () => {};
let initialized = false;

/** Initialises the SDK once. The script tag loads with `defer`, so call this after the page has parsed. */
export function startBloxity() {
  const legion = sdk();
  if (!legion || initialized) return;
  try {
    legion.init?.({ gameSlug: GAME_SLUG, portalUrl: PORTAL_URL, apiUrl: API_URL });
    initialized = true;
  } catch (error) {
    console.info('Bloxity SDK could not start:', error);
  }
}

// ---- Loading and gameplay lifecycle (shown by the portal) ----------------------------------------------
export const loadingStep = (message) => sdk()?.game?.loadingStep?.(message);
export const loadingEnd = () => sdk()?.game?.loadingEnd?.();
export const gameplayStart = () => sdk()?.game?.gameplayStart?.();
export const gameplayEnd = () => sdk()?.game?.gameplayEnd?.();

// ---- Settings ----------------------------------------------------------------------------------------
/** Calls `listener(value)` now and whenever the player changes `key` in the portal menu; returns the unsubscribe. */
export const listenSetting = (key, listener) => sdk()?.settings?.listen?.(key, listener) ?? noop;
export const applyAllSettings = () => sdk()?.settings?.triggerAll?.();
