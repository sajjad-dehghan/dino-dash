/**
 * Collision geometry (AC-06, AC-07) and deterministic obstacle stepping.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LAYOUT, createRunState } from '../../src/game/run-state.js';
import { characterHitsObstacle, overlaps } from '../../src/game/collision.js';
import { CACTUS_KINDS, createObstacle, stepObstacles } from '../../src/game/obstacles.js';
import { jump, stepCharacter } from '../../src/game/physics.js';

const sequence = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

test('AC-06: contact with a cactus is a hit', () => {
  const state = createRunState(0);
  const cactus = createObstacle(CACTUS_KINDS[1], state.character.x + 10);
  assert.equal(characterHitsObstacle(state.character, [cactus]), true);
});

test('AC-07: a cactus that has not reached the character is not a hit', () => {
  const state = createRunState(0);
  const cactus = createObstacle(CACTUS_KINDS[1], LAYOUT.width);
  assert.equal(characterHitsObstacle(state.character, [cactus]), false);
});

test('AC-07: clearing a cactus by jumping over it does not end the run', () => {
  const state = createRunState(0);
  const cactus = createObstacle(CACTUS_KINDS[0], LAYOUT.width * 0.5);
  state.obstacles.push(cactus);
  let hit = false;
  for (let frame = 0; frame < 400; frame += 1) {
    const gap = cactus.x - state.character.x;
    if (gap <= 120 && gap > 100 && state.character.grounded) jump(state.character);
    cactus.x -= 6.3;
    stepCharacter(state.character, 1 / 60);
    if (characterHitsObstacle(state.character, state.obstacles)) hit = true;
  }
  assert.equal(hit, false);
  assert.ok(cactus.x < state.character.x, 'the cactus passed the character');
});

test('AC-07: an empty field is never a hit, at any character height', () => {
  const state = createRunState(0);
  for (let y = 0; y < LAYOUT.groundY; y += 7) {
    state.character.y = y;
    assert.equal(characterHitsObstacle(state.character, []), false);
  }
});

test('overlap is axis-aligned and exclusive at the edges', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(overlaps(a, { x: 10, y: 0, width: 10, height: 10 }), false);
  assert.equal(overlaps(a, { x: 9.9, y: 0, width: 10, height: 10 }), true);
  assert.equal(overlaps(a, { x: 0, y: 10, width: 10, height: 10 }), false);
});

test('cacti spawn on distance travelled, then despawn off the left edge', () => {
  const state = createRunState(0);
  const random = sequence([0, 0.5, 0.99]);
  let spawned = 0;
  for (let frame = 0; frame < 3000; frame += 1) {
    const before = state.obstacles.length;
    stepObstacles(state, 1 / 60, random);
    if (state.obstacles.length > before) spawned += 1;
  }
  assert.ok(spawned >= 3, `spawned ${spawned}`);
  for (const obstacle of state.obstacles) {
    assert.ok(obstacle.x + obstacle.width > -40);
    assert.ok(obstacle.x <= LAYOUT.width + 24);
    assert.equal(obstacle.y, LAYOUT.groundY - obstacle.height);
  }
});

test('every obstacle kind is a cactus standing on the ground line', () => {
  for (const kind of CACTUS_KINDS) {
    const obstacle = createObstacle(kind, 100);
    assert.equal(obstacle.y + obstacle.height, LAYOUT.groundY);
    assert.ok(obstacle.height > 0 && obstacle.width > 0);
  }
});

test('stepping obstacles is deterministic under an injected random source', () => {
  const a = createRunState(0);
  const b = createRunState(0);
  const randomA = sequence([0.2, 0.7]);
  const randomB = sequence([0.2, 0.7]);
  for (let frame = 0; frame < 900; frame += 1) {
    stepObstacles(a, 1 / 60, randomA);
    stepObstacles(b, 1 / 60, randomB);
  }
  assert.deepEqual(a.obstacles, b.obstacles);
});
