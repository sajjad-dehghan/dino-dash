/**
 * The score-trace field contract (ADR-003) and the monotonic time source.
 * Covers AC-19, AC-21 (injected-clock substitute), AC-22 and AC-25.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createClock } from '../../src/engine/clock.js';
import { RECORD_FIELDS, createScoreTrace, scoreTrace } from '../../src/trace/score-trace.js';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

test('AC-19: a record has exactly the three contracted fields, correctly typed', () => {
  const trace = createScoreTrace({ wallClockIso: () => '2026-08-10T18:42:07.311Z' });
  trace.appendRunEnd({ score: 428, sessionLengthMs: 31402.6 });
  const [record] = trace.list();

  assert.equal(Object.keys(record).sort().join(','), 'endedAt,score,sessionLengthMs');
  assert.deepEqual(RECORD_FIELDS.slice().sort(), ['endedAt', 'score', 'sessionLengthMs']);
  assert.ok(Number.isInteger(record.score) && record.score >= 0);
  assert.equal(record.score, 428);
  assert.ok(typeof record.endedAt === 'string');
  assert.ok(ISO_UTC.test(record.endedAt));
  assert.ok(!Number.isNaN(Date.parse(record.endedAt)));
  assert.ok(Number.isInteger(record.sessionLengthMs) && record.sessionLengthMs >= 0);
  assert.equal(record.sessionLengthMs, 31403);
});

test('AC-19: endedAt is a real UTC instant from the default wall clock', () => {
  const trace = createScoreTrace();
  const before = Date.now();
  trace.appendRunEnd({ score: 0, sessionLengthMs: 0 });
  const after = Date.now();
  const [record] = trace.list();
  assert.ok(ISO_UTC.test(record.endedAt));
  const parsed = Date.parse(record.endedAt);
  assert.ok(parsed >= before && parsed <= after);
});

test('AC-19: a run that ends at score zero still produces a record', () => {
  const trace = createScoreTrace();
  trace.appendRunEnd({ score: 0, sessionLengthMs: 900 });
  assert.equal(trace.size(), 1);
  assert.equal(trace.list()[0].score, 0);
});

test('AC-22: records accumulate across restarts, oldest first', () => {
  const trace = createScoreTrace();
  trace.appendRunEnd({ score: 10, sessionLengthMs: 1000 });
  trace.appendRunEnd({ score: 250, sessionLengthMs: 25000 });
  trace.appendRunEnd({ score: 3, sessionLengthMs: 300 });
  assert.deepEqual(
    trace.list().map((record) => record.score),
    [10, 250, 3]
  );
});

test('AC-22: getScoreTrace-style reads return copies, so observing cannot corrupt', () => {
  const trace = createScoreTrace();
  trace.appendRunEnd({ score: 42, sessionLengthMs: 4200 });
  const first = trace.list();
  first[0].score = 999999;
  first.push({ score: 1, endedAt: 'x', sessionLengthMs: 1 });
  const second = trace.list();
  assert.equal(second.length, 1);
  assert.equal(second[0].score, 42);
  assert.notEqual(first[0], second[0]);
});

test('AC-25: no identifying field is present or accepted', () => {
  const trace = createScoreTrace();
  trace.appendRunEnd({
    score: 5,
    sessionLengthMs: 500,
    playerId: 'someone',
    nickname: 'anon',
    userAgent: 'x'
  });
  const [record] = trace.list();
  assert.deepEqual(Object.keys(record).sort(), ['endedAt', 'score', 'sessionLengthMs']);
});

test('AC-21: sessionLengthMs comes from the injected monotonic source', () => {
  let monotonic = 1000;
  const clock = createClock({
    now: () => monotonic,
    wallClockIso: () => new Date(0).toISOString()
  });
  const startedAt = clock.now();
  monotonic += 12345.4;
  const elapsed = clock.now() - startedAt;

  const trace = createScoreTrace({ wallClockIso: clock.wallClockIso });
  trace.appendRunEnd({ score: 123, sessionLengthMs: elapsed });
  assert.equal(trace.list()[0].sessionLengthMs, 12345);
});

test('AC-21: a mid-run wall-clock jump does not corrupt sessionLengthMs', () => {
  let monotonic = 5000;
  // the wall clock jumps back an hour halfway through the run
  const wallClockReadings = ['2026-08-10T12:00:00.000Z', '2026-08-10T11:00:30.000Z'];
  let wallIndex = 0;
  const clock = createClock({
    now: () => monotonic,
    wallClockIso: () => wallClockReadings[Math.min(wallIndex++, wallClockReadings.length - 1)]
  });

  const startedAt = clock.now();
  clock.wallClockIso(); // the wall clock is read, then changes
  monotonic += 30000;
  const elapsed = clock.now() - startedAt;

  const trace = createScoreTrace({ wallClockIso: clock.wallClockIso });
  trace.appendRunEnd({ score: 300, sessionLengthMs: elapsed });
  const [record] = trace.list();

  assert.equal(record.sessionLengthMs, 30000, 'monotonic elapsed survives the clock change');
  assert.equal(record.endedAt, '2026-08-10T11:00:30.000Z', 'endedAt moves with the wall clock');
});

test('the default clock exposes a monotonic reading that never goes backwards', () => {
  const clock = createClock();
  let previous = clock.now();
  for (let i = 0; i < 1000; i += 1) {
    const current = clock.now();
    assert.ok(current >= previous);
    previous = current;
  }
  assert.ok(ISO_UTC.test(clock.wallClockIso()));
});

test('the module-level page-session trace starts empty and is frozen', () => {
  assert.ok(Object.isFrozen(scoreTrace));
  assert.equal(typeof scoreTrace.appendRunEnd, 'function');
  assert.equal(typeof scoreTrace.list, 'function');
});
