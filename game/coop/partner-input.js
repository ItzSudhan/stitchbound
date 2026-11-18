// Player two's controls. On the shared keyboard the arrow keys steer the Brass Needle, Enter
// fires pins (aimed at the nearest pest ahead, since player one has the mouse) and Right Shift or
// the slash key dashes; player one keeps WASD, the mouse and Space. Player two may instead pick
// up a gamepad: the left stick or d-pad steers, A (or RT) fires and B (or RB) dashes.
import { partnerAim } from './two-needles.js';

/** Stick travel below this is treated as resting. */
const DEAD_ZONE = 0.22;

/** The first connected gamepad, or null. Guarded: some browsers throw without a secure page. */
function firstPad() {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) if (pad && pad.connected) return pad;
  } catch {
    // No gamepad access here: the keyboard still works.
  }
  return null;
}

const pressedOn = (pad, i) => Boolean(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));

/** The gamepad's half of player two's intent, or null when no pad is connected. */
function padIntent(pad, last) {
  let x = Math.abs(pad.axes[0] ?? 0) > DEAD_ZONE ? pad.axes[0] : 0;
  let y = Math.abs(pad.axes[1] ?? 0) > DEAD_ZONE ? pad.axes[1] : 0;
  // Standard mapping d-pad: 12 up, 13 down, 14 left, 15 right.
  x += (pressedOn(pad, 15) ? 1 : 0) - (pressedOn(pad, 14) ? 1 : 0);
  y += (pressedOn(pad, 13) ? 1 : 0) - (pressedOn(pad, 12) ? 1 : 0);
  const dashHeld = pressedOn(pad, 1) || pressedOn(pad, 5);
  // A dash is a fresh press, like the keyboard's.
  const dash = dashHeld && !last.dashHeld;
  last.dashHeld = dashHeld;
  return { moveX: x, moveY: y, fire: pressedOn(pad, 0) || pressedOn(pad, 7), dash };
}

const padMemory = { dashHeld: false };

export const PARTNER_KEYS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ['Enter', 'NumpadEnter'],
  dash: ['ShiftRight', 'Slash', 'Numpad0'],
};

/** Player two's intent this frame, in the same shape as player one's. */
export function partnerIntent(run, input) {
  const k = PARTNER_KEYS;
  const moveX = (input.isHeld(k.right) ? 1 : 0) - (input.isHeld(k.left) ? 1 : 0);
  const moveY = (input.isHeld(k.down) ? 1 : 0) - (input.isHeld(k.up) ? 1 : 0);
  const { aimX, aimY } = partnerAim(run, run.partner);
  const keys = { moveX, moveY, fire: k.fire.some((code) => input.isHeld(code)), dash: input.anyPressed(...k.dash) };
  const pad = firstPad();
  const stick = pad ? padIntent(pad, padMemory) : null;
  return {
    // Keys and pad add up, so either works and neither gets in the other's way.
    moveX: stick ? keys.moveX + stick.moveX : keys.moveX,
    moveY: stick ? keys.moveY + stick.moveY : keys.moveY,
    aimX,
    aimY,
    fire: keys.fire || Boolean(stick?.fire),
    dash: keys.dash || Boolean(stick?.dash),
  };
}
