// Boot and the one loop of Stitchbound. Input is read every frame, the game advances in fixed
// 1/60 s steps, and a screen state machine moves between the title, the quilt road, a night,
// card choices, the peddler, mystery events, pause and the results card.
// ?seed=N fixes a run; ?shot=<name> stages a screenshot scene (demo/shots.js); ?demo=1 lets the
// autopilot play everything. window.__stitch exposes the state to the headless play-test tools.
import { STEP, VIEW } from './core/config.js';
import { createRun, enterNode, finishNode, nextNodes, offerNotions, takeOffer } from './run/run.js';
import { stepNight } from './run/night.js';
import { buyItem } from './run/merchant.js';
import { chooseEventOption } from './run/events.js';
import { summarizeRun } from './run/summary.js';
import { MODES, modeById, seedForMode } from './meta/modes.js';
import { NEEDLES, isUnlocked } from './meta/needles.js';
import { currentProgress, recordRunProgress } from './meta/progress.js';
import { drawScene } from './render/scene.js';
import { drawCursor, drawHud } from './ui/hud.js';
import { drawTitle, titleLayout } from './ui/title-screen.js';
import { drawRoad, nodeRect, visibleNodes } from './ui/road-screen.js';
import { cardRects, drawCards } from './ui/cards-screen.js';
import { drawShop, shopLayout } from './ui/shop-screen.js';
import { drawEvent, eventLayout } from './ui/event-screen.js';
import { drawResults } from './ui/results-screen.js';
import { drawPause } from './ui/pause-screen.js';
import { createPilot, pilotChooseCard, pilotChooseNode, pilotChooseOption, pilotChooseWare, pilotIntent } from './demo/autopilot.js';
import { stageShot } from './demo/shots.js';
import { createAudio } from './audio/sound.js';
import { createInput } from './core/input.js';
import { bestScore, recordScore } from './core/storage.js';
import { inRect } from './core/geometry.js';

const MAX_FRAME = 0.25;
const END_DELAY = 1.8;
const IDLE = { moveX: 0, moveY: 0, aimX: 640, aimY: 400, fire: false, dash: false };

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const fixedSeed = Number.isInteger(seedParam) ? seedParam : null;
const demo = params.get('demo') === '1';
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const state = {
  screen: 'title',
  run: null,
  demoRun: null,
  pilot: createPilot(),
  hover: null,
  cardAge: 0,
  menuWait: 0,
  endTimer: 0,
  summary: null,
  clock: 0,
  modeIndex: 0,
  needleIndex: 0,
  progress: currentProgress(),
};

let pixelScale = 1;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const cssWidth = Math.floor(VIEW.width * scale);
  const cssHeight = Math.floor(VIEW.height * scale);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  pixelScale = shotName ? 1 : Math.min(2, Math.max(1, (cssWidth / VIEW.width) * (window.devicePixelRatio || 1)));
  canvas.width = Math.round(VIEW.width * pixelScale);
  canvas.height = Math.round(VIEW.height * pixelScale);
}

function announce(text) {
  if (status) status.textContent = text;
}

function autopiloted() {
  return demo || window.__stitch.pilotOn;
}

function currentMode() {
  return MODES[state.modeIndex];
}

function bestForMode() {
  const mode = currentMode();
  return bestScore(mode.id, mode.daily ? seedForMode(mode, null).toString() : null);
}

function startDemo() {
  const run = createRun({ seed: fixedSeed ?? 7 });
  run.immortal = true;
  enterNode(run, nextNodes(run)[0]);
  state.demoRun = run;
  state.pilot = createPilot();
}

function startRun() {
  const mode = currentMode();
  const needle = NEEDLES[state.needleIndex];
  if (!isUnlocked(needle, state.progress)) return;
  state.run = createRun({ seed: seedForMode(mode, fixedSeed), modeId: mode.id, needleId: needle.id });
  state.pilot = createPilot();
  state.endTimer = 0;
  setScreen('map');
  audio.play('start');
  announce('The quilt road. Choose your first patch.');
}

function goToTitle() {
  state.run = null;
  state.progress = currentProgress();
  startDemo();
  setScreen('title');
  announce('Stitchbound. Click or press Enter to begin.');
}

function setScreen(screen) {
  state.screen = screen;
  state.hover = null;
  state.cardAge = 0;
  state.menuWait = 0;
}

function goToNode(node) {
  setScreen(enterNode(state.run, node));
  audio.play('map');
  if (state.screen === 'play') announce(`Night ${state.run.depth}: ${state.run.night.name}.`);
}

function finishRun() {
  const run = state.run;
  const mode = modeById(run.modeId);
  const dayKey = mode.daily ? String(run.seed) : null;
  const previous = bestScore(mode.id, dayKey);
  recordScore(mode.id, run.score, dayKey);
  const unlocked = recordRunProgress(run);
  state.progress = currentProgress();
  state.summary = summarizeRun(run, previous, unlocked);
  setScreen('over');
  if (run.outcome === 'win') audio.play('win');
  announce(`Run over. Score ${run.score}. Press Enter to sew again.`);
}

function playerIntent(run) {
  if (autopiloted()) return pilotIntent(run, state.pilot, STEP);
  const move = input.moveVector();
  return {
    moveX: move.x,
    moveY: move.y,
    aimX: input.mouse.x,
    aimY: input.mouse.y,
    fire: input.mouse.down || input.isHeld('KeyJ'),
    dash: input.anyPressed('Space', 'ShiftLeft', 'ShiftRight', 'MouseRight'),
  };
}

function drainEvents(run) {
  for (const event of run.events) audio.play(event.type, event);
  run.events.length = 0;
}

/** One-shot presses and clicks for the current screen. */
function handleMenus() {
  const m = input.mouse;
  const confirm = input.anyPressed('Enter', 'NumpadEnter');
  const digit = input.digitPressed();
  if (input.anyPressed('KeyM')) audio.toggleMute();
  const run = state.run;
  switch (state.screen) {
    case 'title': {
      const layout = titleLayout();
      state.hover = Object.keys(layout).find((key) => inRect(m.x, m.y, layout[key])) ?? null;
      const step = (list, index, by) => (index + by + list.length) % list.length;
      if (input.anyPressed('ArrowLeft') || (m.clicked && state.hover === 'needlePrev')) state.needleIndex = step(NEEDLES, state.needleIndex, -1);
      if (input.anyPressed('ArrowRight') || (m.clicked && state.hover === 'needleNext')) state.needleIndex = step(NEEDLES, state.needleIndex, 1);
      if (input.anyPressed('ArrowUp') || (m.clicked && state.hover === 'modePrev')) state.modeIndex = step(MODES, state.modeIndex, -1);
      if (input.anyPressed('ArrowDown') || (m.clicked && state.hover === 'modeNext')) state.modeIndex = step(MODES, state.modeIndex, 1);
      if (confirm || (m.clicked && (!state.hover || state.hover === 'start')) || demo) startRun();
      if (input.anyPressed('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown')) audio.play('select');
      break;
    }
    case 'map': {
      const reachable = nextNodes(run);
      state.hover = visibleNodes(run).find((node) => reachable.includes(node) && inRect(m.x, m.y, nodeRect(run, node))) ?? null;
      if (digit >= 0 && reachable[digit]) goToNode(reachable[digit]);
      else if (m.clicked && state.hover) goToNode(state.hover);
      break;
    }
    case 'play':
      if (input.anyPressed('KeyP', 'Escape')) {
        setScreen('pause');
        audio.play('pause');
        announce('Paused.');
      }
      break;
    case 'pause':
      if (input.anyPressed('KeyP', 'Escape')) {
        state.screen = 'play';
        audio.play('pause');
      } else if (input.anyPressed('KeyR')) startRun();
      break;
    case 'cards': {
      const rects = cardRects(run.offer.choices.length);
      const hover = rects.findIndex((r) => inRect(m.x, m.y, r));
      if (hover !== state.hover && hover >= 0) audio.play('hover');
      state.hover = hover >= 0 ? hover : null;
      if (state.cardAge < 0.35) break;
      const pick = digit >= 0 ? digit : m.clicked && hover >= 0 ? hover : -1;
      if (pick >= 0 && pick < run.offer.choices.length) {
        audio.play('pick');
        setScreen(takeOffer(run, pick));
      }
      break;
    }
    case 'shop': {
      const layout = shopLayout(run.shop);
      const hover = layout.items.findIndex((r) => inRect(m.x, m.y, r));
      state.hover = hover >= 0 ? hover : inRect(m.x, m.y, layout.leave) ? 'leave' : null;
      const pick = digit >= 0 ? digit : m.clicked && hover >= 0 ? hover : -1;
      if (pick >= 0 && run.shop.items[pick]) audio.play(buyItem(run, run.shop, run.shop.items[pick]) ? 'buy' : 'deny');
      else if (confirm || (m.clicked && state.hover === 'leave')) setScreen(finishNode(run));
      break;
    }
    case 'event': {
      const event = run.event;
      const layout = eventLayout(event);
      if (event.result) {
        state.hover = inRect(m.x, m.y, layout.onward) ? 'onward' : null;
        if (confirm || (m.clicked && state.hover === 'onward')) setScreen(finishNode(run));
        break;
      }
      const hover = layout.options.findIndex((r) => inRect(m.x, m.y, r));
      state.hover = hover >= 0 ? hover : null;
      const pick = digit >= 0 ? digit : m.clicked && hover >= 0 ? hover : -1;
      if (pick >= 0 && !chooseEventOption(run, event, pick)) audio.play('deny');
      break;
    }
    case 'over':
      if (input.anyPressed('Escape')) goToTitle();
      else if ((confirm || m.clicked) && state.endTimer > 0.6) startRun();
      break;
    default:
      break;
  }
}

/** With the autopilot on (?demo=1 or a test), it makes the menu choices too, after a beat. */
function autoMenus(dt) {
  const run = state.run;
  state.menuWait += dt;
  if (state.menuWait < 0.4) return;
  state.menuWait = 0;
  if (state.screen === 'map') goToNode(pilotChooseNode(run, nextNodes(run)));
  else if (state.screen === 'cards') setScreen(takeOffer(run, pilotChooseCard(run, run.offer)));
  else if (state.screen === 'shop') {
    const ware = pilotChooseWare(run, run.shop);
    if (ware >= 0) buyItem(run, run.shop, run.shop.items[ware]);
    else setScreen(finishNode(run));
  } else if (state.screen === 'event') {
    if (!run.event.result) chooseEventOption(run, run.event, pilotChooseOption(run, run.event));
    else setScreen(finishNode(run));
  } else if (state.screen === 'over' && demo) startRun();
}

function update(dt) {
  state.clock += dt;
  state.cardAge += dt;
  if (state.screen === 'title') {
    if (!state.demoRun || state.demoRun.outcome || state.demoRun.wavePhase === 'draft') startDemo();
    const run = state.demoRun;
    stepNight(run, pilotIntent(run, state.pilot, dt), dt);
    run.events.length = 0;
    audio.setMusic('calm');
    return;
  }
  const run = state.run;
  if (state.screen === 'pause') return;
  if (state.screen === 'play') {
    stepNight(run, playerIntent(run), dt);
    drainEvents(run);
    audio.setMusic(run.enemies.some((e) => e.boss) ? 'boss' : 'calm');
    if (run.outcome) {
      state.endTimer += dt;
      if (state.endTimer >= END_DELAY) {
        state.endTimer = 0;
        finishRun();
      }
    } else if (run.wavePhase === 'draft') {
      offerNotions(run);
      setScreen('cards');
      announce(`Night ${run.depth} survived. Choose a notion.`);
    }
    return;
  }
  if (state.screen === 'over') state.endTimer += dt;
  stepNight(run, IDLE, dt);
  drainEvents(run);
  audio.setMusic('calm');
  if (autopiloted()) autoMenus(dt);
}

function render() {
  const t = state.clock;
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  if (state.screen === 'title') {
    drawScene(ctx, state.demoRun, t);
    drawTitle(ctx, { best: bestForMode(), time: t, modeIndex: state.modeIndex, needleIndex: state.needleIndex, progress: state.progress, hover: state.hover });
    return;
  }
  const run = state.run;
  const field = state.screen === 'play' || state.screen === 'pause' || (state.screen === 'cards' && run.inNight) || state.screen === 'over';
  drawScene(ctx, run, t, { needle: field });
  switch (state.screen) {
    case 'map':
      drawRoad(ctx, run, { reachable: nextNodes(run), hover: state.hover, time: t });
      break;
    case 'cards':
      if (run.inNight) drawHud(ctx, run, bestForMode(), t);
      drawCards(ctx, run.offer, state.hover, state.cardAge);
      break;
    case 'shop':
      drawShop(ctx, run, run.shop, state.hover);
      break;
    case 'event':
      drawEvent(ctx, run, run.event, state.hover, t);
      break;
    case 'over':
      drawResults(ctx, state.summary, t);
      break;
    default:
      drawHud(ctx, run, bestForMode(), t);
      if (state.screen === 'pause') drawPause(ctx, audio.muted);
  }
  const aiming = state.screen === 'play' && input.mouse.moved && !shotName;
  canvas.style.cursor = aiming ? 'none' : 'default';
  if (aiming) drawCursor(ctx, input.mouse.x, input.mouse.y, input.mouse.down);
}

let last = 0;
let carry = 0;
function frame(now) {
  const elapsed = last === 0 ? STEP : Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  carry += elapsed;
  if (input.mouse.clicked || input.anyPressed('Enter', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD')) audio.unlock();
  handleMenus();
  while (carry >= STEP) {
    update(STEP);
    carry -= STEP;
  }
  render();
  input.endFrame();
  window.requestAnimationFrame(frame);
}

function pauseOnBlur() {
  if (state.screen === 'play') {
    setScreen('pause');
    announce('Paused.');
  }
}

function stage(name) {
  const needle = params.get('needle') ?? 'steel';
  const scene = stageShot(name, fixedSeed ?? 1, needle);
  if (!scene) return;
  state.clock = scene.time;
  state.screen = scene.screen;
  state.cardAge = scene.cardAge ?? 2;
  state.hover = scene.screen === 'cards' ? 1 : null;
  if (scene.screen === 'title') state.demoRun = scene.run;
  else state.run = scene.run;
  if (scene.summary) state.summary = scene.summary;
  render();
  render();
  window.__shotReady = true;
}

fitCanvas();
window.addEventListener('resize', fitCanvas);
window.addEventListener('blur', pauseOnBlur);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseOnBlur();
});
window.__stitch = {
  state,
  startRun,
  pilotOn: false,
  /** Test hook: runs the game's own update for up to `seconds`, stopping early on `until` screen. */
  fastForward(seconds, until = null) {
    for (let i = 0; i < seconds / STEP; i += 1) {
      update(STEP);
      if (until && state.screen === until) break;
    }
    return state.screen;
  },
  /** Test hook: steps the run straight onto the first patch of road column `depth`. */
  enterDepth(depth) {
    const node = state.run.road.columns[depth - 1][0];
    goToNode(node);
    return state.screen;
  },
  /** Test hook: steps onto the first road patch of a type ('merchant', 'event', 'rest', ...). */
  enterPatch(type) {
    const node = state.run.road.columns.flat().find((n) => n.type === type);
    if (!node) return null;
    goToNode(node);
    return state.screen;
  },
};

if (shotName) stage(shotName);
else {
  goToTitle();
  window.requestAnimationFrame(frame);
}
