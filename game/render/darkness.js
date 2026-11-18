// The dark of the deep nights: an indigo veil over the quilt with soft pools of light cut out of
// it around the needle, the lit candles and any loop as it cinches.
import { VIEW } from '../core/config.js';
import { darknessFor, lightSources } from '../world/lighting.js';

let veil = null;

export function drawDarkness(ctx, run, time) {
  const dark = darknessFor(run.depth);
  if (dark <= 0 || !run.player) return;
  if (!veil) {
    veil = document.createElement('canvas');
    veil.width = VIEW.width;
    veil.height = VIEW.height;
  }
  const v = veil.getContext('2d');
  v.globalCompositeOperation = 'source-over';
  v.clearRect(0, 0, VIEW.width, VIEW.height);
  v.fillStyle = `rgba(10,8,30,${dark.toFixed(3)})`;
  v.fillRect(0, 0, VIEW.width, VIEW.height);
  v.globalCompositeOperation = 'destination-out';
  for (const light of lightSources(run)) {
    const r = light.r * (light.candle ? 1 + Math.sin(time * 9 + light.x) * 0.03 : 1);
    const glow = v.createRadialGradient(light.x, light.y, r * 0.25, light.x, light.y, r);
    glow.addColorStop(0, 'rgba(0,0,0,1)');
    glow.addColorStop(0.6, 'rgba(0,0,0,0.7)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    v.fillStyle = glow;
    v.beginPath();
    v.arc(light.x, light.y, r, 0, Math.PI * 2);
    v.fill();
  }
  v.globalCompositeOperation = 'source-over';
  ctx.drawImage(veil, 0, 0);
  // A warm tint where the candles burn.
  ctx.globalCompositeOperation = 'lighter';
  for (const light of lightSources(run)) {
    if (!light.candle) continue;
    const warm = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r * 0.8);
    warm.addColorStop(0, 'rgba(255,170,60,0.22)');
    warm.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = warm;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
