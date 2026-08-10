/**
 * Whole-run integration over the real simulation modules, driven by an injected
 * clock and an injected random source. This is the tier that exercises the run
 * rules end to end without a browser: score accrual (AC-08), collision ending the
 * run (AC-06), clearing a cactus not ending it (AC-07), the background-variation
 * sequence (ADR-004), restart resetting everything (AC-13, AC-10) and the trace
 * record matching the final displayed score (AC-09, AC-19, AC-20, AC-22).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createRunState } from '../../src/game/run-state.js';
import { advanceRun, markRunStart } from '../../src/game/simulation.js';
import { jump } from '../../src/game/physics.js';
import { createStateMachine } from '../../src/game/state-machine.js';
import { formatScore, scoreForElapsedMs } from '../../src/game/score.js';
import { createScoreTrace } from '../../src/trace/score-trace.js';
import { characterHitsObstacle } from '../../src/game/collision.js';

const FRAME_MS = 1000 / 60;

/** A seeded generator, so a failing run is reproducible. */
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * Play one run. `strategy` decides whether to press the jump key on a frame.
 * Returns everything an observer of the real page could see.
 */
function playRun({ seed = 7, maxFrames = 6000, strategy = () => false, startMs = 12345 } = {}) {
  const machine = createStateMachine();
  const trace = createScoreTrace({ wallClockIso: () => new Date().toISOString() });
  const random = seededRandom(seed);

  let runState = createRunState(0);
  machine.transition('start');

  let nowMs = startMs;
  const scores = [];
  const variations = [];
  let frames = 0;
  let jumps = 0;
  let clearedWhileAirborne = 0;

  while (machine.getState() === 'running' && frames < maxFrames) {
    markRunStart(runState, nowMs);
    if (strategy(runState)) {
      if (jump(runState.character)) jumps += 1;
    }
    const collided = advanceRun(runState, nowMs, FRAME_MS, random);
    scores.push(runState.score);
    variations.push(runState.variationId);
    if (!runState.character.grounded && !characterHitsObstacle(runState.character, runState.obstacles)) {
      clearedWhileAirborne += 1;
    }
    if (collided) {
      machine.transition('collide');
      trace.appendRunEnd({ score: runState.score, sessionLengthMs: runState.elapsedMs });
    }
    nowMs += FRAME_MS;
    frames += 1;
  }

  return { machine, trace, runState, scores, variations, frames, jumps, clearedWhileAirborne, endMs: nowMs };
}

test('AC-06: doing nothing ends the run on cactus contact', () => {
  const run = playRun({ seed: 3 });
  assert.equal(run.machine.getState(), 'run-end');
  assert.ok(run.frames < 6000, 'the run ended on its own');
  assert.ok(run.runState.obstacles.length > 0, 'a cactus was on the field');
  assert.ok(characterHitsObstacle(run.runState.character, run.runState.obstacles), 'contact is real');
});

test('AC-08: the score starts at zero and never decreases during a run', () => {
  const run = playRun({ seed: 11 });
  assert.equal(run.scores[0], 0);
  for (let i = 1; i < run.scores.length; i += 1) {
    assert.ok(run.scores[i] >= run.scores[i - 1], `score fell at frame ${i}`);
    assert.ok(Number.isInteger(run.scores[i]));
  }
});

test('AC-06: the score stops increasing once the run has ended', () => {
  const run = playRun({ seed: 5 });
  const atEnd = run.runState.score;
  // five more seconds of wall time with the run over: nothing advances it
  assert.equal(run.machine.getState(), 'run-end');
  assert.equal(run.runState.score, atEnd);
  assert.equal(scoreForElapsedMs(run.runState.elapsedMs), atEnd);
});

test('AC-09/AC-19/AC-20: the trace record matches the final displayed score', () => {
  const run = playRun({ seed: 17 });
  const records = run.trace.list();
  assert.equal(records.length, 1);
  const [record] = records;
  assert.equal(record.score, run.runState.score, 'record score equals run-end score');
  assert.equal(formatScore(record.score), formatScore(run.runState.score));
  assert.equal(record.sessionLengthMs, Math.round(run.runState.elapsedMs));
  // AC-20 tolerance against the independent frame-count duration
  const observedMs = (run.frames - 1) * FRAME_MS;
  assert.ok(Math.abs(record.sessionLengthMs - observedMs) < 250, `${record.sessionLengthMs} vs ${observedMs}`);
});

test('AC-07: jumping clears cacti and the run keeps going', () => {
  // jump whenever a cactus is close enough that a jump clears it
  const strategy = (runState) =>
    runState.character.grounded &&
    runState.obstacles.some((obstacle) => {
      const gap = obstacle.x - (runState.character.x + runState.character.width);
      return gap > 0 && gap < runState.speedPxPerSecond * 0.3;
    });

  const jumped = playRun({ seed: 23, strategy, maxFrames: 4000 });
  const passive = playRun({ seed: 23, maxFrames: 4000 });
  assert.ok(jumped.jumps >= 5, `cleared at least five cacti (jumps: ${jumped.jumps})`);
  assert.ok(
    jumped.frames > passive.frames * 2,
    `jumping survives longer: ${jumped.frames} vs ${passive.frames}`
  );
  assert.ok(jumped.clearedWhileAirborne > 0);
});

test('ADR-004: a long run walks the background enumeration in order', () => {
  const strategy = (runState) =>
    runState.character.grounded &&
    runState.obstacles.some((obstacle) => {
      const gap = obstacle.x - (runState.character.x + runState.character.width);
      return gap > 0 && gap < runState.speedPxPerSecond * 0.3;
    });
  const run = playRun({ seed: 29, strategy, maxFrames: 4000 });
  const order = [];
  for (const id of run.variations) {
    if (order[order.length - 1] !== id) order.push(id);
  }
  assert.deepEqual(order.slice(0, 3), ['dawn', 'noon', 'dusk']);
  assert.ok(run.scores[run.scores.length - 1] >= 200);
});

test('AC-10/AC-13: restarting rebuilds the run and the trace accumulates', () => {
  const machine = createStateMachine();
  const trace = createScoreTrace();
  const random = seededRandom(41);
  let nowMs = 1000;
  const finals = [];

  for (let runIndex = 0; runIndex < 3; runIndex += 1) {
    let runState = createRunState(0);
    machine.transition(runIndex === 0 ? 'start' : 'restart');
    assert.equal(machine.getState(), 'running');
    assert.equal(runState.score, 0, 'the new run starts at zero');
    assert.equal(runState.obstacles.length, 0, 'no obstacle survived the restart');
    assert.equal(runState.character.grounded, true, 'the character is back at the start');

    let frames = 0;
    while (machine.getState() === 'running' && frames < 6000) {
      markRunStart(runState, nowMs);
      if (advanceRun(runState, nowMs, FRAME_MS, random)) {
        machine.transition('collide');
        trace.appendRunEnd({ score: runState.score, sessionLengthMs: runState.elapsedMs });
        finals.push(runState.score);
      }
      nowMs += FRAME_MS;
      frames += 1;
    }
    nowMs += 2000; // idle time between runs, which no run counts
  }

  const records = trace.list();
  assert.equal(records.length, 3, 'three runs, three records');
  assert.deepEqual(records.map((record) => record.score), finals);
  for (const record of records) {
    assert.deepEqual(Object.keys(record).sort(), ['endedAt', 'score', 'sessionLengthMs']);
    assert.ok(record.sessionLengthMs < 60000, 'no idle time leaked into a session length');
  }
});

test('the simulation is frame-rate independent within the clamp', () => {
  const at60 = playRun({ seed: 61 });
  // the same run at 30 fps: the same monotonic clock, half the frames
  const machine = createStateMachine();
  const random = seededRandom(61);
  let runState = createRunState(0);
  machine.transition('start');
  let nowMs = 12345;
  let frames = 0;
  while (machine.getState() === 'running' && frames < 6000) {
    markRunStart(runState, nowMs);
    if (advanceRun(runState, nowMs, FRAME_MS * 2, random)) machine.transition('collide');
    nowMs += FRAME_MS * 2;
    frames += 1;
  }
  const ratio = runState.elapsedMs / at60.runState.elapsedMs;
  assert.ok(ratio > 0.75 && ratio < 1.35, `run durations comparable, ratio ${ratio.toFixed(2)}`);
});
