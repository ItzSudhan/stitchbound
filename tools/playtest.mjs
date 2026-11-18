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
  await chrome.waitFor(`window.__stitch.state.run.sequins < ${before}`, 5000).catch(() => {});
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
  await chrome.key('KeyR');
  await waitScreen('map');
  check('R (PLAY AGAIN) restarts after a loss', true);

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

  // Two Needles: local co-op on one keyboard.
  await chrome.key('Digit2');
  await chrome.waitFor('window.__stitch.state.coop === true', 5000).catch(() => {});
  await sleep(100);
  check('2 on the title switches Two Needles on', (await S('s.coop')) === true && (await S('s.demoRun.partner !== null')) === true);
  await chrome.key('Enter');
  await waitScreen('map');
  await chrome.key('Digit1');
  await waitScreen('play');
  check('a Two Needles run has a second needle and thread', (await S('s.run.partner !== null && s.run.partnerThread.points.length >= 1')) === true);
  const p1x = await S('s.run.player.x');
  const p2x = await S('s.run.partner.x');
  const pins0 = await S('s.run.stats.kills + s.run.pins.length');
  await chrome.key('ArrowLeft', 'down');
  await chrome.key('Enter', 'down');
  // Headless frames can run slow: hold the keys until player two has travelled, up to 10 s.
  await chrome.waitFor(`window.__stitch.state.run.partner.x < ${p2x - 90}`, 10000).catch(() => {});
  const pinsHeld = await S('s.run.pins.length');
  await chrome.key('ArrowLeft', 'up');
  await chrome.key('Enter', 'up');
  check('the arrow keys move player two, not player one', p2x - (await S('s.run.partner.x')) > 30 && Math.abs((await S('s.run.player.x')) - p1x) < 5, `P2 ${Math.round(p2x)} -> ${Math.round(await S('s.run.partner.x'))}, P1 ${Math.round(p1x)} -> ${Math.round(await S('s.run.player.x'))}, ${await S('s.screen')}`);
  check('Enter fires player two\'s pins', pinsHeld > 0 || (await S('s.run.stats.kills')) > pins0, `${pinsHeld} pins in flight`);
  check('player two lays a blue thread of its own', (await S('s.run.partnerThread.points.length')) > 5);
  check('Enter in a night does not leave the night', (await S('s.screen')) === 'play');

  // A virtual gamepad for player two: left stick pushed up, A held.
  const padY = await S('s.run.partner.y');
  await chrome.evaluate(`Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [{
    connected: true, axes: [0, -1, 0, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })),
  }] })`);
  await chrome.waitFor(`window.__stitch.state.run.partner.y < ${padY - 60}`, 10000).catch(() => {});
  const padPins = await S('s.run.pins.length');
  await chrome.evaluate(`Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] })`);
  check('a gamepad steers player two (left stick) and fires (A)', padY - (await S('s.run.partner.y')) > 60 && padPins > 0, `y ${Math.round(padY)} -> ${Math.round(await S('s.run.partner.y'))}, ${padPins} pins`);

  const bound = await chrome.evaluate(`(async () => {
    const { createRun, enterNode, nextNodes } = await import('./run/run.js');
    const { stepNight } = await import('./run/night.js');
    const { spawnEnemy } = await import('./entities/enemies.js');
    const { pointInPolygon } = await import('./core/geometry.js');
    const still = { moveX: 0, moveY: 0, aimX: 640, aimY: 400, fire: false, dash: false };
    // Two needles circle a beetle the opposite way round, the second weaving across the first's
    // path half a beat behind: their threads cross on one side of it, then on the other.
    function sew(coop) {
      const run = createRun({ seed: 3, coop });
      enterNode(run, nextNodes(run)[0]);
      run.spawnQueue = [];
      run.enemies = [];
      const beetle = spawnEnemy(run, 'beetle', 640, 400);
      beetle.speed = 0;
      beetle.timer = 999;
      beetle.hp = 100000;
      const hp = beetle.hp;
      let firstBound = null;
      for (let t = -0.4; t < 4.2; t += 0.012) {
        const u = t - 0.55;
        const place = (n, a, r) => { n.x = 640 + Math.cos(a) * r; n.y = 400 + Math.sin(a) * r; n.vx = 0; n.vy = 0; };
        place(run.player, t, 170);
        if (run.partner) place(run.partner, -u, 170 + 36 * Math.sin(u));
        stepNight(run, still, 1 / 60, still);
        firstBound = firstBound ?? run.cinches.find((c) => c.bound) ?? null;
      }
      return {
        bound: run.stats.boundLoops ?? 0,
        aroundBeetle: firstBound ? pointInPolygon(640, 400, firstBound.polygon) : false,
        beetleHit: hp - Math.max(0, beetle.hp),
        loopDamage: run.mods.loopDamage,
      };
    }
    return { duo: sew(true), solo: sew(false) };
  })()`);
  check('crossing the partner\'s thread twice closes a bound loop', bound.duo.bound >= 1, JSON.stringify(bound.duo));
  check('the bound loop runs all the way round what the needles circled', bound.duo.aroundBeetle === true);
  check('a bound loop cinches twice as hard as a single loop', bound.duo.beetleHit === bound.duo.loopDamage * 2 * bound.duo.bound, `${bound.duo.beetleHit} damage, loop ${bound.duo.loopDamage}`);
  check('one needle alone on the same path closes no bound loop', bound.solo.bound === 0);

  await chrome.evaluate('window.__stitch.pilotOn = true; window.__stitch.state.run.immortal = true');
  await hook('fastForward(60, "cards")');
  check('the co-op autopilot (the pincer) closes bound loops in a real night', (await S('s.run.stats.boundLoops')) > 0, `${await S('s.run.stats.boundLoops')} bound loops`);
  await chrome.evaluate('window.__stitch.pilotOn = false; window.__stitch.state.run.immortal = false');
  for (let i = 0; i < 3 && (await S('s.screen')) === 'cards'; i += 1) {
    await sleep(600);
    await chrome.key('Digit1');
    await sleep(300);
  }
  if ((await S('s.screen')) !== 'play') await hook('enterDepth(2)');
  await chrome.evaluate('window.__stitch.state.run.player.hp = 0');
  await hook('fastForward(3, "over")');
  await waitScreen('over');
  check('the co-op results card counts bound loops', (await S('s.summary.coop && s.summary.boundLoops > 0')) === true, `${await S('s.summary.boundLoops')}`);
  check('a Two Needles score is kept as its own best', (await chrome.evaluate('JSON.parse(localStorage.getItem("stitchbound.v2")).best["classic-duo"]')) > 0);
  await chrome.waitFor('window.__stitch.state.endTimer > 0.8');
  await chrome.key('Enter');
  await sleep(400);
  check("player two's Enter (fire) does not skip the co-op results card", (await S('s.screen')) === 'over');

  const relics = await chrome.evaluate(`(async () => {
    const { RELICS, draftRelics } = await import('./items/relics.js');
    const { createRandom } = await import('./core/random.js');
    const { createRun, enterNode, nextNodes } = await import('./run/run.js');
    const { cinchLoop } = await import('./run/night.js');
    const { gainRelic } = await import('./items/loadout.js');
    const { spawnEnemy } = await import('./entities/enemies.js');
    const solo = draftRelics(createRandom(1), [], RELICS.length).map((r) => r.id);
    const duo = draftRelics(createRandom(1), [], RELICS.length, true).map((r) => r.id);
    // Cat's Cradle and Love Knot on a bound loop round three beetles, with a spool missing.
    const run = createRun({ seed: 4, coop: true });
    enterNode(run, nextNodes(run)[0]);
    run.enemies = [];
    run.spawnQueue = [];
    gainRelic(run, 'catsCradle');
    gainRelic(run, 'loveKnot');
    const beetles = [0, 1, 2].map((i) => { const b = spawnEnemy(run, 'beetle', 600 + i * 40, 400); b.hp = 100000; return b; });
    run.player.hp = run.mods.hp - 1;
    const square = [{ x: 500, y: 300 }, { x: 800, y: 300 }, { x: 800, y: 500 }, { x: 500, y: 500 }];
    cinchLoop(run, square, run.mods.boundPower);
    return {
      soloHasCoop: solo.includes('catsCradle') || solo.includes('loveKnot'),
      duoHasCoop: duo.includes('catsCradle') && duo.includes('loveKnot'),
      hit: 100000 - beetles[0].hp,
      loopDamage: run.mods.loopDamage,
      healed: run.player.hp === run.mods.hp,
    };
  })()`);
  check('the co-op relics are only drafted in Two Needles runs', !relics.soloHasCoop && relics.duoHasCoop);
  check("Cat's Cradle makes a bound loop pull 3x", relics.hit === relics.loopDamage * 3, `${relics.hit} vs loop ${relics.loopDamage}`);
  check('Love Knot heals a spool when a bound loop holds 3 pests', relics.healed === true);
  await chrome.key('Escape');
  await waitScreen('title');
  await chrome.key('Digit2');
  await chrome.waitFor('window.__stitch.state.coop === false', 5000).catch(() => {});
  check('2 again switches back to one needle', (await S('s.coop')) === false);

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
