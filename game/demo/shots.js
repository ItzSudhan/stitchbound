// Deterministic scenes for screenshots and tests, behind ?shot=<name>&seed=<n>. Every scene is a
// real run of the game's own rules, played by the autopilot through the run driver and stopped
// at the moment the scene names:
//   cover  the Moth Matriarch fight at its busiest moment, a loop cinching
//   coop   a Two Needles run: a bound loop of both threads closing around the Matriarch
//   road   the quilt road, mid-run, with the path sewn so far
//   draft  a notion draft where a card would complete a synergy
//   shop   the Peddler's stall
//   event  a mystery patch
//   wyrm   the Yarn Wyrm fight
//   end    the results card of the run
//   title  the title screen over its attract-mode quilt, with this seed's run as the best score
// "Busiest moment" is found by playing the run once, scoring every frame, then replaying the
// same seed to the best frame: the run is deterministic, so the replay is the same game.
import { driveRun } from './run-driver.js';
import { summarizeRun } from '../run/summary.js';
import { distance, pointInPolygon, polygonArea } from '../core/geometry.js';

function replayToBest(options, score) {
  let bestStep = -1;
  let bestScore = -Infinity;
  driveRun(options, (run, step, screen) => {
    if (screen !== 'play') return false;
    const s = score(run);
    if (s > bestScore) {
      bestScore = s;
      bestStep = step;
    }
    return false;
  });
  return driveRun(options, (run, step) => step >= bestStep).run;
}

/** How much is going on: a fresh cinch, flying shots, creatures and particles. */
function spectacle(run) {
  const fresh = run.cinches.filter((c) => c.age > 0.04 && c.age < 0.16);
  const caught = fresh.reduce((n, c) => n + c.caught, 0);
  return (fresh.length > 0 ? 60 + caught * 18 : 0) + Math.min(60, run.shots.length) * 0.8 + run.enemies.length * 2 + Math.min(300, run.fx.particles.length) * 0.05 + run.pins.length * 0.3;
}

function bossOnScreen(run, kind) {
  return run.enemies.find((e) => e.kind === kind && !e.dead && !e.entering && e.x > 200 && e.x < 1080 && e.y > 200 && e.y < 600);
}

function coverScore(run) {
  const boss = run.depth === 10 ? bossOnScreen(run, 'matriarch') : null;
  if (!boss) return -1;
  const p = run.player;
  if (boss.flash > 0.5 || run.fx.flash > 0.02 || run.fx.floaters.length > 12 || run.announcements.length > 0) return -1;
  if (p.x < 120 || p.x > 1160 || p.y < 160 || p.y > 600 || p.invuln > 0 || boss.y > 520) return -1;
  const apart = Math.hypot(p.x - boss.x, p.y - boss.y);
  const offCentre = Math.hypot(boss.x - 640, boss.y - 400);
  const spacing = apart < 190 ? -120 : apart < 430 ? 30 : 0;
  const spools = p.hp <= 1 ? -60 : p.hp >= 3 ? 25 : 0;
  return spectacle(run) - offCentre * 0.12 + (boss.spiralLeft > 0 ? 40 : 0) + (boss.hp / boss.maxHp) * 60 + spools + spacing;
}

/** The co-op shot: a fresh bound loop, the bigger and the more it holds the better, the Matriarch inside. */
function coopScore(run) {
  if (!run.partner) return -1;
  const fresh = run.cinches.find((c) => c.bound && c.age > 0.02 && c.age < 0.16);
  if (!fresh) return -1;
  if (run.fx.flash > 0.12) return -1;
  for (const n of [run.player, run.partner]) {
    if (n.x < 40 || n.x > 1240 || n.y < 40 || n.y > 640) return -1;
  }
  // Best of all: the Matriarch herself inside the bound loop; else any boss in view, else pests.
  const boss = run.enemies.find((e) => (e.kind === 'matriarch' || e.kind === 'wyrm') && !e.dead && !e.entering && e.x > 120 && e.x < 1160 && e.y > 170 && e.y < 620);
  const holdsBoss = boss && pointInPolygon(boss.x, boss.y, fresh.polygon) ? 260 : 0;
  const bossBonus = boss ? (boss.kind === 'matriarch' ? 200 : 120) : 0;
  const apart = distance(run.player.x, run.player.y, run.partner.x, run.partner.y);
  return holdsBoss + bossBonus + Math.min(200, Math.sqrt(polygonArea(fresh.polygon)) * 0.6) + fresh.caught * 25 + (apart > 160 ? 40 : 0) + spectacle(run) * 0.3;
}

export function stageShot(name, seed, needleId = 'steel') {
  const options = { seed, needleId };
  switch (name) {
    case 'cover': {
      const run = replayToBest(options, coverScore);
      return { screen: 'play', run, time: run.time };
    }
    case 'coop': {
      // Two Needles: the Matriarch fight in a co-op run, as a bound loop of red and blue thread
      // closes around her. Captioned, since it is the shot that names the feature.
      const run = replayToBest({ ...options, coop: true }, coopScore);
      return { screen: 'play', run, time: run.time, caption: 'TWO NEEDLES · LOCAL CO-OP' };
    }
    case 'wyrm': {
      const run = replayToBest(options, (r) => (r.depth === 5 && bossOnScreen(r, 'wyrm') ? spectacle(r) : -1));
      return { screen: 'play', run, time: run.time };
    }
    case 'road': {
      const { run } = driveRun(options, (r, step, screen) => screen === 'map-choice' && r.depth >= 6);
      return { screen: 'map', run, time: run.time };
    }
    case 'draft': {
      let fallback = null;
      const { run, screen } = driveRun(options, (r, step, s) => {
        if (s !== 'cards-open' || r.offer.kind !== 'notion' || r.depth < 3) return false;
        fallback = fallback ?? r.depth;
        return r.offer.choices.some((c) => c.completes.length > 0) || r.depth >= 8;
      });
      return { screen, run, time: run.time, cardAge: 2 };
    }
    case 'shop': {
      const { run, screen } = driveRun(options, (r, step, s) => s === 'shop-open' && r.sequins >= 40);
      return { screen, run, time: run.time };
    }
    case 'event': {
      const { run, screen } = driveRun(options, (r, step, s) => s === 'event' && r.event && !r.event.result);
      return { screen, run, time: run.time };
    }
    case 'end': {
      const { run } = driveRun(options, () => false);
      return { screen: 'over', run, summary: summarizeRun(run, 0), time: run.time };
    }
    case 'title': {
      // The title as it looks after this seed's run has been played once: its score is the best.
      const best = driveRun(options, () => false).run.score;
      const calm = (r) => r.fx.floaters.length === 0;
      const { run } = driveRun(options, (r) => r.inNight && r.time > 9 && calm(r));
      return { screen: 'title', run, time: 9, best };
    }
    default:
      return null;
  }
}
