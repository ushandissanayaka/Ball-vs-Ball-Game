// Movement input for the player character: WASD / arrow keys, or the on-screen joystick on touch screens, and
// Space (or the on-screen Jump button) to jump. `move` is the wanted direction relative to the camera: x = right,
// y = forward, each -1..1.

const KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

const held = new Set();
const stick = { x: 0, y: 0 };
let listening = false;
let jumpAsked = false;

const onKeyDown = (event) => {
  if (event.target.closest?.('input, textarea')) return;
  if (KEYS[event.code]) held.add(event.code);
  if (event.code === 'Space') {
    // Space jumps, and must not also press a HUD button that still has the focus from a click (or scroll).
    event.preventDefault();
    if (document.activeElement?.tagName === 'BUTTON') document.activeElement.blur();
    if (!event.repeat) jumpAsked = true;
  }
};
const onKeyUp = (event) => held.delete(event.code);
const onBlur = () => held.clear();

export function startPlayerInput() {
  if (listening) return;
  listening = true;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
}

export function stopPlayerInput() {
  listening = false;
  held.clear();
  jumpAsked = false;
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onBlur);
}

/** Set by the joystick: x right, y forward, length up to 1. */
export function setStick(x, y) {
  stick.x = x;
  stick.y = y;
}

/** The wanted move this frame: { x, y } relative to the camera, length up to 1. */
export function readMove() {
  let x = stick.x;
  let y = stick.y;
  for (const code of held) {
    x += KEYS[code][0];
    y += KEYS[code][1];
  }
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

/** The on-screen Jump button was pressed. */
export function pressJump() {
  jumpAsked = true;
}

/** Whether a jump was asked for since the last call (each press jumps once). */
export function takeJump() {
  const asked = jumpAsked;
  jumpAsked = false;
  return asked;
}
