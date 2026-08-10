/**
 * The transition table and its no-ops (ADR-002 §2). Covers the logic half of
 * AC-26 (exactly three states), AC-06 and AC-07 (only collision leaves `running`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENTS,
  STATES,
  STATE_VALUES,
  TRANSITIONS,
  createStateMachine
} from '../../src/game/state-machine.js';

test('AC-26: the state set is exactly three values', () => {
  assert.deepEqual(STATE_VALUES, ['idle', 'running', 'run-end']);
});

test('the declared transition table is exactly three edges', () => {
  assert.deepEqual(TRANSITIONS.idle, { start: 'running' });
  assert.deepEqual(TRANSITIONS.running, { collide: 'run-end' });
  assert.deepEqual(TRANSITIONS['run-end'], { restart: 'running' });
});

test('idle -> running -> run-end -> running is the whole journey', () => {
  const machine = createStateMachine();
  assert.equal(machine.getState(), STATES.IDLE);
  assert.equal(machine.transition('start'), true);
  assert.equal(machine.getState(), STATES.RUNNING);
  assert.equal(machine.transition('collide'), true);
  assert.equal(machine.getState(), STATES.RUN_END);
  assert.equal(machine.transition('restart'), true);
  assert.equal(machine.getState(), STATES.RUNNING);
});

test('AC-07: nothing but collision leaves running', () => {
  const machine = createStateMachine();
  machine.transition('start');
  for (const event of ['start', 'restart', 'jump', 'timeout', 'threshold', 'idle', '']) {
    assert.equal(machine.transition(event), false, `event ${event}`);
    assert.equal(machine.getState(), STATES.RUNNING);
  }
});

test('AC-26: no event sequence reaches a fourth state', () => {
  const machine = createStateMachine();
  const seen = new Set([machine.getState()]);
  const alphabet = [...EVENTS, 'jump', 'pause', 'menu', 'settings', 'leaderboard', 'unknown'];
  for (let round = 0; round < 200; round += 1) {
    for (const event of alphabet) {
      machine.transition(event);
      seen.add(machine.getState());
    }
  }
  assert.deepEqual([...seen].sort(), ['idle', 'run-end', 'running']);
});

test('unlisted transitions are silent no-ops, not errors and not new states', () => {
  const machine = createStateMachine();
  assert.equal(machine.transition('collide'), false);
  assert.equal(machine.transition('restart'), false);
  assert.equal(machine.transition(undefined), false);
  assert.equal(machine.getState(), STATES.IDLE);
});

test('ADR-004: the signal is emitted by the transition, once per real change', () => {
  const emitted = [];
  const machine = createStateMachine({ onTransition: (change) => emitted.push(change) });
  machine.transition('collide'); // no-op
  machine.transition('start');
  machine.transition('collide');
  machine.transition('restart');
  assert.deepEqual(emitted, [
    { from: 'idle', to: 'running', event: 'start' },
    { from: 'running', to: 'run-end', event: 'collide' },
    { from: 'run-end', to: 'running', event: 'restart' }
  ]);
});
