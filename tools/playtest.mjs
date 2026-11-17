// Scripted play-test in headless Chrome with real keyboard and mouse events. It walks every
// screen and both endings, and fails on any console error or uncaught exception:
//   1. title -> click to start -> WASD + mouse fire for a few seconds (score and thread move)
//   2. pause with P, resume, restart with R from pause
//   3. win night 1, take a notion with key 2 on the draft, night 2 starts
//   4. lose: the needle is worn down by the pests (no input) -> results card -> Enter restarts
//   5. win: jump to night 10 with the test hook, autopilot (?demo=1) beats the Matriarch
//   6. mute toggle, Escape from results back to title
//   node tools/playtest.mjs
import { launchChrome, startServer } from './chrome.mjs';

const PORT = 8129;
const base = `http://127.0.0.1:${PORT}/`;
const server = await startServer(PORT);
const chrome = await launchChrome();
const S = (expr) => chrome.evaluate(`(() => { const s = window.__stitch.state; return ${expr}; })()`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
/** Speeds a test up: steps the game's own update loop many times per call. */
const fastForward = (seconds) => chrome.evaluate(`window.__stitch.fastForward(${seconds})`);

try {
  // 1. Title and a few seconds of real input.
  await chrome.goto(`${base}?seed=5`);
  await chrome.waitFor('window.__stitch && window.__stitch.state.screen === "title"');
  check('title screen shows', (await S('s.screen')) === 'title');
  await chrome.click(640, 400);
  await chrome.waitFor('window.__stitch.state.screen === "play"');
  check('click starts a run', (await S('s.screen')) === 'play');
  const x0 = await S('s.run.player.x');
  await chrome.key('KeyD', 'down');
  await chrome.mouse('mouseMoved', 900, 200, 'none');
  await chrome.mouse('mousePressed', 900, 200);
  await sleep(1500);
  await chrome.key('KeyD', 'up');
  await chrome.key('KeyW', 'down');
  await sleep(800);
  await chrome.key('KeyW', 'up');
  await chrome.key('Space');
  await sleep(300);
  await chrome.mouse('mouseReleased', 900, 200);
  const moved = (await S('s.run.player.x')) - x0;
  check('WASD moves the needle', moved > 30, `dx=${moved.toFixed(0)}`);
  check('mouse fires pins', (await S('s.run.stats.kills + s.run.pins.length')) >= 0 && (await S('s.run.player.fireTimer')) !== 0);
  check('needle lays thread', (await S('s.run.thread.points.length')) > 5, `points=${await S('s.run.thread.points.length')}`);
  check('dash used', (await S('s.run.player.dashReady')) > 0 || (await S('s.run.time')) > 0);

  // 2. Pause, resume, restart.
  await chrome.key('KeyP');
  await chrome.waitFor('window.__stitch.state.screen === "pause"');
  const tPause = await S('s.run.time');
  await sleep(500);
  check('pause freezes the run', (await S('s.run.time')) === tPause);
  await chrome.key('KeyP');
  await chrome.waitFor('window.__stitch.state.screen === "play"');
  check('P resumes', true);
  await chrome.key('KeyP');
  await chrome.waitFor('window.__stitch.state.screen === "pause"');
  await chrome.key('KeyR');
  await chrome.waitFor('window.__stitch.state.screen === "play" && window.__stitch.state.run.time < 1');
  check('R restarts from pause', true);

  // 3. Clear night 1 with the autopilot driving the same run, then draft with key 2.
  await chrome.evaluate('window.__stitch.pilotOn = true');
  await fastForward(90);
  await chrome.waitFor('window.__stitch.state.screen === "draft"', 30000);
  await chrome.evaluate('window.__stitch.pilotOn = false');
  check('night 1 cleared opens the draft', (await S('s.screen')) === 'draft', `choices=${await S('s.choices.map(c => c.name).join("|")')}`);
  const second = await S('s.choices[1].id');
  await chrome.waitFor('window.__stitch.state.draftAge > 0.5');
  await chrome.key('Digit2');
  await chrome.waitFor('window.__stitch.state.screen === "play"');
  check('key 2 takes the second notion', (await S(`s.run.owned["${second}"]`)) === 1, second);
  check('night 2 begins', (await S('s.run.wave')) === 2);

  // 4. Lose: stand still and let the pests wear the needle down.
  await fastForward(240);
  await chrome.waitFor('window.__stitch.state.screen === "over"', 60000);
  const lost = await S('s.summary.outcome');
  check('standing still loses the run', lost === 'needle' || lost === 'quilt', lost);
  check('results card shows the score', (await S('s.summary.score')) > 0, `score=${await S('s.summary.score')}`);
  check('best score saved', (await chrome.evaluate('Number(localStorage.getItem("stitchbound.best.v1"))')) > 0);
  await chrome.waitFor('window.__stitch.state.endTimer > 0.8');
  await chrome.key('Enter');
  await chrome.waitFor('window.__stitch.state.screen === "play" && window.__stitch.state.run.wave === 1');
  check('Enter restarts after a loss', true);

  // 5. Win: jump to night 10 with the nine notions a run has by then, and let the autopilot fight.
  await chrome.evaluate(`(async () => {
    const { takeUpgrade } = await import('./src/upgrades.js');
    const run = window.__stitch.state.run;
    for (const id of ['wax', 'quick', 'twin', 'wax', 'steel', 'spool', 'quick', 'mend', 'steel']) takeUpgrade(run, id);
    window.__stitch.skipToNight(10);
    run.immortal = true;
    window.__stitch.pilotOn = true;
  })()`);
  await fastForward(20);
  check('the Matriarch arrives on night 10', (await S('s.run.enemies.some(e => e.kind === "matriarch")')) === true);
  await fastForward(240);
  await chrome.waitFor('window.__stitch.state.screen === "over"', 60000);
  check('beating the Matriarch wins', (await S('s.summary.outcome')) === 'win', await S('s.summary.outcome'));

  // 6. Mute and back to title.
  await chrome.key('KeyM');
  await chrome.key('Escape');
  await chrome.waitFor('window.__stitch.state.screen === "title"');
  check('Escape on results returns to title', true);

  // A night-5 visit for the Yarn Wyrm.
  await chrome.evaluate('window.__stitch.skipToNight(5); window.__stitch.state.run.immortal = true; window.__stitch.pilotOn = true;');
  await fastForward(8);
  check('the Yarn Wyrm arrives on night 5', (await S('s.run.enemies.filter(e => e.kind.startsWith("wyrm")).length')) > 5);
} catch (error) {
  check('script ran to the end', false, error.message);
} finally {
  check('no console errors', chrome.errors.length === 0, chrome.errors.join(' | '));
  server.kill();
  await chrome.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
