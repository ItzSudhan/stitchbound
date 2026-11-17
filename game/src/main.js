// Boot and the one loop of Stitchbound. Input is read every frame, the run advances in fixed
// 1/60 s steps, and the screen state machine moves between title, play, draft, pause and over.
// ?seed=N fixes a run; ?shot=<name> stages a screenshot scene (see shots.js); ?demo=1 lets the
// autopilot play. window.__stitch exposes the state to the headless play-test tool.
import { STEP, VIEW } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRun, stepRun, beginNextWave } from './game.js';
import { drawScene } from './render.js';
import { drawHud } from './hud.js';
import { drawDraft, drawPause, drawResults, drawTitle, draftCardRects } from './screens.js';
import { draftUpgrades, takeUpgrade } from './upgrades.js';
import { createPilot, pilotIntent, pilotPick } from './autopilot.js';
import { readBest, recordScore } from './storage.js';
import { summarizeRun } from './summary.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const END_DELAY = 1.8;

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const fixedSeed = Number.isInteger(seedParam) ? seedParam : null;
const demo = params.get('demo') === '1';
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const state = {
  screen: 'title',
  run: null,
  demoRun: null,
  pilot: createPilot(),
  choices: [],
  hover: -1,
  draftAge: 0,
  endTimer: 0,
  summary: null,
  best: readBest(),
  clock: 0,
};

function newSeed() {
  return fixedSeed ?? Math.floor(Math.random() * 4294967296);
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}

function announce(text) {
  if (status) status.textContent = text;
}

function startDemo() {
  state.demoRun = createRun(newSeed());
  state.demoRun.immortal = true;
  state.pilot = createPilot();
}

function startRun() {
  state.run = createRun(newSeed());
  state.pilot = createPilot();
  state.screen = 'play';
  state.endTimer = 0;
  audio.play('start');
  announce('Night 1 begins. Circle the moths to stitch them.');
}

function goToTitle() {
  state.screen = 'title';
  state.run = null;
  startDemo();
  announce('Stitchbound. Click or press Enter to begin.');
}

function openDraft() {
  const run = state.run;
  state.choices = draftUpgrades(run.rng, run.owned);
  state.hover = -1;
  state.draftAge = 0;
  state.screen = 'draft';
  announce(`Night ${run.wave} survived. Choose a notion: ${state.choices.map((c) => c.name).join(', ')}.`);
}

function choose(index) {
  const pick = state.choices[index];
  if (!pick) return;
  takeUpgrade(state.run, pick.id);
  audio.play('pick');
  beginNextWave(state.run);
  state.screen = 'play';
}

function finishRun() {
  const run = state.run;
  const previous = readBest();
  recordScore(run.score);
  state.summary = summarizeRun(run, previous);
  state.best = readBest();
  state.screen = 'over';
  audio.play(run.outcome === 'win' ? 'win' : 'lose');
  announce(`Run over. Score ${run.score}. Press Enter to sew again.`);
}

function playerIntent(run) {
  if (demo) return pilotIntent(run, state.pilot, STEP);
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

/** Handles one-shot presses for the current screen. */
function handleMenus() {
  const confirm = input.anyPressed('Enter', 'NumpadEnter') || input.mouse.clicked;
  if (input.anyPressed('KeyM')) audio.toggleMute();
  if (state.screen === 'title') {
    if (confirm || demo) startRun();
  } else if (state.screen === 'play') {
    if (input.anyPressed('KeyP', 'Escape')) {
      state.screen = 'pause';
      audio.play('pause');
      announce('Paused.');
    }
  } else if (state.screen === 'pause') {
    if (input.anyPressed('KeyP', 'Escape')) {
      state.screen = 'play';
      audio.play('pause');
    } else if (input.anyPressed('KeyR')) startRun();
  } else if (state.screen === 'draft') {
    const rects = draftCardRects();
    const m = input.mouse;
    const hover = rects.findIndex((r) => m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h);
    if (hover !== state.hover && hover >= 0) audio.play('hover');
    state.hover = hover;
    if (state.draftAge > 0.35) {
      if (input.anyPressed('Digit1', 'Numpad1')) choose(0);
      else if (input.anyPressed('Digit2', 'Numpad2')) choose(1);
      else if (input.anyPressed('Digit3', 'Numpad3')) choose(2);
      else if (m.clicked && hover >= 0) choose(hover);
      else if (demo) choose(state.choices.indexOf(pilotPick(state.choices)));
    }
  } else if (state.screen === 'over') {
    if (input.anyPressed('Escape')) goToTitle();
    else if (confirm && state.endTimer > 0.6) startRun();
  }
}

function update(dt) {
  state.clock += dt;
  if (state.screen === 'title') {
    if (!state.demoRun || state.demoRun.outcome) startDemo();
    const run = state.demoRun;
    stepRun(run, pilotIntent(run, state.pilot, dt), dt);
    if (run.wavePhase === 'draft') {
      takeUpgrade(run, pilotPick(draftUpgrades(run.rng, run.owned)).id);
      beginNextWave(run);
    }
    run.events.length = 0;
    audio.setMusic('calm');
    return;
  }
  const run = state.run;
  if (state.screen === 'play') {
    stepRun(run, playerIntent(run), dt);
    drainEvents(run);
    audio.setMusic(run.enemies.some((e) => e.boss) ? 'boss' : 'calm');
    if (run.outcome) {
      state.endTimer += dt;
      if (state.endTimer >= END_DELAY) {
        state.endTimer = 0;
        finishRun();
      }
    } else if (run.wavePhase === 'draft') openDraft();
  } else if (state.screen === 'draft') {
    state.draftAge += dt;
    stepRun(run, playerIntent(run), dt);
    drainEvents(run);
  } else if (state.screen === 'over') {
    state.endTimer += dt;
    stepRun(run, playerIntent(run), dt);
    run.events.length = 0;
  }
}

function render() {
  const t = state.clock;
  if (state.screen === 'title') {
    drawScene(ctx, state.demoRun, t);
    drawTitle(ctx, state.best, t);
    return;
  }
  const run = state.run;
  drawScene(ctx, run, t);
  if (state.screen === 'over') {
    drawResults(ctx, state.summary, t);
    return;
  }
  drawHud(ctx, run, state.best, t);
  if (state.screen === 'draft') drawDraft(ctx, run, state.choices, state.hover, state.draftAge);
  if (state.screen === 'pause') drawPause(ctx, audio.muted);
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

function stage(name) {
  const scene = stageShot(name, fixedSeed ?? 1);
  if (!scene) return;
  Object.assign(state, scene, { clock: scene.time });
  if (scene.screen === 'title') {
    state.demoRun = scene.run;
    state.best = 48210;
  }
  render();
  render();
  window.__shotReady = true;
}

fitCanvas();
window.addEventListener('resize', fitCanvas);
window.__stitch = {
  state,
  startRun,
  /** Test hook: jump the current run straight to night n. */
  skipToNight(n) {
    if (!state.run) startRun();
    state.run.enemies.length = 0;
    state.run.spawnQueue.length = 0;
    state.run.wave = n - 1;
    beginNextWave(state.run);
    state.screen = 'play';
  },
};

if (shotName) stage(shotName);
else {
  goToTitle();
  window.requestAnimationFrame(frame);
}
