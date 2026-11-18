// Scripted play-test in headless Chrome with real keyboard and mouse events. It walks every
// screen and both endings, and fails on any console error or uncaught exception:
//   title (mode and needle pickers) -> road map -> a night with WASD, mouse and dash -> pause,
//   resume, restart -> a cleared night -> the notion draft -> the road again -> the peddler (buy,
//   leave) -> a mystery (choose, onward) -> a rest -> a loss -> results -> restart -> a win against
//   the Matriarch -> Endless continuing past her -> back to the title.
//   node tools/playtest.mjs
import { launchChrome, startServer } from './chrome.mjs';

const PORT = 8129;
const server = await startServer(PORT);
const chrome = await launchChrome();
const S = (expr) => chrome.evaluate(`(() => { const s = window.__stitch.state; return ${expr}; })()`);
const hook = (expr) => chrome.evaluate(`window.__stitch.${expr}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitScreen = (name, ms = 30000) => chrome.waitFor(`window.__stitch.state.screen === "${name}"`, ms);
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

try {
  await chrome.goto(`http://127.0.0.1:${PORT}/?seed=5`);
  await chrome.waitFor('window.__stitch && window.__stitch.state.screen === "title"');
  check('title screen shows', true);
  await chrome.key('KeyC');
  await waitScreen('codex');
  check('C opens the Sampler', true);
  await chrome.key('Escape');
  await waitScreen('title');
  await chrome.key('ArrowDown');
  await sleep(300);
  check('arrow keys change the mode', (await S('s.modeIndex')) === 1, `mode ${await S('s.modeIndex')}`);
  await chrome.key('ArrowUp');
  await chrome.key('ArrowRight');
  await sleep(300);
  await chrome.key('Enter');
  await sleep(500);
  check('a locked needle cannot start a run', (await S('s.screen')) === 'title');
  await chrome.key('ArrowLeft');
  await sleep(300);
  await chrome.click(336, 312);
  await waitScreen('map');
  check('clicking NEW RUN starts a run on the quilt road', true, `${await S('s.run.road.columns.length')} columns`);
  await chrome.key('Digit1');
  await waitScreen('play');
  check('key 1 steps onto the first patch: a night', (await S('s.run.depth')) === 1);

  const x0 = await S('s.run.player.x');
  await chrome.key('KeyD', 'down');
  await chrome.mouse('mouseMoved', 900, 200, 'none');
  await chrome.mouse('mousePressed', 900, 200);
  await sleep(1500);
  await chrome.key('KeyD', 'up');
  await chrome.key('Space');
  await sleep(300);
  await chrome.mouse('mouseReleased', 900, 200);
  check('WASD moves the needle', (await S('s.run.player.x')) - x0 > 30);
  check('the needle lays thread', (await S('s.run.thread.points.length > 5 || s.run.stats.loops > 0')) === true);

  await chrome.key('KeyP');
  await waitScreen('pause');
  const tPause = await S('s.run.time');
  await sleep(400);
  check('pause freezes the night', (await S('s.run.time')) === tPause);
  await chrome.key('KeyP');
  await waitScreen('play');
  await chrome.key('KeyP');
  await waitScreen('pause');
  await chrome.key('KeyR');
  await waitScreen('map');
  check('R restarts the run from pause', (await S('s.run.depth')) === 0);

  await chrome.key('Digit1');
  await waitScreen('play');
  await chrome.evaluate('window.__stitch.pilotOn = true');
  await hook('fastForward(120, "cards")');
  await chrome.evaluate('window.__stitch.pilotOn = false');
  check('clearing night 1 opens the notion draft', (await S('s.screen')) === 'cards' && (await S('s.run.offer.kind')) === 'notion');
  const second = await S('s.run.offer.choices[1].id');
  await chrome.waitFor('window.__stitch.state.cardAge > 0.5');
  await chrome.key('Digit2');
  await waitScreen('map');
  check('key 2 takes the second notion and returns to the road', (await S(`s.run.owned["${second}"]`)) === 1, second);

  await chrome.evaluate('window.__stitch.state.run.sequins = 200');
  const shop = await hook('enterPatch("merchant")');
  check('the peddler opens', shop === 'shop');
  const before = await S('s.run.sequins');
  await chrome.key('Digit1');
  await sleep(300);
  check('a key buys a ware with sequins', (await S('s.run.sequins')) < before, `${before} -> ${await S('s.run.sequins')}`);
  await chrome.key('Enter');
  await waitScreen('map');
  check('Enter leaves the peddler', true);

  if ((await hook('enterPatch("event")')) === 'event') {
    await sleep(300);
    await chrome.key('Digit1');
    await chrome.waitFor('Boolean(window.__stitch.state.run.event.result)', 5000).catch(() => {});
    check('a mystery option resolves', Boolean(await S('s.run.event.result')), await S('s.run.event.title'));
    await chrome.key('Enter');
    await waitScreen('map');
  }
  if ((await hook('enterPatch("rest")')) === 'cards') {
    await chrome.waitFor('window.__stitch.state.cardAge > 0.5');
    await chrome.key('Digit1');
    await waitScreen('map');
    check('a rest choice returns to the road', true);
  }

  await chrome.key('Digit1');
  await sleep(200);
  if ((await S('s.screen')) !== 'play') await hook('enterDepth(2)');
  await hook('fastForward(400, "over")');
  await waitScreen('over', 60000);
  const lost = await S('s.summary.outcome');
  check('standing still loses the run', lost === 'needle' || lost === 'quilt', lost);
  check('the Sampler records pests met', (await chrome.evaluate('JSON.parse(localStorage.getItem("stitchbound.v2")).codex.pests.length')) > 0);
  check('run progress is saved', (await chrome.evaluate('JSON.parse(localStorage.getItem("stitchbound.v2")).progress.runs')) >= 1);
  await chrome.waitFor('window.__stitch.state.endTimer > 0.8');
  await chrome.key('Enter');
  await waitScreen('map');
  check('Enter restarts after a loss', true);

  await chrome.evaluate(`(async () => {
    const { takeNotion, gainRelic } = await import('./items/loadout.js');
    const run = window.__stitch.state.run;
    for (const id of ['wax', 'quick', 'twin', 'wax', 'steel', 'spool', 'quick', 'mend', 'steel']) takeNotion(run, id);
    gainRelic(run, 'beeswax');
    run.immortal = true;
    window.__stitch.pilotOn = true;
  })()`);
  await hook('enterDepth(10)');
  await hook('fastForward(8)');
  check('the Matriarch arrives on night 10', (await S('s.run.enemies.some(e => e.kind === "matriarch")')) === true);
  await hook('fastForward(400, "over")');
  await waitScreen('over', 60000);
  check('beating the Matriarch wins the run', (await S('s.summary.outcome')) === 'win', await S('s.summary.outcome'));
  check('the best score is saved', (await chrome.evaluate('JSON.parse(localStorage.getItem("stitchbound.v2")).best.classic')) > 0, await chrome.evaluate('localStorage.getItem("stitchbound.v2")'));
  check('a win unlocks the Golden Needle', (await S('s.summary.unlocked.join(",")')).includes('Golden'), await S('s.summary.unlocked.join(",")'));
  await chrome.evaluate('window.__stitch.pilotOn = false');

  await chrome.key('Escape');
  await waitScreen('title');
  check('Escape on results returns to the title', true);
  await chrome.key('ArrowDown');
  await sleep(400);
  await chrome.key('ArrowDown');
  await sleep(400);
  await chrome.key('Enter');
  await waitScreen('map');
  check('Endless mode starts', (await S('s.run.endless')) === true);
  await chrome.evaluate(`(async () => {
    const { takeNotion } = await import('./items/loadout.js');
    const run = window.__stitch.state.run;
    for (const id of ['wax', 'quick', 'twin', 'wax', 'steel', 'spool', 'quick', 'mend', 'steel']) takeNotion(run, id);
    run.immortal = true;
    window.__stitch.pilotOn = true;
  })()`);
  await hook('enterDepth(10)');
  await hook('fastForward(400, "cards")');
  check('in Endless the Matriarch falls and the road goes on', (await S('s.screen')) === 'cards' && !(await S('s.run.outcome')));
  await hook('fastForward(3, "map")');
  check('the Endless road grows past night 10', (await S('s.run.road.columns.length')) > 10, `${await S('s.run.road.columns.length')} columns`);
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
