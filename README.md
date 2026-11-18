# stitchbound

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ItzSudhan/stitchbound/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ItzSudhan/stitchbound/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Stitchbound** is an original arena game played on a patchwork quilt. You steer a needle that trails red thread. Cross your own thread to close a loop: the loop cinches every pest inside it and darns the quilt's holes shut. Moths eat the quilt into holes, silverfish nip, button-backed beetles charge, earwig snippers cut your thread and walking pincushions fire fans of pins. Survive ten nights, beat the Yarn Wyrm on night 5 and the Moth Matriarch on night 10, and pick one of three notions (upgrades) after every night. Moths crave the gold-star heirloom patches, and each heirloom still whole at dawn pays a bonus. Sturdier pests sometimes drop spare spools that heal you. Lose all your spools or let the quilt unravel and the run is over. Your best score is kept. Bring a friend: in **Two Needles** co-op a second player sews a blue thread on the same keyboard, and crossing each other's threads binds pests in loops neither needle could close alone. Everything is drawn in code on a 2D canvas and every sound is synthesised with WebAudio: no libraries, no image or sound files.

Controls: WASD to move, mouse to aim, hold click to fire pins, Space to snip-dash, P to pause, M to mute. On the title, Enter (or NEW RUN) starts a run, the arrow keys pick the mode and needle, 2 switches Two Needles co-op on or off, and C opens the Sampler; on the results card, R or Enter sews again (R or a click in co-op, where Enter is player two's fire key) and Esc returns to the title.

## Two Needles: local co-op

Press 2 on the title (or click TWO NEEDLES) and a second player joins at the same keyboard with the Brass Needle and a **blue thread**:

| | Player one (red thread) | Player two (blue thread) |
|---|---|---|
| Move | WASD | Arrow keys |
| Fire pins | Mouse (hold click) | Enter (aims at the nearest pest ahead) |
| Snip-dash | Space | Right Shift or / |

Each needle still closes loops on its own thread. The new move is the **bound loop**: when a needle crosses its partner's thread a second time, the stretch of each thread between the two crossings closes into one loop, red on one side and blue on the other. Two hands pull it tight, so a bound loop does **double** cinch damage (even against the Matriarch), darns **double** the cloth and scores double, and both threads are spent. The pair's best tactic is the pincer: circle the same knot of pests the opposite way round from each other, and every time your paths cross on the far side the whole knot is bound inside.

The two needles share everything else: the spools of health, the sewing box (notions, relics and sequins), and the road. Pests go after whichever needle is nearer, snippers hunt the longer thread, and spare spools can be fetched by either needle. A bound loop flares with light across its whole span, which matters on the dark late nights. The HUD adds player two's dash and thread meters and the pair's bound-loop count, the results card counts bound loops, and pairs keep their own best score per mode.

Co-op runs also draft two relics that solo runs never see: **Cat's Cradle** (bound loops pull 3x instead of 2x) and **Love Knot** (a bound loop that holds three or more pests ties a spool back on). Cat's Cradle with the Waxed Thread notion completes the co-op synergy **Cradle Song**: every bound loop sends out a shockwave.

The code lives in `game/coop/`: `two-needles.js` (the second needle, the bound-loop rule and shared targeting), `partner-input.js` (player two's keys) and `partner-pilot.js` (the pincer autopilot behind the co-op attract mode, `?demo=1&coop=1` and the co-op screenshot). The play-test (`node tools/playtest.mjs`) switches co-op on from the title, drives player two with the real arrow keys and Enter, and checks that two needles circling a beetle bind it in one loop that does exactly double damage, while one needle on the same path binds nothing; that the co-op relics are drafted only in co-op and do what they say; and that a co-op score is kept as its own best. `node tools/fuzz.mjs 400 coop` mashes keys through co-op runs and `node tools/balance.mjs 1,2,3 mortal classic steel coop` plays whole co-op runs with the pincer pilot.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=1pww8frk&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
