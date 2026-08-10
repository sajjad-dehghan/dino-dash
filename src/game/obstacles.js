/**
 * Cactus spawn, advance and despawn (ADR-002).
 * DOM-free by contract; the random source is injected so the unit tier is deterministic.
 */

import { LAYOUT, RUN } from './run-state.js';

/** The only obstacle family in Unit 1: cacti. */
export const CACTUS_KINDS = Object.freeze([
  Object.freeze({ id: 'small', width: 32, height: 58, columns: 1 }),
  Object.freeze({ id: 'tall', width: 34, height: 82, columns: 1 }),
  Object.freeze({ id: 'cluster', width: 62, height: 66, columns: 2 })
]);

export function createObstacle(kind, x) {
  return {
    kindId: kind.id,
    columns: kind.columns,
    x,
    y: LAYOUT.groundY - kind.height,
    width: kind.width,
    height: kind.height
  };
}

/**
 * Advance obstacles by one step, spawning and despawning as required.
 * Spawning is distance-driven, not frame-driven, so it is frame-rate independent.
 *
 * @param {object} runState
 * @param {number} stepSeconds clamped step
 * @param {() => number} random source in [0,1)
 */
export function stepObstacles(runState, stepSeconds, random = Math.random) {
  const travelled = runState.speedPxPerSecond * stepSeconds;

  for (const obstacle of runState.obstacles) {
    obstacle.x -= travelled;
  }
  runState.obstacles = runState.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);

  runState.spawnCountdownPx -= travelled;
  if (runState.spawnCountdownPx <= 0) {
    const kind = CACTUS_KINDS[Math.floor(random() * CACTUS_KINDS.length) % CACTUS_KINDS.length];
    runState.obstacles.push(createObstacle(kind, LAYOUT.width + 24));
    const span = RUN.maxSpawnGapPx - RUN.minSpawnGapPx;
    runState.spawnCountdownPx = RUN.minSpawnGapPx + random() * span;
  }

  return runState.obstacles;
}
