/**
 * One simulation step of a run (ADR-002 §5).
 *
 * Extracted from the bootstrap so that the whole of the run — score accrual, speed,
 * obstacle traffic, gravity and the collision test — sits on the DOM-free side of the
 * testability boundary and can be driven in Node with an injected clock and an
 * injected random source. `main.js` calls this once per animation frame and does
 * nothing else with the simulation.
 *
 * DOM-free by contract.
 */

import { characterHitsObstacle } from './collision.js';
import { clampStepSeconds, stepCharacter } from './physics.js';
import { stepObstacles } from './obstacles.js';
import { scoreForElapsedMs, speedForElapsedMs } from './score.js';
import { variationForScore } from '../render/palette.js';

/**
 * Advance one frame. Mutates `runState` and returns true when the character has
 * contacted a cactus — the only event that ends a run (AC-06, AC-07).
 *
 * Elapsed time (and therefore the score) is the raw monotonic delta from the run's
 * start mark, so the score tracks real time; only the physics step is clamped.
 *
 * @param {object} runState
 * @param {number} nowMs monotonic reading for this frame
 * @param {number} deltaMs raw milliseconds since the previous frame
 * @param {() => number} [random]
 */
export function advanceRun(runState, nowMs, deltaMs, random = Math.random) {
  const stepSeconds = clampStepSeconds(deltaMs);

  runState.elapsedMs = Math.max(0, nowMs - runState.startedAtMs);
  runState.score = scoreForElapsedMs(runState.elapsedMs);
  runState.speedPxPerSecond = speedForElapsedMs(runState.elapsedMs);
  runState.distancePx += runState.speedPxPerSecond * stepSeconds;
  runState.variationId = variationForScore(runState.score).id;

  stepCharacter(runState.character, stepSeconds);
  stepObstacles(runState, stepSeconds, random);

  return characterHitsObstacle(runState.character, runState.obstacles);
}

/** Take the run's monotonic start mark on its first frame (ADR-003 §2). */
export function markRunStart(runState, nowMs) {
  if (runState.startedAtMs === 0) {
    runState.startedAtMs = nowMs;
  }
  return runState;
}
