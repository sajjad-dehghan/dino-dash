/**
 * WS-10: the complete Unit 1 journey — open, start, jump, collide, restart, collide —
 * driven by keyboard events and nothing else (AC-02, AC-03, AC-04, AC-05, AC-10, AC-11,
 * AC-12, AC-13, AC-15, AC-26).
 *
 * WS-12 R-07 records that AC-12's keyboard-only journey has no machine evidence, because
 * the browser tier does not exist. This file supplies the part that does not need a
 * browser: the real `src/input/keyboard.js` attached to a real `EventTarget`, driven by
 * real `keydown` events, wired to the real state machine, run state, physics, simulation
 * and score trace, with a real `createLoop` pumped by an injected frame scheduler.
 *
 * WHAT THIS IS NOT, stated plainly so it is not over-read: `src/main.js` is not imported
 * — it touches `document` at import time. `createHeadlessGame` below RE-CREATES main.js's
 * wiring over the same modules, so a divergence between the two would not be caught here.
 * Nor does it render anything: no canvas, no HUD, no focus ring, no page scroll. AC-05's
 * "the document does not scroll" and AC-11's "the instruction is legible" remain browser
 * observations. What is evidenced is that the journey is COMPLETABLE from key events
 * alone, that every key with an effect is one of the two documented keys, and that the
 * defaults of those two keys are suppressed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createLoop } from '../../src/engine/loop.js';
import { createStateMachine, STATES, STATE_VALUES } from '../../src/game/state-machine.js';
import { createRunState } from '../../src/game/run-state.js';
import { jump } from '../../src/game/physics.js';
import { advanceRun, markRunStart } from '../../src/game/simulation.js';
import { scoreForElapsedMs, formatScore } from '../../src/game/score.js';
import { createScoreTrace } from '../../src/trace/score-trace.js';
import { attachKeyboard, ACTION_KEY_CODES, ACTION_KEY_VALUES } from '../../src/input/keyboard.js';

const FRAME_MS = 1000 / 60;

/** A `keydown` an automation harness or a real browser would produce. */
class KeyDown extends Event {
  constructor({ code = '', key = '', repeat = false } = {}) {
    super('keydown', { cancelable: true });
    this.code = code;
    this.key = key;
    this.repeat = repeat;
  }
}

/**
 * main.js's wiring, minus the DOM. Every decision below is the one main.js makes:
 * `handleActionPress` branches on state exactly as `src/main.js:61-70` does, and
 * `frame` mirrors `src/main.js:72-85` for the simulation half.
 */
function createHeadlessGame({ seed = 7 } = {}) {
  const registered = [];
  const target = new EventTarget();
  const originalAdd = target.addEventListener.bind(target);
  target.addEventListener = (type, listener, options) => {
    registered.push(type);
    return originalAdd(type, listener, options);
  };

  let value = seed >>> 0;
  const random = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };

  const trace = createScoreTrace({ wallClockIso: () => new Date().toISOString() });
  let runState = createRunState(0);
  let finalScore = 0;
  const stateLog = [];

  const machine = createStateMachine({
    onTransition({ to }) {
      stateLog.push(to);
    }
  });

  function enterRun(event) {
    runState = createRunState(0);
    machine.transition(event);
  }

  function endRun(nowMs) {
    runState.elapsedMs = Math.max(0, nowMs - runState.startedAtMs);
    runState.score = scoreForElapsedMs(runState.elapsedMs);
    finalScore = runState.score;
    if (machine.transition('collide')) {
      trace.appendRunEnd({ score: finalScore, sessionLengthMs: runState.elapsedMs });
    }
  }

  let jumps = 0;
  function handleActionPress() {
    const state = machine.getState();
    if (state === STATES.IDLE) enterRun('start');
    else if (state === STATES.RUNNING) {
      if (jump(runState.character)) jumps += 1;
    } else if (state === STATES.RUN_END) enterRun('restart');
  }

  let nowMs = 5000;
  let pending = null;
  const clock = { now: () => nowMs };
  const loop = createLoop({
    clock,
    requestFrame: (callback) => {
      pending = callback;
    },
    onFrame(frameNowMs, deltaMs) {
      if (machine.getState() === STATES.RUNNING) {
        markRunStart(runState, frameNowMs);
        if (advanceRun(runState, frameNowMs, deltaMs, random)) endRun(frameNowMs);
      }
    }
  });

  const detach = attachKeyboard({ target, onActionPress: handleActionPress });
  loop.start();

  return {
    registered,
    detach,
    press(descriptor) {
      const event = new KeyDown(descriptor);
      target.dispatchEvent(event);
      return event;
    },
    /** Advance the loop by `frames` animation frames. */
    tick(frames = 1) {
      for (let index = 0; index < frames; index += 1) {
        nowMs += FRAME_MS;
        const callback = pending;
        pending = null;
        if (callback) callback();
      }
    },
    /** Run frames until the state changes or the budget runs out. */
    tickUntilRunEnd(maxFrames = 6000) {
      let frames = 0;
      while (machine.getState() === STATES.RUNNING && frames < maxFrames) {
        this.tick(1);
        frames += 1;
      }
      return frames;
    },
    state: () => machine.getState(),
    score: () => runState.score,
    displayedScore: () => formatScore(runState.score),
    finalScore: () => finalScore,
    displayedFinalScore: () => formatScore(finalScore),
    character: () => runState.character,
    obstacles: () => runState.obstacles,
    trace,
    stateLog,
    jumpCount: () => jumps
  };
}

test('AC-12: the whole journey — open, start, jump, collide, restart, collide — is keyboard-only', () => {
  const game = createHeadlessGame();
  const steps = [];

  // 1. open
  assert.equal(game.state(), 'idle');
  assert.equal(game.displayedScore(), '0000');
  steps.push('open');

  // 2. start — Space
  game.press({ code: 'Space', key: ' ' });
  assert.equal(game.state(), 'running');
  steps.push('start');

  // 3. jump — Up Arrow, mid-run
  game.tick(30);
  const before = game.jumpCount();
  game.press({ code: 'ArrowUp', key: 'ArrowUp' });
  assert.equal(game.jumpCount(), before + 1);
  assert.equal(game.character().grounded, false);
  steps.push('jump');

  // 4. collide — reached by playing, no input at all
  const frames = game.tickUntilRunEnd();
  assert.equal(game.state(), 'run-end');
  assert.ok(frames > 1 && frames < 6000, `run ended after ${frames} frames`);
  steps.push('collide');

  // 5. restart — Space again, no reload
  const firstFinal = game.finalScore();
  assert.ok(firstFinal > 0, `first run scored ${firstFinal}`);
  game.press({ code: 'Space', key: ' ' });
  assert.equal(game.state(), 'running');
  assert.equal(game.score(), 0, 'AC-10: the new run starts at zero');
  steps.push('restart');

  // 6. collide again
  game.tickUntilRunEnd();
  assert.equal(game.state(), 'run-end');
  steps.push('collide-again');

  assert.deepEqual(steps, ['open', 'start', 'jump', 'collide', 'restart', 'collide-again']);
  assert.equal(game.trace.size(), 2, 'AC-22: one trace record per completed run');

  // The expected count of steps that could not be performed by keyboard is zero.
  assert.equal(steps.length, 6);
});

test('AC-12: the delivery registers exactly one listener type, and it is keydown', () => {
  const game = createHeadlessGame();
  assert.deepEqual(game.registered, ['keydown']);
});

test('AC-02/AC-04: both documented keys start a run, and neither is a mode', () => {
  for (const descriptor of [
    { code: 'Space', key: ' ' },
    { code: 'ArrowUp', key: 'ArrowUp' },
    { code: '', key: ' ' },
    { code: '', key: 'Spacebar' },
    { code: '', key: 'ArrowUp' }
  ]) {
    const game = createHeadlessGame();
    game.press(descriptor);
    assert.equal(game.state(), 'running', `${JSON.stringify(descriptor)} did not start the run`);
  }

  // No configuration step exists to require: the key set is a frozen module constant.
  assert.deepEqual([...ACTION_KEY_CODES], ['Space', 'ArrowUp']);
  assert.deepEqual([...ACTION_KEY_VALUES], [' ', 'Spacebar', 'ArrowUp']);
  assert.ok(Object.isFrozen(ACTION_KEY_CODES) && Object.isFrozen(ACTION_KEY_VALUES));
});

test('AC-04: alternating Space and Up Arrow within one run jumps four times', () => {
  const game = createHeadlessGame();
  game.press({ code: 'Space', key: ' ' });
  let jumps = 0;
  for (const code of ['Space', 'ArrowUp', 'Space', 'ArrowUp']) {
    // return to the ground before each press, so each is a grounded press
    while (!game.character().grounded) game.tick(1);
    const before = game.jumpCount();
    game.press({ code, key: code === 'Space' ? ' ' : 'ArrowUp' });
    if (game.jumpCount() > before) jumps += 1;
    game.tick(1);
  }
  assert.equal(jumps, 4, 'all four presses jumped, with no rebinding or toggle');
});

test('AC-03: holding a key produces exactly one jump, not a repeat stream', () => {
  const game = createHeadlessGame();
  game.press({ code: 'Space', key: ' ' });
  const before = game.jumpCount();

  // One real edge, then twenty auto-repeats from the same physical hold.
  game.press({ code: 'Space', key: ' ', repeat: false });
  for (let index = 0; index < 20; index += 1) {
    const event = game.press({ code: 'Space', key: ' ', repeat: true });
    // AC-05: the default is suppressed for repeats too, or the page would scroll on hold.
    assert.equal(event.defaultPrevented, true, 'a repeat did not have its default suppressed');
  }
  assert.equal(game.jumpCount(), before + 1, 'a held key produced more than one jump');
});

test('AC-05: the two handled keys always suppress the browser default, and no other key does', () => {
  const game = createHeadlessGame();

  for (const descriptor of [
    { code: 'Space', key: ' ' },
    { code: 'ArrowUp', key: 'ArrowUp' },
    { code: 'Space', key: ' ', repeat: true }
  ]) {
    assert.equal(game.press(descriptor).defaultPrevented, true, JSON.stringify(descriptor));
  }

  for (const descriptor of [
    { code: 'Enter', key: 'Enter' },
    { code: 'Escape', key: 'Escape' },
    { code: 'Tab', key: 'Tab' },
    { code: 'ArrowDown', key: 'ArrowDown' },
    { code: 'ArrowLeft', key: 'ArrowLeft' },
    { code: 'ArrowRight', key: 'ArrowRight' },
    { code: 'PageDown', key: 'PageDown' },
    { code: 'KeyA', key: 'a' }
  ]) {
    assert.equal(
      game.press(descriptor).defaultPrevented,
      false,
      `${descriptor.code} had its default suppressed — Tab must stay operable (AC-14)`
    );
  }
});

test('AC-15/AC-26: no key but the two documented ones has any effect, in any state', () => {
  const others = [
    'Enter', 'Escape', 'Tab', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End',
    'PageUp', 'PageDown', 'KeyA', 'KeyR', 'KeyP', 'KeyS', 'Digit1', 'F5', 'Backspace',
    'Delete', 'ShiftLeft', 'ControlLeft', 'AltLeft', 'MetaLeft'
  ];
  const game = createHeadlessGame();
  const seen = new Set([game.state()]);

  for (const phase of ['idle', 'running', 'run-end']) {
    if (phase === 'running') game.press({ code: 'Space', key: ' ' });
    if (phase === 'run-end') game.tickUntilRunEnd();
    assert.equal(game.state(), phase);

    for (const code of others) {
      const stateBefore = game.state();
      const scoreBefore = game.score();
      const jumpsBefore = game.jumpCount();
      game.press({ code, key: code });
      assert.equal(game.state(), stateBefore, `${code} changed the state in ${phase}`);
      assert.equal(game.score(), scoreBefore, `${code} changed the score in ${phase}`);
      assert.equal(game.jumpCount(), jumpsBefore, `${code} caused a jump in ${phase}`);
      seen.add(game.state());
    }
  }

  assert.deepEqual([...seen].sort(), [...STATE_VALUES].sort());
});

test('AC-10/AC-13: five consecutive keyboard restarts, each starting from zero', () => {
  const game = createHeadlessGame();
  const finals = [];

  game.press({ code: 'Space', key: ' ' });
  for (let round = 0; round < 5; round += 1) {
    game.tickUntilRunEnd();
    assert.equal(game.state(), 'run-end');
    finals.push(game.finalScore());

    game.press({ code: 'ArrowUp', key: 'ArrowUp' });
    assert.equal(game.state(), 'running');
    assert.equal(game.score(), 0, `round ${round}: score did not reset`);
    assert.equal(game.displayedScore(), '0000');
    assert.equal(game.obstacles().length, 0, `round ${round}: an obstacle survived the restart`);
    assert.equal(game.character().grounded, true, `round ${round}: the character did not reset`);
  }

  assert.equal(finals.length, 5);
  assert.ok(finals.every((score) => score > 0));
  assert.equal(game.trace.size(), 5, 'AC-22: records accumulate across restarts');
});

test('AC-09: the run-end score equals the last score of the run that produced it', () => {
  const game = createHeadlessGame();
  game.press({ code: 'Space', key: ' ' });
  game.tickUntilRunEnd();

  assert.equal(game.finalScore(), game.score());
  assert.equal(game.displayedFinalScore(), game.displayedScore());

  const record = game.trace.list().at(-1);
  assert.equal(record.score, game.finalScore());
  assert.equal(record.sessionLengthMs > 0, true);

  // And it stays put: five seconds of frames after the end change nothing (AC-06).
  const frozen = game.finalScore();
  game.tick(300);
  assert.equal(game.finalScore(), frozen);
  assert.equal(game.trace.size(), 1, 'the run did not end twice');
});

test('AC-26: the keyboard-reachable state set is exactly three', () => {
  const game = createHeadlessGame();
  const seen = new Set([game.state()]);
  for (let round = 0; round < 400; round += 1) {
    game.press({ code: round % 2 === 0 ? 'Space' : 'ArrowUp', key: round % 2 === 0 ? ' ' : 'ArrowUp' });
    game.tick(3);
    seen.add(game.state());
  }
  assert.deepEqual([...seen].sort(), ['idle', 'run-end', 'running']);
  for (const state of seen) assert.ok(STATE_VALUES.includes(state));
});

test('AC-02/AC-11/AC-15: each state carries an on-screen instruction naming its keys', () => {
  const html = readFileSync(fileURLToPath(new URL('../../src/index.html', import.meta.url)), 'utf8');

  // AC-02 — the idle state tells the player how to start.
  const startInstruction = html.match(/id="dd-idle-instruction"[\s\S]*?<\/p>/);
  assert.ok(startInstruction, 'no start instruction element exists');
  assert.match(startInstruction[0], /Space/);
  assert.match(startInstruction[0], /Up Arrow/);
  assert.match(startInstruction[0], /start/i);

  // AC-11 — the run-end state tells the player how to restart.
  const restartInstruction = html.match(/id="dd-restart-instruction"[\s\S]*?<\/p>/);
  assert.ok(restartInstruction, 'no restart instruction element exists');
  assert.match(restartInstruction[0], /Space/);
  assert.match(restartInstruction[0], /Up Arrow/);

  // AC-15 — every key with an effect is named, and the two named keys are the two the
  // module handles. The effect side of this is asserted by the sweep test above.
  for (const key of [...ACTION_KEY_CODES]) {
    const label = key === 'Space' ? 'Space' : 'Up Arrow';
    assert.ok(html.includes(label), `${label} is not named on screen`);
  }
  assert.ok(html.includes('Tab'), 'Tab is not named on screen');
});

test('detaching removes the only listener, so the input surface has a clean lifetime', () => {
  const game = createHeadlessGame();
  game.detach();
  game.press({ code: 'Space', key: ' ' });
  assert.equal(game.state(), 'idle');
});
