import { loadingStep } from '../../bloxity/sdk.js';

// Drives the plain-HTML loading screen in index.html (and reports each step to the Bloxity portal too).
let progress = 0.06;

export function showLoadingStep(message, value) {
  loadingStep(message);
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  progress = Math.max(progress, value);
  screen.style.setProperty('--progress', progress.toFixed(3));
  const status = screen.querySelector('.status');
  if (status) status.textContent = message;
}

export function hideLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  screen.style.setProperty('--progress', '1');
  screen.classList.add('done');
  setTimeout(() => screen.remove(), 500);
}
