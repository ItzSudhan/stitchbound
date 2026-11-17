// Balance probe: plays whole autopilot runs inside the page (the game's own modules) for several
// seeds and prints, per night, the quilt left, spools left, loops closed and time taken.
//   node tools/balance.mjs [seeds, default 1,2,3] [mortal]
import { launchChrome, startServer } from './chrome.mjs';

const PORT = 8133;
const seeds = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const immortal = process.argv[3] !== 'mortal';
const server = await startServer(PORT);
const chrome = await launchChrome();
try {
  await chrome.goto(`http://127.0.0.1:${PORT}/?shot=none`);
  for (const seed of seeds) {
    const report = await chrome.evaluate(`(async () => {
      const shots = await import('./src/shots.js');
      const quilt = await import('./src/quilt.js');
      const rows = [];
      let lastWave = 0;
      const run = shots.playUntil(${seed}, (r) => {
        if (r.wave !== lastWave) {
          rows.push({ night: r.wave, at: Math.round(r.time), quilt: Math.round(quilt.quiltIntegrity(r.quilt) * 100), hp: r.player.hp, loops: r.stats.loops, kills: r.stats.kills, score: r.score });
          lastWave = r.wave;
        }
        return Boolean(r.outcome);
      }, { immortal: ${immortal} });
      rows.push({ end: run.outcome, night: run.wave, at: Math.round(run.time), quilt: Math.round(quilt.quiltIntegrity(run.quilt) * 100), hp: run.player.hp, loops: run.stats.loops, kills: run.stats.kills, score: run.score, picks: run.stats.picks.join(',') });
      return rows;
    })()`);
    console.log(`seed ${seed}`);
    for (const row of report) console.log('  ' + JSON.stringify(row));
  }
  if (chrome.errors.length) console.log('page errors:', chrome.errors);
} finally {
  server.kill();
  await chrome.close();
}
