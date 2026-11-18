// One night of play, one fixed step at a time: the needle moves and lays thread, closed loops
// cinch, pests, pins and shots move, spools are picked up, and the night is checked for its end.
// A run is lost when the needle's spools run out or the quilt unravels.
import { mendInside, quiltIntegrity, updateQuilt } from '../world/quilt.js';
import { extendThread, threadTouches, updateThread } from '../world/thread.js';
import { updateNight } from '../world/nights.js';
import { updatePatches } from '../world/patches.js';
import { damageEnemy, updateEnemies } from '../entities/enemies.js';
import { buttonPositions, updatePlayer } from '../entities/player.js';
import { updatePins, updateShots } from '../entities/projectiles.js';
import { updatePickups } from '../entities/pickups.js';
import { addBonus, updateCombo } from './scoring.js';
import { PALETTE } from '../core/config.js';
import { addCallout, addShake, burst, floatText, hitStop, ring, screenFlash, updateEffects } from '../render/effects.js';
import { distance, easeInCubic, pointInPolygon, polygonArea, polygonCentroid } from '../core/geometry.js';

/** Advances the night by dt seconds under the player's intent {moveX, moveY, aimX, aimY, fire, dash}. */
export function stepNight(run, intent, dt) {
  const fx = run.fx;
  for (const note of run.announcements) note.age += dt;
  run.announcements = run.announcements.filter((note) => note.age < 3.2);
  if (fx.hitstop > 0) {
    fx.hitstop -= dt;
    updateEffects(fx, dt * 0.25);
    return;
  }
  run.time += dt;
  if (run.inNight && run.wavePhase !== 'draft' && !run.outcome) {
    updatePlayer(run, intent, dt);
    const loop = extendThread(run.thread, run.player.x, run.player.y, run.mods.threadLength);
    if (loop) cinchLoop(run, loop);
    updateEnemies(run, dt);
    stingWithThread(run, dt);
    guardWithButtons(run, dt);
    updatePins(run, dt);
    updateShots(run, dt);
    updatePickups(run, dt);
    updatePatches(run, dt);
    updateNight(run, dt);
  }
  updateThread(run.thread, dt);
  updateCombo(run, dt);
  updateQuilt(run.quilt, dt);
  updateCinches(run, dt);
  updateEffects(fx, dt);
  if (!run.outcome) {
    if (run.player.hp <= 0) loseRun(run, 'needle');
    else if (quiltIntegrity(run.quilt) <= 0) loseRun(run, 'quilt');
  } else if (run.outcome === 'win' && !run.celebrated) celebrate(run);
}

/** Dawn on a saved quilt: felt confetti bursts all over the field. */
function celebrate(run) {
  run.celebrated = true;
  const colors = [PALETTE.gold, PALETTE.thread, PALETTE.teal, PALETTE.rose, PALETTE.sky, PALETTE.cream];
  for (let i = 0; i < 9; i += 1) {
    const x = 140 + (i % 3) * 500 + run.rng.range(-60, 60);
    const y = 160 + Math.floor(i / 3) * 240 + run.rng.range(-40, 40);
    burst(run.fx, x, y, { count: 30, colors, speed: 420, size: 7, life: 2.2, gravity: 160 });
    ring(run.fx, x, y, PALETTE.gold, 140, 0.9, 8);
  }
  screenFlash(run.fx, PALETTE.gold, 0.5);
}

/** A closed loop pulls tight: everything inside takes the cinch, holes inside are darned shut. */
export function cinchLoop(run, polygon) {
  const fx = run.fx;
  const centre = polygonCentroid(polygon);
  const area = polygonArea(polygon);
  let caught = 0;
  for (const enemy of run.enemies) {
    if (enemy.dead || enemy.buried || !pointInPolygon(enemy.x, enemy.y, polygon)) continue;
    caught += 1;
    const damage = enemy.kind === 'matriarch' ? Math.min(450, run.mods.loopDamage * 1.4) : run.mods.loopDamage;
    damageEnemy(run, enemy, damage, 'loop');
    burst(fx, enemy.x, enemy.y, { count: 8, colors: [PALETTE.thread, PALETTE.gold], speed: 180, size: 6, kind: 'spark' });
  }
  // Quilting Hoop: the cinch sends a shockwave through the pests around it.
  if (run.mods.hoopWave > 0) {
    const reach = 140 + Math.sqrt(area) * 0.5;
    for (const enemy of run.enemies) {
      if (!enemy.dead && distance(enemy.x, enemy.y, centre.x, centre.y) < reach) damageEnemy(run, enemy, run.mods.hoopWave, 'hoop');
    }
    ring(fx, centre.x, centre.y, PALETTE.goldDeep, reach, 0.5, 6);
  }
  const mended = mendInside(run.quilt, polygon, run.mods.mendAmount);
  if (caught >= 2) addCallout(fx, `STITCH x${caught}!`, PALETTE.gold);
  else if (run.quilt.lastMended >= 2) addCallout(fx, `MENDED x${run.quilt.lastMended}!`, '#7df0c8');
  run.stats.loops += 1;
  run.stats.mended += mended;
  run.stats.biggestLoop = Math.max(run.stats.biggestLoop, caught);
  run.cinches.push({ polygon, centre, caught, age: 0, life: 0.38 });
  for (let i = 0; i < polygon.length; i += 3) {
    burst(fx, polygon[i].x, polygon[i].y, { count: 1, colors: [PALETTE.gold, PALETTE.threadLight], speed: 60, size: 6, kind: 'spark', life: 0.5 });
  }
  ring(fx, centre.x, centre.y, PALETTE.gold, Math.sqrt(area) * 0.8, 0.5, 8);
  if (caught > 0) {
    const bonus = 50 * caught * caught;
    addBonus(run, bonus, caught > 1 ? `STITCH x${caught}` : 'STITCHED', centre.x, centre.y - 30);
    hitStop(fx, Math.min(0.12, 0.04 + caught * 0.015));
    addShake(fx, 6 + caught * 2);
    if (caught >= 4) screenFlash(fx, PALETTE.gold, 0.35);
    if (run.mods.loopHeal && caught >= 3 && run.player.hp < run.mods.hp) {
      run.player.hp += 1;
      floatText(fx, run.player.x, run.player.y - 40, '+1 SPOOL', PALETTE.threadLight, 24);
    }
  } else if (mended > 0.05) {
    floatText(fx, centre.x, centre.y, 'MENDED', PALETTE.gold, 26);
  }
  run.events.push({ type: 'cinch', caught, mended });
}

function updateCinches(run, dt) {
  for (const cinch of run.cinches) cinch.age += dt;
  run.cinches = run.cinches.filter((c) => c.age < c.life);
}

/** The loop polygon of a cinch at its current, shrinking size. */
export function cinchShape(cinch) {
  const k = 1 - easeInCubic(Math.min(1, cinch.age / cinch.life)) * 0.85;
  return cinch.polygon.map((p) => ({ x: cinch.centre.x + (p.x - cinch.centre.x) * k, y: cinch.centre.y + (p.y - cinch.centre.y) * k }));
}

/** Barbed Thread: pests that cross the laid thread take damage over time. */
function stingWithThread(run, dt) {
  if (run.mods.barbed <= 0 || run.thread.points.length < 6) return;
  for (const enemy of run.enemies) {
    if (enemy.dead || enemy.kind === 'matriarch') continue;
    if (threadTouches(run.thread, enemy.x, enemy.y, enemy.r)) damageEnemy(run, enemy, run.mods.barbed * dt, 'thread');
  }
}

/** Button Guard: the orbiting buttons bump pests they pass through. */
function guardWithButtons(run, dt) {
  if (run.mods.buttons <= 0) return;
  for (const b of buttonPositions(run)) {
    for (const enemy of run.enemies) {
      if (!enemy.dead && distance(b.x, b.y, enemy.x, enemy.y) < enemy.r + 14) damageEnemy(run, enemy, run.mods.buttonDamage * dt, 'button');
    }
  }
}

function loseRun(run, reason) {
  run.outcome = reason;
  run.events.push({ type: 'lose' });
  addShake(run.fx, 24);
  hitStop(run.fx, 0.35);
  burst(run.fx, run.player.x, run.player.y, { count: 40, colors: [PALETTE.thread, PALETTE.steel, PALETTE.cream], speed: 320, size: 6, kind: 'fiber' });
}
