// Captures the screenshots listed in shots.json from the game's own ?shot= scenes, at 1280x800,
// as JPEGs under 256 KiB (lowering quality only if a frame is too big).
//   node tools/shoot.mjs [out dir, default screenshots] [shot list, default shots.json]
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, startServer } from './chrome.mjs';

const PORT = 8127;
const LIMIT = 256 * 1024;
const outDir = process.argv[2] ?? 'screenshots';
const listFile = process.argv[3] ?? new URL('../shots.json', import.meta.url);
const shots = JSON.parse(readFileSync(listFile, 'utf8'));

mkdirSync(outDir, { recursive: true });
const server = await startServer(PORT);
const chrome = await launchChrome({ width: 1280, height: 800 });
try {
  for (const shot of shots) {
    await chrome.goto(`http://127.0.0.1:${PORT}/${shot.query}`);
    await chrome.waitFor('window.__shotReady === true', 120000);
    const file = join(outDir, shot.name);
    let quality = 90;
    let size = await chrome.screenshot(file, { quality });
    while (size > LIMIT && quality > 40) {
      quality -= 6;
      size = await chrome.screenshot(file, { quality });
    }
    console.log(`${shot.name}: ${(size / 1024).toFixed(1)} KiB at quality ${quality}`);
  }
  if (chrome.errors.length) console.log('page errors:', chrome.errors);
} finally {
  server.kill();
  await chrome.close();
}
