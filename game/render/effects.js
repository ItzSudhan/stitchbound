// Game feel: felt-fluff particles, thread fibres, sparkle stars, shock rings, floating score text,
// screen shake, screen flashes and hit-stop. Nothing here changes the rules; it makes them felt.
import { createRandom } from '../core/random.js';
import { FONT, PALETTE } from '../core/config.js';
import { TAU } from '../core/geometry.js';

export function createEffects(seed) {
  return { rng: createRandom(seed ^ 0x5eed), particles: [], rings: [], floaters: [], shake: 0, flash: 0, flashColor: '#ffffff', hitstop: 0 };
}

/** A puff of particles: kind is 'fluff' (soft felt balls), 'fiber' (short threads) or 'spark' (stars). */
export function burst(fx, x, y, { count = 10, colors = [PALETTE.cream], speed = 160, size = 5, life = 0.6, kind = 'fluff', gravity = 0 } = {}) {
  const rng = fx.rng;
  for (let i = 0; i < count; i += 1) {
    const a = rng.range(0, TAU);
    const v = speed * rng.range(0.35, 1);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      size: size * rng.range(0.6, 1.3),
      life: life * rng.range(0.7, 1.2),
      age: 0,
      color: rng.pick(colors),
      kind,
      spin: rng.range(-8, 8),
      angle: rng.range(0, TAU),
      gravity,
    });
  }
}

export function ring(fx, x, y, color, radius = 60, life = 0.4, width = 6) {
  fx.rings.push({ x, y, color, radius, life, age: 0, width });
}

export function floatText(fx, x, y, text, color = PALETTE.cream, size = 26) {
  // Stack above any fresh text nearby so two numbers never run together.
  let top = Math.max(140, y);
  for (const f of fx.floaters) {
    if (f.age < 0.5 && Math.abs(f.x - x) < 90 && Math.abs(f.y - top) < size) top = f.y - size;
  }
  fx.floaters.push({ x, y: top, text, color, size, age: 0, life: 1.1 });
}

export function addShake(fx, amount) {
  fx.shake = Math.min(28, fx.shake + amount);
}

export function screenFlash(fx, color, amount = 0.5) {
  fx.flash = Math.max(fx.flash, amount);
  fx.flashColor = color;
}

export function hitStop(fx, seconds) {
  fx.hitstop = Math.max(fx.hitstop, seconds);
}

export function updateEffects(fx, dt) {
  fx.shake = Math.max(0, fx.shake - dt * 40);
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  for (const p of fx.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 3;
    p.vy = p.vy * (1 - dt * 3) + p.gravity * dt;
    p.angle += p.spin * dt;
  }
  fx.particles = fx.particles.filter((p) => p.age < p.life);
  if (fx.particles.length > 700) fx.particles.splice(0, fx.particles.length - 700);
  for (const r of fx.rings) r.age += dt;
  fx.rings = fx.rings.filter((r) => r.age < r.life);
  for (const f of fx.floaters) {
    f.age += dt;
    f.y -= dt * 46;
  }
  fx.floaters = fx.floaters.filter((f) => f.age < f.life);
}

/** The camera offset this frame from screen shake. */
export function shakeOffset(fx) {
  if (fx.shake <= 0) return { x: 0, y: 0 };
  return { x: fx.rng.range(-1, 1) * fx.shake, y: fx.rng.range(-1, 1) * fx.shake };
}

export function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    const t = p.age / p.life;
    ctx.globalAlpha = 1 - t * t;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    if (p.kind === 'fiber') {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(p.angle) * p.size * 1.6, p.y - Math.sin(p.angle) * p.size * 1.6);
      ctx.quadraticCurveTo(p.x + Math.sin(p.angle) * p.size, p.y, p.x + Math.cos(p.angle) * p.size * 1.6, p.y + Math.sin(p.angle) * p.size * 1.6);
      ctx.stroke();
    } else if (p.kind === 'spark') {
      const s = p.size * (1 - t * 0.5);
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = p.angle + (i / 8) * TAU;
        const r = i % 2 === 0 ? s : s * 0.35;
        ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawRings(ctx, fx) {
  for (const r of fx.rings) {
    const t = r.age / r.life;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width * (1 - t) + 1;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius * (0.3 + 0.7 * Math.sqrt(t)), 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx, fx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of fx.floaters) {
    const t = f.age / f.life;
    const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15) * 0.3);
    ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
    ctx.font = `bold ${Math.round(f.size * pop)}px ${FONT.ui}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = PALETTE.ink;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

export function drawScreenFlash(ctx, fx, width, height) {
  if (fx.flash <= 0) return;
  ctx.globalAlpha = fx.flash * 0.6;
  ctx.fillStyle = fx.flashColor;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}
