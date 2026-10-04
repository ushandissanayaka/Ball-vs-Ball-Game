import { loadingStep } from '../../bloxity/sdk.js';

// Drives the plain-HTML loading screen in index.html. Each step is reported to the Bloxity portal; the screen
// itself just says "Joining server", as in the reference, and has no animation.

export function showLoadingStep(message) {
  loadingStep(message);
}

/** Takes the loading screen away at once, after the game has drawn a frame (so it never flashes empty). */
export async function hideLoadingScreen() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.getElementById('loading-screen')?.remove();
}
