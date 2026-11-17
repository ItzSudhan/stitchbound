// Stitchbound's hand-in program (Node 22, standard library only).
// It copies game/ and screenshots/ to the output folder and writes dossier.json there with the
// vendored make.fun library. The output folder is /output, or MAKEFUN_OUTPUT_DIR when that is set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** The scorer's caps: the dossier text size, and the limits on screenshots and game files. */
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const shotsDir = join(root, 'screenshots');

// Refuse early, with a plain message, a screenshot set the scorer would refuse anyway.
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length > LIMITS.screenshots.max) throw new Error(`screenshots/ holds ${shots.length} images; at most ${LIMITS.screenshots.max}`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > LIMITS.screenshots.max_bytes) throw new Error(`screenshots/${name} is ${size} bytes; at most ${LIMITS.screenshots.max_bytes}`);
  }
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(root, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, LIMITS));
