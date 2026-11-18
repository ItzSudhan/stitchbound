// A run from start to finish: creates the run's state from its seed, mode and needle, and moves
// it along the quilt road. enterNode opens the patch the player picked and says which screen
// comes next; offers (notion drafts, relics, rests) are taken through takeOffer.
import { draftNotions } from '../items/notions.js';
import { draftRelics } from '../items/relics.js';
import { synergiesCompletedBy } from '../items/synergies.js';
import { needleById } from '../meta/needles.js';
import { dayKey, modeById } from '../meta/modes.js';
import { generateBoard } from '../world/quilt-gen.js';
import { extendRoad, generateRoad, reachableNodes } from './route-map.js';
import { createThread } from '../world/thread.js';
import { createEffects } from '../render/effects.js';
import { createCombo } from './scoring.js';
import { planNight, startNight } from '../world/nights.js';
import { createPlayer } from '../entities/player.js';
import { computeMods, gainRelic, refreshLoadout, takeNotion } from '../items/loadout.js';
import { eventForNode } from './events.js';
import { stockMerchant } from './merchant.js';
import { restChoices, takeRest } from './camp.js';
import { ROAD_LENGTH } from '../core/config.js';
import { createRandom, mixSeed } from '../core/random.js';

export function createRun({ seed, modeId = 'classic', needleId = 'steel' }) {
  const mode = modeById(modeId);
  const run = {
    seed,
    modeId: mode.id,
    needleId,
    endless: mode.endless,
    dayKey: mode.daily ? dayKey() : null,
    rng: createRandom(mixSeed(seed, 1)),
    fx: createEffects(seed),
    quilt: generateBoard(seed, 1),
    road: generateRoad(seed, mode.endless ? 15 : ROAD_LENGTH),
    node: null,
    depth: 0,
    owned: {},
    relics: [],
    synergies: [],
    extraHp: 0,
    sequins: 0,
    sequinPulse: 0,
    mods: null,
    player: null,
    thread: null,
    pins: [],
    shots: [],
    pickups: [],
    enemies: [],
    cinches: [],
    boss: null,
    night: null,
    inNight: false,
    waveTime: 0,
    wavePhase: 'idle',
    spawnQueue: [],
    waveTotal: 0,
    banner: null,
    clearTimer: 0,
    score: 0,
    combo: createCombo(),
    time: 0,
    outcome: null,
    events: [],
    announcements: [],
    seen: { pests: new Set(), patches: new Set() },
    offer: null,
    shop: null,
    event: null,
    goals: null,
    goalStart: { loops: 0 },
    stats: { goals: 0, kills: 0, loops: 0, biggestLoop: 0, mended: 0, hits: 0, picks: [], sequins: 0, nightsFought: 0, wyrmBeaten: false },
  };
  run.mods = computeMods(run).mods;
  run.player = createPlayer(run.mods);
  run.thread = createThread(run.player.x, run.player.y);
  if (needleById(needleId).startRelic) gainRelic(run, draftRelics(run.rng, [], 1)[0].id);
  return run;
}

/** The road patches the player may step to next. */
export function nextNodes(run) {
  return reachableNodes(run.road, run.node);
}

/** Steps onto a road patch; returns the screen it opens: 'play', 'cards', 'shop' or 'event'. */
export function enterNode(run, node) {
  run.node = node;
  run.depth = node.depth;
  node.visited = true;
  if (run.endless) extendRoad(run.road, node.depth + 6);
  run.events.push({ type: 'map' });
  if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
    run.inNight = true;
    startNight(run, planNight(run, node));
    refreshLoadout(run);
    run.thread = createThread(run.player.x, run.player.y);
    return 'play';
  }
  if (node.type === 'treasure') return offerRelics(run, 'A Sewing Box', 'Choose a relic to keep') ? 'cards' : finishNode(run);
  if (node.type === 'rest') {
    run.offer = { kind: 'rest', title: 'Tea & Rest', subtitle: 'A quiet patch. Choose one comfort.', choices: restChoices(run) };
    return 'cards';
  }
  if (node.type === 'merchant') {
    run.shop = stockMerchant(run, node);
    return 'shop';
  }
  run.event = eventForNode(run, node);
  return 'event';
}

/** After a cleared night: the notion draft (four cards with a Needle Case). */
export function offerNotions(run) {
  const choices = draftNotions(run.rng, run.owned, run.mods.draftSize).map((n) => ({
    kind: 'notion',
    id: n.id,
    name: n.name,
    text: n.text,
    color: n.color,
    level: run.owned[n.id] ?? 0,
    completes: synergiesCompletedBy(run.owned, run.relics, { notion: n.id }).map((s) => s.name),
  }));
  run.offer = { kind: 'notion', title: `NIGHT ${run.depth} SURVIVED`, subtitle: 'Choose a notion for your sewing box', choices };
}

function offerRelics(run, title, subtitle) {
  const choices = draftRelics(run.rng, run.relics, 3).map((r) => ({
    kind: 'relic',
    id: r.id,
    name: r.name,
    text: r.text,
    color: r.color,
    completes: synergiesCompletedBy(run.owned, run.relics, { relic: r.id }).map((s) => s.name),
  }));
  if (choices.length === 0) return false;
  run.offer = { kind: 'relic', title, subtitle, choices };
  return true;
}

/** Takes card `index` of the open offer; returns the next screen ('cards' or 'map'). */
export function takeOffer(run, index) {
  const offer = run.offer;
  const choice = offer.choices[index];
  if (!choice) return 'cards';
  if (offer.kind === 'notion') {
    takeNotion(run, choice.id);
    if (run.night && (run.night.elite || run.night.boss) && offerRelics(run, run.night.boss ? 'THE BOSS FALLS' : 'ELITE SPOILS', 'Choose a relic')) return 'cards';
  } else if (offer.kind === 'relic') gainRelic(run, choice.id);
  else takeRest(run, choice.id);
  run.events.push({ type: 'pick' });
  return finishNode(run);
}

/** Leaves the current patch for the road map. */
export function finishNode(run) {
  run.inNight = false;
  run.offer = null;
  run.shop = null;
  run.event = null;
  run.wavePhase = 'idle';
  refreshLoadout(run);
  return 'map';
}
