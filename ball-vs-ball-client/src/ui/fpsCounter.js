// Frames per second in a corner (the portal's Show FPS setting): browser frames counted each second. Off, it
// costs nothing.
let element = null;
let frame = 0;

/** Shows or hides the counter. */
export function showFps(on) {
  if (!on) {
    cancelAnimationFrame(frame);
    element?.remove();
    element = null;
    return;
  }
  if (element) return;
  element = document.createElement('div');
  element.className = 'fps-counter';
  element.textContent = '-- FPS';
  document.body.append(element);
  let count = 0;
  let since = performance.now();
  const tick = (time) => {
    count += 1;
    if (time - since >= 1000) {
      element.textContent = `${Math.round((count * 1000) / (time - since))} FPS`;
      count = 0;
      since = time;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
