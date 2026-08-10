/**
 * `createRunState()` starting values — the whole of AC-13 (ADR-002 §3):
 * restart reconstructs, it never scrubs, so no field can be forgotten.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYOUT, PHYSICS, RUN, createRunState } from '../../src/game/run-state.js';

test('AC-13: a fresh run state is at its starting values', () => {
  const state = createRunState(1234);
  assert.equal(state.score, 0);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.startedAtMs, 1234);
  assert.deepEqual(state.obstacles, []);
  assert.equal(state.distancePx, 0);
  assert.equal(state.speedPxPerSecond, RUN.baseSpeedPxPerSecond);
  assert.equal(state.spawnCountdownPx, RUN.firstSpawnGapPx);
  assert.equal(state.variationId, 'dawn');
  assert.equal(state.character.x, LAYOUT.characterX);
  assert.equal(state.character.y, LAYOUT.groundY - LAYOUT.characterHeight);
  assert.equal(state.character.velocityY, 0);
  assert.equal(state.character.grounded, true);
});

test('AC-13: a played-out run state shares nothing with the next one', () => {
  const previous = createRunState(0);
  previous.score = 512;
  previous.elapsedMs = 51200;
  previous.distancePx = 9000;
  previous.obstacles.push({ x: 10, y: 10, width: 10, height: 10 });
  previous.character.y = 40;
  previous.character.velocityY = -300;
  previous.character.grounded = false;
  previous.variationId = 'dusk';

  const next = createRunState(0);
  assert.equal(next.score, 0);
  assert.equal(next.elapsedMs, 0);
  assert.equal(next.distancePx, 0);
  assert.equal(next.obstacles.length, 0);
  assert.equal(next.character.y, LAYOUT.groundY - LAYOUT.characterHeight);
  assert.equal(next.character.velocityY, 0);
  assert.equal(next.character.grounded, true);
  assert.equal(next.variationId, 'dawn');
  assert.notEqual(next.obstacles, previous.obstacles);
  assert.notEqual(next.character, previous.character);
});

test('immutable configuration is frozen and outlives runs unchanged', () => {
  assert.ok(Object.isFrozen(LAYOUT));
  assert.ok(Object.isFrozen(PHYSICS));
  assert.ok(Object.isFrozen(RUN));
  assert.ok(PHYSICS.maxStepSeconds > 0 && PHYSICS.maxStepSeconds <= 0.1);
});
