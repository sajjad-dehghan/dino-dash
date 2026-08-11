/**
 * WS-10: AC-29 — the documented score-trace field contract and the delivered behaviour
 * agree.
 *
 * AC-29's verification is "locate the documentation without reading the run-loop source,
 * predict the three field names, their types and their units from the documentation
 * alone, then compare against an actual record". That is a human procedure, and this file
 * does not pretend to be it. What it does is close the half a machine can close: it reads
 * the DOCUMENT, extracts the contract from it, and asserts the delivered module satisfies
 * exactly that — so the two can never drift apart silently, which is the failure AC-29 is
 * really guarding against.
 *
 * `docs/architecture/decisions/ADR-003-score-trace-field-contract.md` §1 publishes an
 * assertion block "ENG-10 can write directly from this table". This file executes that
 * block verbatim against a real record, plus the field/type/unit/timezone claims around it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { RECORD_FIELDS, createScoreTrace, scoreTrace } from '../../src/trace/score-trace.js';

const ADR_003 = readFileSync(
  fileURLToPath(new URL('../../docs/architecture/decisions/ADR-003-score-trace-field-contract.md', import.meta.url)),
  'utf8'
);
const README = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8');

/** A real record from the delivered module, produced the way the game produces one. */
function makeRecord({ score = 428, sessionLengthMs = 31402 } = {}) {
  const trace = createScoreTrace();
  return trace.appendRunEnd({ score, sessionLengthMs });
}

test('AC-29: the documentation exists where a Unit 3 author will look', () => {
  // Two independent locations, so the contract does not depend on one file surviving.
  assert.match(ADR_003, /## Decision/);
  assert.match(ADR_003, /score-trace field contract/i);
  for (const field of RECORD_FIELDS) {
    assert.ok(ADR_003.includes(field), `ADR-003 does not name ${field}`);
    assert.ok(README.includes(field), `README does not name ${field}`);
  }
});

test('AC-29: the documented field set is exactly the delivered field set', () => {
  const record = makeRecord();
  assert.deepEqual(Object.keys(record).sort(), [...RECORD_FIELDS].sort());
  assert.deepEqual([...RECORD_FIELDS].sort(), ['endedAt', 'score', 'sessionLengthMs']);

  // ADR-003 §1 states "Exactly three fields. No more in Unit 1."
  assert.match(ADR_003, /Exactly three fields\. No more in Unit 1\./);
  assert.equal(Object.keys(record).length, 3);
});

test("AC-29: ADR-003's own published assertion block passes against a real record", () => {
  const record = makeRecord();

  // Transcribed from ADR-003 §1, "Assertions ENG-10 can write directly from this table".
  assert.ok(Number.isInteger(record.score) && record.score >= 0);
  assert.equal(typeof record.endedAt, 'string');
  assert.match(record.endedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(Number.isNaN(Date.parse(record.endedAt)), false);
  assert.ok(Number.isInteger(record.sessionLengthMs) && record.sessionLengthMs >= 0);
  assert.equal(Object.keys(record).sort().join(','), 'endedAt,score,sessionLengthMs');

  // The block is still in the document it was transcribed from.
  assert.ok(ADR_003.includes('Object.keys(record).sort().join(",") === "endedAt,score,sessionLengthMs"'));
});

test('AC-29: the documented units and types hold — points, UTC Z instant, integer ms', () => {
  const record = makeRecord({ score: 428, sessionLengthMs: 31402 });

  assert.equal(record.score, 428, 'score is the final session score, unmodified');
  assert.equal(record.sessionLengthMs, 31402, 'sessionLengthMs is milliseconds, unmodified');
  assert.ok(record.endedAt.endsWith('Z'), 'endedAt carries the literal Z designator');

  // ADR-003 is explicit that Z is the explicit-offset form AC-19 asks for, and that no
  // local-offset information is recoverable.
  assert.match(ADR_003, /literal `Z` designator/);
  assert.match(ADR_003, /It is \*\*not\*\* local time/);

  // Fractional inputs are rounded to integers, as documented ("`Math.round` of the delta").
  const rounded = makeRecord({ score: 12.7, sessionLengthMs: 999.4 });
  assert.equal(rounded.score, 13);
  assert.equal(rounded.sessionLengthMs, 999);
  assert.ok(Number.isInteger(rounded.score) && Number.isInteger(rounded.sessionLengthMs));
});

test('AC-29/AC-19: the record is a plain JSON-serializable object, no prototype tricks', () => {
  const record = makeRecord();
  assert.equal(Object.getPrototypeOf(record), Object.prototype);
  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
  for (const key of Object.keys(record)) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    assert.equal(typeof descriptor.get, 'undefined', `${key} is a getter`);
    assert.equal(descriptor.enumerable, true);
  }
  assert.match(ADR_003, /no prototype tricks, no getters and no nested\s*\nobjects\./);
});

test('AC-29/AC-25: no field beyond the three is accepted, whatever the caller passes', () => {
  const trace = createScoreTrace();
  const record = trace.appendRunEnd({
    score: 10,
    sessionLengthMs: 1000,
    nickname: 'ali',
    playerId: 'p-1',
    deviceId: 'd-1',
    userAgent: 'Mozilla/5.0',
    locale: 'fa-IR',
    screen: '1920x1080'
  });
  assert.deepEqual(Object.keys(record).sort(), ['endedAt', 'score', 'sessionLengthMs']);
  assert.deepEqual(Object.keys(trace.list()[0]).sort(), ['endedAt', 'score', 'sessionLengthMs']);
});

test('AC-29: the documented lifecycle holds — one record per run end, oldest first', () => {
  const trace = createScoreTrace();
  assert.equal(trace.size(), 0, 'a fresh page session starts empty');
  trace.appendRunEnd({ score: 1, sessionLengthMs: 100 });
  trace.appendRunEnd({ score: 2, sessionLengthMs: 200 });
  trace.appendRunEnd({ score: 3, sessionLengthMs: 300 });
  assert.deepEqual(trace.list().map((record) => record.score), [1, 2, 3]);
  assert.match(ADR_003, /\*\*Order\*\* is chronological, oldest first/);

  // ADR-003 §3 forbids an unload handler; the module must have no cleanup surface at all.
  assert.deepEqual(Object.keys(scoreTrace).sort(), ['appendRunEnd', 'list', 'size']);
  assert.equal(Object.isFrozen(scoreTrace), true);
});
