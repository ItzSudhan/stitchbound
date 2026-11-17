// Balance probe: plays whole autopilot runs inside the page (the game's own modules, through the
// run driver) for several seeds and prints, per road patch, the night, patch type, quilt left,
// spools, sequins, relics and synergies, then how each run ended.
//   node tools/balance.mjs [seeds, default 1,2,3] [mortal] [mode] [needle]
import { launchChrome, startServer } from './chrome.mjs';

const PORT = 8133;
const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const immortal = process.argv[3] !== 'mortal';
const modeId = process.argv[4] ?? 'classic';
const needleId = process.argv[5] ?? 'steel';
const server = await startServer(PORT);
const chrome = await launchChrome();
try {
  await chrome.goto(`http://127.0.0.1:${PORT}/?shot=none`);
  for (const seed of seeds) {
    const report = await chrome.evaluate(`(async () => {
      const { driveRun } = await import('./demo/run-driver.js');
      const { quiltIntegrity } = await import('./world/quilt.js');
      const rows = [];
      let lastNode = null;
      const { run } = driveRun({ seed: ${seed}, immortal: ${immortal}, modeId: '${modeId}', needleId: '${needleId}' }, (r) => {
        if (r.node !== lastNode) {
          lastNode = r.node;
          rows.push(r.depth + ':' + r.node.type + ' q' + Math.round(quiltIntegrity(r.quilt) * 100) + ' hp' + r.player.hp + ' $' + r.sequins);
        }
        return r.depth > 40;
      });
      return { path: rows.join(' | '), end: run.outcome, night: run.depth, score: run.score, time: Math.round(run.time), relics: run.relics.join(','), synergies: run.synergies.join(','), loops: run.stats.loops };
    })()`);
    console.log(`seed ${seed}: ${report.end} at night ${report.night}, score ${report.score}, ${report.time}s, loops ${report.loops}`);
    console.log(`  relics [${report.relics}] synergies [${report.synergies}]`);
    console.log(`  ${report.path}`);
  }
  if (chrome.errors.length) console.log('page errors:', chrome.errors);
} finally {
  server.kill();
  await chrome.close();
}
