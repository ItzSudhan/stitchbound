// Player two's keys on the shared keyboard: the arrow keys steer the Gold Needle, Enter fires
// pins (aimed at the nearest pest ahead, since player one has the mouse) and Right Shift or the
// slash key dashes. Player one keeps WASD, the mouse and Space.
import { partnerAim } from './two-needles.js';

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
  return {
    moveX,
    moveY,
    aimX,
    aimY,
    fire: k.fire.some((code) => input.isHeld(code)),
    dash: input.anyPressed(...k.dash),
  };
}
