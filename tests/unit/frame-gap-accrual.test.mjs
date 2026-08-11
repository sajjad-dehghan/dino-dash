/**
 * WS-10 coverage for the gap WS-05 §3.8 handed over: score accrual ACROSS A FRAME GAP.
 *
 * `tests/unit/physics-and-score.test.mjs` covers the delta-time clamp
 * (`clampStepSeconds`) and score monotonicity at a steady frame rate. Neither covers the
 * asymmetry those two facts create together, which is the property WS-05 measured by hand
 * and left unasserted:
 *
 *   - `src/game/simulation.js:34-35` derives `elapsedMs` — and therefore the score — from
 *     the RAW monotonic delta since the run's start mark. It is never clamped.
 *   - `src/game/physics.js:38-42` clamps the SIMULATION step to `PHYSICS.maxStepSeconds`,
 *     so world motion, gravity and the collision test advance by at most one clamped step
 *     no matter how long the gap was.
 *
 * A tab left in the background delivers no `requestAnimationFrame` callbacks while
 * `performance.now()` keeps advancing, so the run resumes with one very large delta. This
 * file drives the delivered modules with exactly that schedule.
 *
 * This is a CHARACTERISATION of contracted behaviour, not a defect report. WS-05 §3.8
 * establishes that the behaviour satisfies AC-08, AC-20 and AC-21 as written, and that
 * "fixing" it by subtracting hidden time would fail AC-20. WS-05 L-05 records that the
 * property is carried, not accepted; nothing here accepts it either. What these tests add
 * is that the property cannot now change silently.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PHYSICS, RUN, createRunState } from '../../src/game/run-state.js';
import { advanceRun, markRunStart } from '../../src/game/simulation.js';
import { scoreForElapsedMs } from '../../src/game/score.js';

const FRAME_MS = 1000 / 60;
const RUN_START_MS = 1000;

/** Deterministic obstacle traffic, so a failure here is never a spawn coincidence. */
const fixedRandom = () => 0.5;

/**
 * Play `foregroundMs` at 60 Hz, deliver NO frames for `gapMs`, then deliver exactly one
 * resume frame carrying the whole gap as its delta.
 */
function playThroughGap({ foregroundMs, gapMs }) {
  const runState = createRunState(0);
  let nowMs = RUN_START_MS;
  let previousMs = RUN_START_MS;
  let foregroundFrames = 0;
  let collidedInForeground = false;

  markRunStart(runState, nowMs);
  while (nowMs - RUN_START_MS < foregroundMs) {
    nowMs += FRAME_MS;
    collidedInForeground = advanceRun(runState, nowMs, nowMs - previousMs, fixedRandom) || collidedInForeground;
    previousMs = nowMs;
    foregroundFrames += 1;
  }

  const snapshot = (state) => ({
    elapsedMs: state.elapsedMs,
    score: state.score,
    distancePx: state.distancePx,
    speedPxPerSecond: state.speedPxPerSecond,
    obstacles: state.obstacles.length,
    variationId: state.variationId,
    characterY: state.character.y,
    grounded: state.character.grounded
  });

  const before = snapshot(runState);
  nowMs += gapMs;
  const collidedOnResume = advanceRun(runState, nowMs, nowMs - previousMs, fixedRandom);
  const after = snapshot(runState);

  return { runState, before, after, foregroundFrames, collidedInForeground, collidedOnResume };
}

test('the two constants this whole property rests on are the delivered ones', () => {
  // If either changes, every number asserted below changes with it, and it should be a
  // deliberate act rather than a silent one.
  assert.equal(RUN.scorePerMs, 0.01, 'ten points per second of run time');
  assert.equal(PHYSICS.maxStepSeconds, 0.05, 'the delta-time clamp');
  assert.equal(RUN.maxSpeedPxPerSecond, 720);
});

test('AC-08/AC-20: score accrues across a frame gap at the run-time rate, not the frame rate', () => {
  const gapMs = 60000;
  const { before, after, foregroundFrames } = playThroughGap({ foregroundMs: 2000, gapMs });

  assert.ok(foregroundFrames > 100, `expected a real foreground stretch, got ${foregroundFrames}`);

  // Elapsed time is the raw monotonic delta: the gap is carried in full.
  assert.equal(Math.round(after.elapsedMs - before.elapsedMs), gapMs);

  // Score follows elapsed time exactly — 600 points for 60 s of gap, from one frame.
  assert.equal(after.score - before.score, gapMs * RUN.scorePerMs);
  assert.equal(after.score, scoreForElapsedMs(after.elapsedMs));
  assert.equal(after.score, 620);
  assert.equal(before.score, 20);
});

test('the clamp bounds the world to one step across a gap of any length', () => {
  const { before, after } = playThroughGap({ foregroundMs: 2000, gapMs: 60000 });

  // distance += speed * clampStepSeconds(delta), and speed is at its cap by then.
  const maximumStepPx = RUN.maxSpeedPxPerSecond * PHYSICS.maxStepSeconds;
  assert.equal(maximumStepPx, 36);
  assert.ok(
    after.distancePx - before.distancePx <= maximumStepPx + 1e-9,
    `world advanced ${after.distancePx - before.distancePx} px across the gap`
  );
  assert.equal(Math.round(after.distancePx - before.distancePx), 36);

  // 36 px of motion in place of 60 s of it: the character cannot teleport through a cactus.
  const simulatedMs = ((after.distancePx - before.distancePx) / after.speedPxPerSecond) * 1000;
  assert.ok(simulatedMs <= PHYSICS.maxStepSeconds * 1000 + 1e-9, `${simulatedMs} ms simulated`);
});

test('a gap with zero frames evaluates zero collision tests, so hidden time carries no risk', () => {
  const { before, after, collidedInForeground, collidedOnResume } = playThroughGap({
    foregroundMs: 2000,
    gapMs: 60000
  });

  assert.equal(collidedInForeground, false, 'fixture precondition: the foreground stretch is clean');
  assert.equal(collidedOnResume, false, 'the single resume frame finds no contact');
  assert.equal(after.obstacles, before.obstacles, 'no obstacle traffic resolved across the gap');
});

test('AC-08: the score never decreases across a gap, at any gap length', () => {
  for (const gapMs of [0, 50, 250, 1000, 60000, 3600000]) {
    const { before, after } = playThroughGap({ foregroundMs: 1000, gapMs });
    assert.ok(after.score >= before.score, `score fell across a ${gapMs} ms gap`);
    assert.ok(Number.isInteger(after.score), `non-integer score after a ${gapMs} ms gap`);
    assert.equal(after.score - before.score, Math.floor(gapMs * RUN.scorePerMs));
  }
});

test('AC-08: the score is identical whether the same elapsed time arrives in 1 frame or 3600', () => {
  const gapped = playThroughGap({ foregroundMs: 1000, gapMs: 60000 });

  const targetMs = RUN_START_MS + gapped.after.elapsedMs;
  const continuous = createRunState(0);
  let nowMs = RUN_START_MS;
  let previousMs = RUN_START_MS;
  let continuousFrames = 0;
  markRunStart(continuous, nowMs);
  while (nowMs < targetMs) {
    nowMs = Math.min(targetMs, nowMs + FRAME_MS);
    advanceRun(continuous, nowMs, nowMs - previousMs, fixedRandom);
    previousMs = nowMs;
    continuousFrames += 1;
  }

  // Same wall time, wildly different frame counts: the SCORE agrees.
  assert.ok(continuousFrames > 3000, `continuous frames ${continuousFrames}`);
  assert.equal(continuous.elapsedMs, gapped.after.elapsedMs);
  assert.equal(continuous.score, gapped.after.score);

  // The WORLD does not, and that divergence is the clamp doing its job. Asserted so the
  // asymmetry is a checked property rather than a comment in simulation.js.
  assert.ok(
    continuous.distancePx > gapped.after.distancePx * 10,
    `continuous ${continuous.distancePx} px vs gapped ${gapped.after.distancePx} px`
  );
});

test('the character is integrated by the clamped step, so a gap cannot fling it', () => {
  const runState = createRunState(0);
  const restingY = runState.character.y;
  markRunStart(runState, RUN_START_MS);

  // Jump, then hide the tab mid-air for a minute.
  runState.character.velocityY = -880;
  runState.character.grounded = false;
  advanceRun(runState, RUN_START_MS + 60000, 60000, fixedRandom);

  const stepSeconds = PHYSICS.maxStepSeconds;
  const expectedVelocity = -880 + PHYSICS.gravityPxPerSecondSquared * stepSeconds;
  assert.equal(runState.character.velocityY, expectedVelocity);
  assert.ok(runState.character.y < restingY, 'still airborne after one clamped step');
  assert.ok(runState.character.y > restingY - 200, `character y ${runState.character.y}`);
});

test('the background variation follows the score, so a gap can skip a tier in one frame', () => {
  const { before, after } = playThroughGap({ foregroundMs: 2000, gapMs: 60000 });
  assert.equal(before.variationId, 'dawn');
  assert.notEqual(after.variationId, before.variationId);
  assert.ok(['noon', 'dusk'].includes(after.variationId), `variation ${after.variationId}`);
});
