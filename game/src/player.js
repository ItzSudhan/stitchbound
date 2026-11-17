// The needle: eased eight-way movement, a snip-dash with invulnerability, pin firing toward the
// mouse, spools of health with mercy frames, and orbiting guard buttons.
import { VIEW } from './config.js';
import { angleDelta, clamp, TAU } from './geometry.js';
import { firePins } from './projectiles.js';
import { addShake, burst, screenFlash } from './effects.js';

export function createPlayer(mods) {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2 + 60,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    aim: -Math.PI / 2,
    hp: mods.hp,
    invuln: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashReady: 0,
    dashX: 0,
    dashY: -1,
    hurt: 0,
    orbit: 0,
    recoil: 0,
  };
}

/** Moves the needle and handles its dash and firing for one step of the given intent. */
export function updatePlayer(run, intent, dt) {
  const p = run.player;
  const mods = run.mods;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurt = Math.max(0, p.hurt - dt * 3);
  p.dashReady = Math.max(0, p.dashReady - dt);
  p.recoil = Math.max(0, p.recoil - dt * 10);
  p.orbit += dt * 3.2;

  let mx = intent.moveX;
  let my = intent.moveY;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  if (intent.dash && p.dashReady <= 0) {
    const dirLen = Math.hypot(mx, my);
    p.dashX = dirLen > 0 ? mx / dirLen : Math.cos(p.angle);
    p.dashY = dirLen > 0 ? my / dirLen : Math.sin(p.angle);
    p.dashTimer = mods.dashTime;
    p.dashReady = mods.dashCooldown;
    p.invuln = Math.max(p.invuln, mods.dashTime + 0.08);
    run.events.push({ type: 'dash' });
    burst(run.fx, p.x, p.y, { count: 10, colors: ['#ffffff', '#d9dde3'], speed: 200, size: 4, life: 0.35 });
  }

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashX * mods.dashSpeed;
    p.vy = p.dashY * mods.dashSpeed;
  } else {
    const blend = 1 - Math.exp(-mods.accel * dt);
    p.vx += (mx * mods.speed - p.vx) * blend;
    p.vy += (my * mods.speed - p.vy) * blend;
  }

  p.x = clamp(p.x + p.vx * dt, 18, VIEW.width - 18);
  p.y = clamp(p.y + p.vy * dt, 18, VIEW.height - 18);

  const speed = Math.hypot(p.vx, p.vy);
  if (speed > 30) p.angle += angleDelta(p.angle, Math.atan2(p.vy, p.vx)) * Math.min(1, dt * 14);
  p.aim = Math.atan2(intent.aimY - p.y, intent.aimX - p.x);

  p.fireTimer -= dt;
  if (intent.fire && p.fireTimer <= 0) {
    p.fireTimer = mods.fireDelay;
    p.recoil = 1;
    firePins(run, p.x, p.y, p.aim);
  }
}

/** The guard buttons' positions this frame. */
export function buttonPositions(run) {
  const p = run.player;
  const out = [];
  for (let i = 0; i < run.mods.buttons; i += 1) {
    const a = p.orbit + (i / run.mods.buttons) * TAU;
    out.push({ x: p.x + Math.cos(a) * 44, y: p.y + Math.sin(a) * 44 });
  }
  return out;
}

/** Hurts the needle unless it is in mercy frames or dashing; returns true when it took the hit. */
export function hurtPlayer(run, amount = 1) {
  const p = run.player;
  if (p.invuln > 0 || run.outcome) return false;
  // The attract-mode and screenshot pilot is spared its last spool so its demo run goes on.
  p.hp = run.immortal ? Math.max(1, p.hp - amount) : p.hp - amount;
  p.invuln = run.mods.invulnTime;
  p.hurt = 1;
  run.stats.hits += 1;
  run.events.push({ type: 'hurt' });
  addShake(run.fx, 14);
  screenFlash(run.fx, '#e0473a', 0.55);
  burst(run.fx, p.x, p.y, { count: 16, colors: ['#d6333f', '#ff8a8a', '#ffffff'], speed: 260, size: 5, kind: 'fiber' });
  return true;
}
