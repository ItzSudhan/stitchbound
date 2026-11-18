// Plays a whole run with the autopilot and no screen: the road, the nights, the drafts, the
// peddler and the mysteries, exactly through the game's own run functions. Screenshots, the
// balance probe and the play-test use it; `watch(run, step, screen)` may stop it at any moment.
import { STEP } from '../core/config.js';
import { createRun, enterNode, finishNode, nextNodes, offerNotions, takeOffer } from '../run/run.js';
import { stepNight } from '../run/night.js';
import { buyItem } from '../run/merchant.js';
import { chooseEventOption } from '../run/events.js';
import { createPartnerPilot, duetIntents } from '../coop/partner-pilot.js';
import { createPilot, pilotChooseCard, pilotChooseNode, pilotChooseOption, pilotChooseWare, pilotIntent } from './autopilot.js';

const LIMIT_STEPS = 60 * 60 * 40;

export function driveRun({ seed, modeId = 'classic', needleId = 'steel', immortal = true, coop = false }, watch = () => false) {
  const run = createRun({ seed, modeId, needleId, coop });
  run.immortal = immortal;
  const pilot = createPilot();
  const partnerPilot = createPartnerPilot();
  let screen = 'map';
  for (let step = 0; step < LIMIT_STEPS; step += 1) {
    if (watch(run, step, screen)) return { run, screen };
    if (screen === 'map') {
      const options = nextNodes(run);
      if (options.length === 0) return { run, screen: 'over' };
      run.lastOptions = options;
      if (watch(run, step, 'map-choice')) return { run, screen: 'map' };
      screen = enterNode(run, pilotChooseNode(run, options));
    } else if (screen === 'play') {
      if (run.wavePhase === 'draft' && !run.outcome) {
        offerNotions(run);
        screen = 'cards';
        continue;
      }
      const intent = pilotIntent(run, pilot, STEP);
      if (run.partner) {
        const { first, second } = duetIntents(run, partnerPilot, pilot, intent, STEP);
        stepNight(run, first, STEP, second);
      } else stepNight(run, intent, STEP);
      run.events.length = 0;
      if (run.outcome) {
        run.endTime = (run.endTime ?? 0) + STEP;
        if (run.endTime > 1.6) return { run, screen: 'over' };
      }
    } else if (screen === 'cards') {
      if (watch(run, step, 'cards-open')) return { run, screen };
      screen = takeOffer(run, pilotChooseCard(run, run.offer));
    } else if (screen === 'shop') {
      if (watch(run, step, 'shop-open')) return { run, screen };
      const ware = pilotChooseWare(run, run.shop);
      if (ware >= 0) buyItem(run, run.shop, run.shop.items[ware]);
      else screen = finishNode(run);
    } else if (screen === 'event') {
      if (!run.event.result) chooseEventOption(run, run.event, pilotChooseOption(run, run.event));
      else screen = finishNode(run);
    }
  }
  return { run, screen };
}
