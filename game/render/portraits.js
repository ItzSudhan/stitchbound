// Small standing portraits of every pest, for the HUD's roster and the Sampler.
import { drawBeetle, drawMatriarch, drawMoth, drawSilverfish, drawSnipper, drawSpitter, drawYarnBall } from './sprites.js';
import { drawLintBall } from '../entities/lint-ball.js';
import { drawBurrower } from '../entities/burrower.js';
import { drawCarpetBeetle } from '../entities/carpet-beetle.js';

const critter = (fields) => ({ x: 0, y: 0, angle: -Math.PI / 2, seed: 1, state: 'move', flash: 0, index: 1, ...fields });

export const PORTRAITS = {
  moth: (ctx, t) => drawMoth(ctx, critter({ r: 19 }), t),
  silverfish: (ctx, t) => drawSilverfish(ctx, critter({ r: 15, angle: -0.5 }), t),
  beetle: (ctx, t) => drawBeetle(ctx, critter({ r: 20 }), t),
  snipper: (ctx, t) => drawSnipper(ctx, critter({ r: 16, angle: -0.6 }), t),
  spitter: (ctx, t) => drawSpitter(ctx, critter({ r: 19 }), t),
  lintBall: (ctx, t) => drawLintBall(ctx, critter({ r: 20, angle: 0 }), t),
  burrower: (ctx, t) => drawBurrower(ctx, critter({ r: 14, angle: -0.5, buried: false }), t),
  carpetBeetle: (ctx, t) => drawCarpetBeetle(ctx, critter({ r: 18 }), t),
  wyrm: (ctx, t) => {
    drawYarnBall(ctx, critter({ x: -14, r: 14, index: 2 }), t, false);
    drawYarnBall(ctx, critter({ x: 8, r: 17, angle: 0 }), t, true);
  },
  matriarch: (ctx, t) => drawMatriarch(ctx, critter({ r: 17, angle: 0 }), t),
};

/** A pest's portrait centred at (x, y), scaled. */
export function drawPortrait(ctx, kind, x, y, scale, time) {
  const draw = PORTRAITS[kind];
  if (!draw) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  draw(ctx, time);
  ctx.restore();
}
