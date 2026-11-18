// Keyboard and mouse, read into one snapshot per frame. The mouse is mapped from page pixels to the
// game's 1280x800 logical canvas, so aiming and menu clicks are exact at any window size.
import { VIEW } from './config.js';

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, clicked: false, moved: false };

  const toLogical = (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * VIEW.height;
    mouse.moved = true;
  };

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Slash'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('mousemove', toLogical);
  canvas.addEventListener('mousedown', (event) => {
    toLogical(event);
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
    if (event.button === 2) pressed.add('MouseRight');
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    isHeld: (code) => held.has(code),
    anyPressed: (...codes) => codes.some((code) => pressed.has(code)),
    /** The digit key 1-9 pressed this frame, as an index 0-8, or -1. */
    digitPressed() {
      for (let i = 1; i <= 9; i += 1) if (pressed.has(`Digit${i}`) || pressed.has(`Numpad${i}`)) return i - 1;
      return -1;
    },
    /** Movement as a vector from WASD or the arrow keys (WASD only when player two has the arrows). */
    moveVector(wasdOnly = false) {
      const arrows = !wasdOnly;
      const x = (held.has('KeyD') || (arrows && held.has('ArrowRight')) ? 1 : 0) - (held.has('KeyA') || (arrows && held.has('ArrowLeft')) ? 1 : 0);
      const y = (held.has('KeyS') || (arrows && held.has('ArrowDown')) ? 1 : 0) - (held.has('KeyW') || (arrows && held.has('ArrowUp')) ? 1 : 0);
      return { x, y };
    },
    /** Call once at the end of each frame: one-shot presses and clicks are forgotten. */
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
