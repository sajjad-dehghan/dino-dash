/**
 * Jump edge semantics (AC-03, AC-04), delta-time clamping (ADR-002 §5) and score
 * behaviour (AC-08).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYOUT, PHYSICS, createRunState } from '../../src/game/run-state.js';
import { clampStepSeconds, jump, stepCharacter } from '../../src/game/physics.js';
import { formatScore, scoreForElapsedMs, speedForElapsedMs } from '../../src/game/score.js';

test('AC-03/AC-04: one grounded press is exactly one jump', () => {
  const { character } = createRunState(0);
  assert.equal(jump(character), true);
  assert.equal(character.grounded, false);
  // pressing again while airborne does nothing
  assert.equal(jump(character), false);
  assert.equal(jump(character), false);
});

test('AC-03: the character leaves the ground and returns to it', () => {
  const { character } = createRunState(0);
  const restingY = LAYOUT.groundY - character.height;
  jump(character);
  let airborneFrames = 0;
  let peak = restingY;
  for (let frame = 0; frame < 200 && !character.grounded; frame += 1) {
    stepCharacter(character, 1 / 60);
    peak = Math.min(peak, character.y);
    airborneFrames += 1;
  }
  assert.ok(peak < restingY - 60, `peak ${peak} vs resting ${restingY}`);
  assert.equal(character.grounded, true);
  assert.equal(character.y, restingY);
  assert.ok(airborneFrames > 20 && airborneFrames < 90, `airborne frames ${airborneFrames}`);
});

test('AC-03: a burst of presses across one run yields one jump each, grounded only', () => {
  const { character } = createRunState(0);
  let jumps = 0;
  let groundedPresses = 0;
  for (let frame = 0; frame < 1200; frame += 1) {
    if (frame % 30 === 0) {
      if (character.grounded) groundedPresses += 1;
      if (jump(character)) jumps += 1;
    }
    stepCharacter(character, 1 / 60);
  }
  assert.ok(jumps > 0);
  assert.equal(jumps, groundedPresses);
});

test('the simulation step is clamped so a backgrounded tab cannot teleport', () => {
  assert.equal(clampStepSeconds(16.7), 0.0167);
  assert.equal(clampStepSeconds(5000), PHYSICS.maxStepSeconds);
  assert.equal(clampStepSeconds(-40), 0);
  assert.equal(clampStepSeconds(Number.NaN), 0);
});

test('AC-08: the score starts at zero, is an integer, and never decreases', () => {
  assert.equal(scoreForElapsedMs(0), 0);
  assert.equal(scoreForElapsedMs(-5), 0);
  let previous = 0;
  for (let elapsed = 0; elapsed <= 60000; elapsed += 37) {
    const score = scoreForElapsedMs(elapsed);
    assert.ok(Number.isInteger(score));
    assert.ok(score >= previous, `score dropped at ${elapsed}`);
    previous = score;
  }
  assert.equal(scoreForElapsedMs(1000), 10);
  assert.equal(scoreForElapsedMs(10000), 100);
  assert.equal(scoreForElapsedMs(20000), 200);
});

test('AC-08: the score is a function of elapsed time, not of frames rendered', () => {
  // 600 frames at 60fps and 300 frames at 30fps are the same ten seconds
  assert.equal(scoreForElapsedMs(600 * (1000 / 60)), scoreForElapsedMs(300 * (1000 / 30)));
});

test('run speed rises with elapsed time and is capped', () => {
  assert.ok(speedForElapsedMs(20000) > speedForElapsedMs(0));
  assert.equal(speedForElapsedMs(10 * 60 * 1000), 720);
});

test('the readout never shows a negative or fractional score', () => {
  assert.equal(formatScore(0), '0000');
  assert.equal(formatScore(7), '0007');
  assert.equal(formatScore(1234), '1234');
  assert.equal(formatScore(-5), '0000');
});
