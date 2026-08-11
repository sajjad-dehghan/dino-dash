/**
 * WS-10 coverage for WS-09 finding F-02 and limitation L-06: `formatScore` at extreme
 * inputs (`docs/engineering/WS-09-security-review.md` §3.6.2, §7).
 *
 * `src/game/score.js:27-30` is the last thing that runs before the only text sink in the
 * delivery, `hud.js:49,54` `textContent`:
 *
 *     String(Number.isFinite(score) && score > 0 ? Math.floor(score) : 0).padStart(4, '0')
 *
 * `tests/unit/physics-and-score.test.mjs` asserts four ordinary values. WS-09 swept the
 * function by hand and recorded that it emits exponent notation above 1e21. Nothing
 * asserted it. These tests do, and they establish the property WS-09 §3.6.2 rests its
 * "no user-controlled string reaches the DOM" claim on: a hostile input is not escaped,
 * it is DISCARDED and replaced.
 *
 * One correction to F-02 is recorded here, machine-checked below: F-02 states the only
 * characters outside `[0-9]` the function can produce are `e` and `+`. It can also
 * produce `.` — `formatScore(Number.MAX_VALUE)` is `"1.7976931348623157e+308"`. The
 * severity is unchanged (none of the three is HTML-significant, and the sink does not
 * parse markup) but the character set is wider than F-02 states.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { formatScore, scoreForElapsedMs } from '../../src/game/score.js';

/** The longest run the request contemplates measuring: one hour (AC-20 names 30 s). */
const ONE_HOUR_MS = 3600000;

test('AC-08: the readout is exactly four digits until the score needs a fifth', () => {
  assert.equal(formatScore(0), '0000');
  assert.equal(formatScore(1), '0001');
  assert.equal(formatScore(9999), '9999');
  assert.equal(formatScore(10000), '10000');
  assert.equal(formatScore(9999.99), '9999');
});

test('the production domain emits digits only — swept, not sampled', () => {
  const seen = new Set();
  let previous = '';
  for (let elapsedMs = 0; elapsedMs <= ONE_HOUR_MS; elapsedMs += 37) {
    const rendered = formatScore(scoreForElapsedMs(elapsedMs));
    assert.match(rendered, /^[0-9]+$/, `elapsed ${elapsedMs} rendered ${rendered}`);
    assert.ok(rendered.length >= 4 && rendered.length <= 5, `length ${rendered.length}`);
    for (const character of rendered) seen.add(character);
    // Rendered strings are non-decreasing in numeric value across the whole domain.
    if (previous !== '') assert.ok(Number(rendered) >= Number(previous));
    previous = rendered;
  }
  assert.deepEqual([...seen].sort().join(''), '0123456789');
  // An hour of play is a five-digit readout: 36,000 points.
  assert.equal(formatScore(scoreForElapsedMs(ONE_HOUR_MS)), '36000');
});

test('F-02: exponent notation begins at 1e21 and not before', () => {
  assert.equal(formatScore(1e20), '100000000000000000000');
  assert.equal(formatScore(1e21), '1e+21');
  assert.equal(formatScore(1e308), '1e+308');

  // The boundary is JavaScript's own `Number#toString` threshold, so it is a property of
  // the language rather than of this function. Pinned so the claim is checkable.
  assert.equal(String(1e20).includes('e'), false);
  assert.equal(String(1e21).includes('e'), true);
});

test('F-02 corrected: the non-digit characters are `e`, `+` AND `.`', () => {
  const seen = new Set();
  for (let exponent = 0; exponent <= 308; exponent += 1) {
    for (const mantissa of [1, 1.5, 2, 5, 9.99]) {
      const value = mantissa * 10 ** exponent;
      if (!Number.isFinite(value)) continue;
      for (const character of formatScore(value)) seen.add(character);
    }
  }
  const nonDigits = [...seen].filter((character) => !/[0-9]/.test(character)).sort();

  // WS-09 F-02 names two. There are three.
  assert.deepEqual(nonDigits, ['+', '.', 'e']);
  assert.equal(formatScore(Number.MAX_VALUE), '1.7976931348623157e+308');
});

test('AC-16/XSS: no output of formatScore is ever HTML-significant, at any input', () => {
  const dangerous = ['<', '>', '&', '"', "'", '`', '/', '\\', ';', '(', ')', '{', '}', '\n'];
  const inputs = [
    0, 1, -1, -0, 0.5, 9999, 1e15, 1e21, 1e308, Number.MAX_VALUE, Number.MIN_VALUE,
    Number.EPSILON, Number.MAX_SAFE_INTEGER, Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY, Number.NaN
  ];
  for (const input of inputs) {
    const rendered = formatScore(input);
    for (const character of dangerous) {
      assert.equal(rendered.includes(character), false, `formatScore(${String(input)}) -> ${rendered}`);
    }
  }
});

test('hostile and non-numeric inputs are discarded and replaced, never escaped', () => {
  const hostile = [
    '<img src=x onerror=alert(1)>',
    '"><script>alert(1)</script>',
    'javascript:alert(1)',
    '${constructor.constructor("alert(1)")()}',
    'red; background:url(javascript:alert(1))',
    '0000<b>',
    '9999',
    ' 42 ',
    '1e21',
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    -1e308,
    null,
    undefined,
    true,
    false,
    [],
    [1234],
    {},
    { toString: () => '<script>' },
    { valueOf: () => 4321 },
    () => 1234
  ];
  for (const input of hostile) {
    assert.equal(
      formatScore(input),
      '0000',
      `formatScore(${typeof input === 'object' ? JSON.stringify(input) : String(input)})`
    );
  }
});

test('a coerced-looking number is still discarded — no implicit valueOf path exists', () => {
  // `Number.isFinite` does not coerce, so an object that would coerce to a large number
  // is rejected outright. This is what makes the sink safe by construction rather than by
  // the caller being careful.
  const trap = {
    valueOf() {
      throw new Error('formatScore must never coerce its argument');
    }
  };
  assert.equal(formatScore(trap), '0000');
});

test('scoreForElapsedMs is the only producer, and it cannot reach the exponent range', () => {
  // The score is `floor(elapsedMs * 0.01)`. Reaching 1e21 would need 1e23 ms of run time,
  // which is ~3.2e12 years. Stated as an assertion so the "unreachable in production"
  // claim in WS-09 F-02 has a number behind it rather than a judgement.
  const elapsedForExponentNotation = 1e21 / 0.01;
  assert.ok(elapsedForExponentNotation > 1e22);
  assert.equal(formatScore(scoreForElapsedMs(Number.MAX_SAFE_INTEGER)), '90071992547409');
  assert.match(formatScore(scoreForElapsedMs(Number.MAX_SAFE_INTEGER)), /^[0-9]+$/);

  // And the guards hold for the inputs the simulation could actually hand it.
  assert.equal(scoreForElapsedMs(Number.NaN), 0);
  assert.equal(scoreForElapsedMs(Number.POSITIVE_INFINITY), 0);
  assert.equal(scoreForElapsedMs(-1), 0);
});
