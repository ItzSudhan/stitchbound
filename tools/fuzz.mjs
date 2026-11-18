// Random-input fuzz: mashes keys, moves and clicks the mouse and fast-forwards the game through
// every screen for a while, on a HiDPI window that is resized along the way, and fails on any
// console error or uncaught exception.
//   node tools/fuzz.mjs [rounds, default 400] [coop]
import { launchChrome, startServer } from './chrome.mjs';

const PORT = 8135;
const rounds = Number(process.argv[2] ?? 400);
/** `coop` as the second argument starts with Two Needles switched on. */
const coop = process.argv[3] === 'coop';
let coopRuns = 0;
const server = await startServer(PORT);
const chrome = await launchChrome();
// Digit2 on the title switches Two Needles, so co-op runs (arrows, Enter, Right Shift) get mashed too.
const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter', 'KeyP', 'Escape', 'KeyM', 'KeyR', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ShiftRight'];
let seed = 12345;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const screens = new Set();
try {
  await chrome.page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await chrome.goto(`http://127.0.0.1:${PORT}/?seed=77${coop ? '&coop=1' : ''}`);
  await chrome.waitFor('window.__stitch && window.__stitch.state.screen === "title"');
  // The autopilot steers between the random inputs, so the run gets through nights to drafts and endings.
  await chrome.evaluate('window.__stitch.pilotOn = true');
  for (let i = 0; i < rounds; i += 1) {
    const r = rand();
    if ((await chrome.evaluate('window.__stitch.state.screen')) === 'pause' && rand() < 0.6) await chrome.key('KeyP');
    if (r < 0.45) await chrome.key(KEYS[Math.floor(rand() * KEYS.length)], rand() < 0.5 ? 'press' : rand() < 0.5 ? 'down' : 'up');
    else if (r < 0.75) await chrome.mouse('mouseMoved', rand() * 1440, rand() * 900, 'none');
    else if (r < 0.9) await chrome.click(rand() * 1440, rand() * 900);
    else if (r < 0.97) await chrome.evaluate(`window.__stitch.fastForward(${(2 + rand() * 12).toFixed(1)})`);
    else {
      const w = 800 + Math.floor(rand() * 1000);
      const h = 500 + Math.floor(rand() * 500);
      await chrome.page('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: rand() < 0.5 ? 1 : 2, mobile: false });
    }
    screens.add(await chrome.evaluate('window.__stitch.state.screen'));
    if (await chrome.evaluate('Boolean(window.__stitch.state.run && window.__stitch.state.run.partner)')) coopRuns += 1;
    if (chrome.errors.length) break;
  }
  const night = await chrome.evaluate('window.__stitch.state.run ? window.__stitch.state.run.depth : 0');
  console.log(`screens visited: ${[...screens].join(', ')}; last night reached ${night}; ${coopRuns} rounds in a Two Needles run`);
} finally {
  server.kill();
  await chrome.close();
}
console.log(chrome.errors.length ? `ERRORS: ${chrome.errors.join(' | ')}` : `no errors in ${rounds} rounds`);
process.exit(chrome.errors.length ? 1 : 0);
