// The cut-felt look of every creature and object, drawn with canvas shapes: a soft drop shadow,
// a flat felt fill, a dark ink outline and a few stitched details. No image files.
import { PALETTE } from './config.js';
import { TAU } from './geometry.js';

const INK = PALETTE.ink;

export function drawShadow(ctx, x, y, rx, ry = rx * 0.55) {
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 8, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function inked(ctx, fill, width = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function flashOver(ctx, enemy) {
  return enemy.flash > 0.5 ? '#ffffff' : null;
}

/** The player: a silver needle, eye at the back, its red thread trailing from the eye. */
export function drawNeedle(ctx, p, time) {
  if (p.invuln > 0 && p.dashTimer <= 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  drawShadow(ctx, p.x, p.y, 22, 9);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const grad = ctx.createLinearGradient(0, -6, 0, 6);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, PALETTE.steel);
  grad.addColorStop(1, PALETTE.steelDark);
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.quadraticCurveTo(6, -6, -22, -6.5);
  ctx.arc(-22, 0, 6.5, -Math.PI / 2, Math.PI / 2, true);
  ctx.quadraticCurveTo(6, 6, 30, 0);
  ctx.closePath();
  inked(ctx, grad, 2.5);
  ctx.fillStyle = PALETTE.table;
  ctx.beginPath();
  ctx.ellipse(-20, 0, 5, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-10, -3.5, 26, 1.6);
  ctx.restore();
  // Aim tick: a small thimble-ring arrow showing where pins will fly.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.aim);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 30, -0.25, 0.25);
  ctx.stroke();
  ctx.fillStyle = PALETTE.thread;
  ctx.beginPath();
  ctx.moveTo(40 + p.recoil * -4, 0);
  ctx.lineTo(32, -5);
  ctx.lineTo(32, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawGuardButton(ctx, x, y) {
  drawShadow(ctx, x, y, 12, 7);
  drawButtonShape(ctx, x, y, 13, PALETTE.navy, '#6f8fb3');
}

function drawButtonShape(ctx, x, y, r, fill, rim) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  inked(ctx, fill, 2.5);
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, r * 0.11, 0, TAU);
    ctx.fill();
  }
}

/** A moth from above: four flapping felt wings with eye-spots, a furry body and feathered feelers. */
export function drawMoth(ctx, e, time, scale = 1) {
  const eating = e.state === 'eat';
  const flap = eating ? 0.55 + Math.sin(time * 5 + e.seed) * 0.1 : 0.55 + Math.abs(Math.sin(time * 16 + e.seed)) * 0.6;
  const r = e.r * scale;
  drawShadow(ctx, e.x, e.y, r * 1.3, r * 0.6);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle + Math.PI / 2);
  const flash = flashOver(ctx, e);
  const wing = flash ?? PALETTE.plumLight;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * flap, 1);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.3);
    ctx.bezierCurveTo(r * 0.9, -r * 1.25, r * 1.75, -r * 0.6, r * 1.45, r * 0.15);
    ctx.bezierCurveTo(r * 1.1, r * 0.45, r * 0.4, r * 0.2, 0, r * 0.1);
    inked(ctx, wing, 2.2);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.bezierCurveTo(r * 0.8, r * 0.2, r * 1.15, r * 0.75, r * 0.7, r * 1.05);
    ctx.bezierCurveTo(r * 0.35, r * 1.1, r * 0.1, r * 0.7, 0, r * 0.5);
    inked(ctx, flash ?? PALETTE.plum, 2.2);
    if (!flash) {
      ctx.fillStyle = '#e8d9b5';
      ctx.beginPath();
      ctx.arc(r * 0.95, -r * 0.35, r * 0.24, 0, TAU);
      ctx.fill();
      ctx.fillStyle = PALETTE.plum;
      ctx.beginPath();
      ctx.arc(r * 0.95, -r * 0.35, r * 0.11, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.28, r * 0.75, 0, 0, TAU);
  inked(ctx, flash ?? '#7a5a52', 2.2);
  ctx.strokeStyle = 'rgba(246,236,214,0.6)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * (0.2 + i * 0.22));
    ctx.lineTo(r * 0.22, r * (0.2 + i * 0.22));
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.1, -r * 0.55);
    ctx.quadraticCurveTo(side * r * 0.35, -r * 1.1, side * r * 0.6, -r * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSilverfish(ctx, e, time) {
  drawShadow(ctx, e.x, e.y, e.r * 1.4, e.r * 0.5);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  const wiggle = Math.sin(time * 22 + e.seed) * 0.25;
  const fill = flashOver(ctx, e) ?? PALETTE.steel;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-e.r, 0);
    ctx.lineTo(-e.r * 2.2, side * e.r * (0.6 + wiggle));
    ctx.moveTo(e.r * 0.9, 0);
    ctx.lineTo(e.r * 1.8, side * e.r * 0.7);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(e.r * 1.1, 0);
  ctx.quadraticCurveTo(e.r * 0.5, -e.r * 0.75, -e.r * 0.4, -e.r * 0.5 + wiggle * 4);
  ctx.lineTo(-e.r * 1.3, wiggle * 6);
  ctx.lineTo(-e.r * 0.4, e.r * 0.5 + wiggle * 4);
  ctx.quadraticCurveTo(e.r * 0.5, e.r * 0.75, e.r * 1.1, 0);
  inked(ctx, fill, 2);
  ctx.strokeStyle = PALETTE.steelDark;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(e.r * (0.5 - i * 0.45), -e.r * 0.5);
    ctx.lineTo(e.r * (0.5 - i * 0.45), e.r * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A beetle whose shell is a big four-hole button; it glows red while winding up a charge. */
export function drawBeetle(ctx, e, time) {
  const shake = e.state === 'windup' ? Math.sin(time * 60) * 2 : 0;
  drawShadow(ctx, e.x, e.y, e.r * 1.1);
  ctx.save();
  ctx.translate(e.x + shake, e.y);
  ctx.rotate(e.angle);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  const step = Math.sin(time * 14 + e.seed) * 4;
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * e.r * 0.5, 0);
      ctx.lineTo(i * e.r * 0.55 + (i === 0 ? step : -step) * side, side * e.r * 1.25);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(e.r * 0.95, 0, e.r * 0.42, 0, TAU);
  inked(ctx, INK, 2);
  ctx.restore();
  const rim = e.state === 'windup' ? PALETTE.danger : '#6f8fb3';
  drawButtonShape(ctx, e.x + shake, e.y, e.r, flashOver(ctx, e) ?? (e.state === 'charge' ? '#3d5a80' : PALETTE.navy), rim);
}

/** An earwig with silver scissor-blade pincers: it hunts the thread and snips it. */
export function drawSnipper(ctx, e, time) {
  drawShadow(ctx, e.x, e.y, e.r * 1.5, e.r * 0.55);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  const open = 0.25 + Math.abs(Math.sin(time * 9 + e.seed)) * 0.35;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(e.r * 0.9, side * 3);
    ctx.rotate(side * open);
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(e.r * 1.4, 0);
    ctx.lineTo(0, 3);
    ctx.closePath();
    inked(ctx, PALETTE.steel, 2);
    ctx.restore();
  }
  const fill = flashOver(ctx, e) ?? '#7a3b2e';
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(e.r * (0.5 - i * 0.6), 0, e.r * 0.45, e.r * (0.55 - i * 0.06), 0, 0, TAU);
    inked(ctx, i === 0 ? (flashOver(ctx, e) ?? '#5b2a20') : fill, 2);
  }
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.arc(e.r * 0.65, -e.r * 0.2, 2.5, 0, TAU);
  ctx.arc(e.r * 0.65, e.r * 0.2, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A walking tomato pincushion bristling with pins; it swells before it fires a fan of them. */
export function drawSpitter(ctx, e, time) {
  const swell = e.state === 'aim' ? 1 + Math.sin(time * 30) * 0.06 + 0.08 : 1;
  const r = e.r * swell;
  drawShadow(ctx, e.x, e.y, r * 1.1);
  ctx.save();
  ctx.translate(e.x, e.y);
  const legs = Math.sin(time * 10 + e.seed) * 3;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * TAU + 0.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * (r + 10) + legs, Math.sin(a) * (r + 10));
    ctx.stroke();
  }
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * TAU + 0.3;
    const len = r + 11;
    ctx.strokeStyle = PALETTE.steelDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(Math.cos(a) * len, Math.sin(a) * len, 4, 0, TAU);
    inked(ctx, [PALETTE.gold, PALETTE.sky, PALETTE.cream][i % 3], 1.5);
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  inked(ctx, flashOver(ctx, e) ?? PALETTE.thread, 2.5);
  ctx.strokeStyle = 'rgba(42,29,26,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.3 + i * 0.25), r, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU;
    const rr = i % 2 === 0 ? r * 0.45 : r * 0.18;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  inked(ctx, PALETTE.sage, 2);
  ctx.restore();
}

/** One ball of the Yarn Wyrm: wound yarn; the head has button eyes and a stitched grin. */
export function drawYarnBall(ctx, e, time, isHead) {
  const r = e.r * (e.radiusScale ?? 1);
  drawShadow(ctx, e.x, e.y, r);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  const fill = flashOver(ctx, e) ?? (isHead ? '#e07a5f' : e.index % 2 === 0 ? '#e07a5f' : '#f2a07b');
  inked(ctx, fill, 2.5);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,240,220,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * (0.25 + i * 0.16), (e.seed ?? 0) + i * 0.5 + time * (isHead ? 0 : 0.3), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  if (isHead) {
    ctx.rotate(e.angle);
    drawButtonShape(ctx, r * 0.35, -r * 0.4, r * 0.28, PALETTE.ink, '#555');
    drawButtonShape(ctx, r * 0.35, r * 0.4, r * 0.28, PALETTE.ink, '#555');
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(r * 0.2, 0, r * 0.65, -0.6, 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The Moth Matriarch: a vast plum moth with golden eye-spot wings and a feathered crown. */
export function drawMatriarch(ctx, e, time) {
  const r = e.r;
  const flap = 0.78 + Math.sin(time * 4) * 0.22;
  drawShadow(ctx, e.x, e.y + 30, r * 2.2, r * 0.7);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  const flash = flashOver(ctx, e);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * flap, 1);
    const fore = ctx.createLinearGradient(0, 0, r * 2.4, -r);
    fore.addColorStop(0, '#3e2a4d');
    fore.addColorStop(1, PALETTE.plumLight);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.9, -r * 1.5, r * 2.5, -r * 1.3, r * 2.35, -r * 0.1);
    ctx.bezierCurveTo(r * 2.0, r * 0.35, r * 0.8, r * 0.25, 0, r * 0.1);
    inked(ctx, flash ?? fore, 3.5);
    ctx.strokeStyle = 'rgba(246,236,214,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.3);
    ctx.bezierCurveTo(r * 0.9, -r * 1.1, r * 2.0, -r * 1.0, r * 2.1, -r * 0.2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.1);
    ctx.bezierCurveTo(r * 1.3, r * 0.2, r * 1.8, r * 1.1, r * 1.1, r * 1.5);
    ctx.bezierCurveTo(r * 0.5, r * 1.6, r * 0.15, r * 1.0, 0, r * 0.6);
    inked(ctx, flash ?? PALETTE.plum, 3.5);
    if (!flash) {
      for (const [ex, ey, er] of [[r * 1.45, -r * 0.45, r * 0.38], [r * 0.95, r * 0.85, r * 0.26]]) {
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = PALETTE.cream;
        ctx.beginPath();
        ctx.arc(ex, ey, er * 0.62, 0, TAU);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(ex, ey, er * 0.32, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0, r * 0.2, r * 0.34, r * 0.95, 0, 0, TAU);
  inked(ctx, flash ?? '#6b4b45', 3);
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.42, 0, TAU);
  inked(ctx, flash ?? PALETTE.cream, 3);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-r * 0.16, -r * 0.62, r * 0.1, 0, TAU);
  ctx.arc(r * 0.16, -r * 0.62, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.goldDeep;
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.15, -r * 0.8);
    ctx.quadraticCurveTo(side * r * 0.5, -r * 1.5, side * r * 0.95, -r * 1.55);
    ctx.stroke();
    for (let i = 1; i < 6; i += 1) {
      const t = i / 6;
      const bx = side * r * (0.15 + 0.8 * t);
      const by = -r * (0.8 + 0.75 * Math.sin(t * Math.PI * 0.6));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + side * 6, by - 9);
      ctx.stroke();
    }
    ctx.lineWidth = 4;
  }
  ctx.restore();
}

/** The player's pin: a steel shaft with a round head (gold for a Golden Eye crit). */
export function drawPin(ctx, pin) {
  const a = Math.atan2(pin.vy, pin.vx);
  ctx.save();
  ctx.translate(pin.x, pin.y);
  ctx.rotate(a);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-14, 0, pin.crit ? 6.5 : 5, 0, TAU);
  inked(ctx, pin.crit ? PALETTE.gold : PALETTE.thread, 2);
  ctx.restore();
}

/** A creature's shot: a fuzzy mote of moth dust, or a dark pincushion pin. */
export function drawShot(ctx, shot) {
  if (shot.kind === 'pin') {
    const a = Math.atan2(shot.vy, shot.vx);
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(a);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-10, 0, 5, 0, TAU);
    inked(ctx, PALETTE.danger, 2);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU + shot.spin;
    const rr = shot.r * (i % 2 === 0 ? 1.15 : 0.85);
    ctx.lineTo(shot.x + Math.cos(a) * rr, shot.y + Math.sin(a) * rr);
  }
  ctx.closePath();
  inked(ctx, '#c8a8d8', 2.2);
  ctx.fillStyle = '#f6ecd6';
  ctx.beginPath();
  ctx.arc(shot.x - 2, shot.y - 2, shot.r * 0.35, 0, TAU);
  ctx.fill();
}

/** A small badge icon for each notion (upgrade), drawn from felt shapes. */
export function drawUpgradeIcon(ctx, upgrade, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  inked(ctx, upgrade.color, 3);
  ctx.strokeStyle = 'rgba(255,248,230,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, s - 6, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const k = s / 40;
  ctx.scale(k, k);
  ctx.strokeStyle = INK;
  ctx.fillStyle = PALETTE.cream;
  ctx.lineWidth = 4;
  const pinGlyph = (px, py, rot, head = PALETTE.thread) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-18, 0, 8, 0, TAU);
    inked(ctx, head, 3);
    ctx.restore();
  };
  switch (upgrade.id) {
    case 'spool':
      ctx.beginPath();
      ctx.rect(-12, -16, 24, 32);
      inked(ctx, PALETTE.thread, 3);
      ctx.beginPath();
      ctx.rect(-18, -22, 36, 7);
      ctx.rect(-18, 15, 36, 7);
      inked(ctx, '#c9a26b', 3);
      break;
    case 'twin':
      pinGlyph(0, -9, -0.5);
      pinGlyph(0, 9, -0.5);
      break;
    case 'quick':
      pinGlyph(6, 0, 0);
      ctx.lineWidth = 4;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-28, i * 10);
        ctx.lineTo(-16, i * 10);
        ctx.stroke();
      }
      break;
    case 'wax':
    case 'mend':
      ctx.strokeStyle = upgrade.id === 'wax' ? PALETTE.thread : INK;
      ctx.lineWidth = 6;
      ctx.setLineDash([9, 6]);
      ctx.beginPath();
      if (upgrade.id === 'wax') ctx.arc(0, 0, 20, 0, TAU);
      else {
        ctx.moveTo(-18, -18);
        ctx.lineTo(18, 18);
        ctx.moveTo(18, -18);
        ctx.lineTo(-18, 18);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'thimble':
      ctx.beginPath();
      ctx.moveTo(-16, 20);
      ctx.lineTo(-14, -8);
      ctx.quadraticCurveTo(0, -26, 14, -8);
      ctx.lineTo(16, 20);
      ctx.closePath();
      inked(ctx, '#e6c46a', 3);
      ctx.fillStyle = INK;
      for (let i = 0; i < 6; i += 1) ctx.fillRect(-9 + (i % 3) * 8, -4 + Math.floor(i / 3) * 9, 3, 3);
      break;
    case 'swift':
    case 'snip':
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(-16, -5);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      inked(ctx, PALETTE.steel, 3);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-30, -12);
      ctx.lineTo(-20, -12);
      ctx.moveTo(-32, 12);
      ctx.lineTo(-20, 12);
      ctx.stroke();
      break;
    case 'ricochet':
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-22, -18);
      ctx.lineTo(0, 16);
      ctx.lineTo(22, -18);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'pierce':
      ctx.beginPath();
      ctx.arc(4, 0, 12, 0, TAU);
      inked(ctx, PALETTE.plumLight, 3);
      pinGlyph(0, 0, 0, PALETTE.gold);
      break;
    case 'barbed':
      ctx.strokeStyle = PALETTE.thread;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i <= 6; i += 1) ctx.lineTo(-24 + i * 8, i % 2 === 0 ? -10 : 10);
      ctx.stroke();
      break;
    case 'buttons':
      drawButtonShape(ctx, 0, 0, 20, PALETTE.cream, '#c9ada7');
      break;
    case 'golden':
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const rr = i % 2 === 0 ? 24 : 10;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      inked(ctx, PALETTE.gold, 3);
      break;
    default:
      pinGlyph(0, 0, -0.6);
  }
  ctx.restore();
}
