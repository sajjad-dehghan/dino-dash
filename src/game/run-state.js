/**
 * Per-run data and the immutable configuration it starts from (ADR-002 §3).
 *
 * `createRunState()` is the whole of "reset": entering `running` REPLACES the run
 * state object, from `idle` and from `run-end` alike. Nothing is scrubbed in place,
 * so no field can be forgotten (AC-13).
 *
 * DOM-free by contract (ADR-002 §4).
 */

import { variationForScore } from '../render/palette.js';

/** Play-field geometry, in CSS pixels of the canvas coordinate space. */
export const LAYOUT = Object.freeze({
  width: 960,
  height: 320,
  /** y of the surface the character and cacti stand on. */
  groundY: 246,
  groundLineHeight: 7,
  characterX: 110,
  characterWidth: 58,
  characterHeight: 66
});

/** Simulation constants. Never written at runtime. */
export const PHYSICS = Object.freeze({
  gravityPxPerSecondSquared: 2600,
  jumpVelocityPxPerSecond: -880,
  /** Delta-time clamp: a backgrounded tab must not teleport the character (ADR-002 §5). */
  maxStepSeconds: 0.05
});

export const RUN = Object.freeze({
  baseSpeedPxPerSecond: 380,
  speedGainPxPerSecondSquared: 11,
  maxSpeedPxPerSecond: 720,
  minSpawnGapPx: 340,
  maxSpawnGapPx: 700,
  firstSpawnGapPx: 620,
  /** Points per millisecond of run time: 10 points per second (AC-08). */
  scorePerMs: 0.01
});

/**
 * A freshly constructed run state. Every value here is a starting value.
 * @param {number} [startedAtMs] monotonic mark of the run's first frame
 */
export function createRunState(startedAtMs = 0) {
  return {
    startedAtMs,
    elapsedMs: 0,
    score: 0,
    speedPxPerSecond: RUN.baseSpeedPxPerSecond,
    distancePx: 0,
    spawnCountdownPx: RUN.firstSpawnGapPx,
    variationId: variationForScore(0).id,
    character: {
      x: LAYOUT.characterX,
      y: LAYOUT.groundY - LAYOUT.characterHeight,
      width: LAYOUT.characterWidth,
      height: LAYOUT.characterHeight,
      velocityY: 0,
      grounded: true
    },
    obstacles: []
  };
}
