import { loadingStep } from '../../bloxity/sdk.js';

// Drives the plain-HTML loading screen in index.html. Each step is reported to the Bloxity portal; the screen
// itself just says "Joining server", as in the reference, and has no animation.

export function showLoadingStep(message) {
  loadingStep(message);
}

/**
 * The next drawn frame, or `ms` at the latest. A page nobody can see (a background tab, or the portal's frame
 * before the game says it has loaded) draws no frames at all, so waiting for one alone could wait forever.
 */
export const nextFrame = (ms = 120) => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clearTimeout(timer);
    resolve();
  }));
});

/** Takes the loading screen away at once, after the game has (most likely) drawn a frame behind it. */
export async function hideLoadingScreen() {
  await nextFrame();
  document.getElementById('loading-screen')?.remove();
}
