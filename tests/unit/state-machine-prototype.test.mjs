/**
 * WS-10 regression guard for WS-09 finding F-01 (`docs/engineering/WS-09-security-review.md`
 * §3.6.3, §7).
 *
 * `src/game/state-machine.js:45` is
 *
 *     const next = TRANSITIONS[state] ? TRANSITIONS[state][event] : undefined;
 *     if (!next) return false;
 *
 * The lookup consults the prototype chain, so any `Object.prototype` property name
 * supplied as an `event` resolves to a truthy value and is accepted as a transition.
 * The state variable then holds a value that is not in `STATE_VALUES`, and the machine
 * is left with no reachable edge at all.
 *
 * `src/` is sealed at WS-03 and WS-10's write boundary is `tests/` and `docs/`, so the
 * defect is NOT fixed here and these tests do NOT assert that it is fixed. They do three
 * separate jobs:
 *
 *   1. CHARACTERISE the defect, so the behaviour is pinned and a later reader cannot
 *      mistake it for a rumour. If someone fixes `state-machine.js`, these tests fail
 *      loudly and must be rewritten as pass assertions — that is the intended signal.
 *   2. Prove the ONE-LINE FIX is complete and correct, by running the hardened predicate
 *      against the same alphabet. Whoever reopens the module has an executable spec.
 *   3. GUARD THE CONTAINMENT that makes the defect unreachable today: every argument
 *      expression that reaches `transition()` in the delivered source is pinned, so the
 *      moment any later unit routes a string into it, this file fails.
 *
 * Job 3 is the one that protects AC-26 in the future. Jobs 1 and 2 exist so job 3's
 * failure is immediately actionable.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EVENTS,
  STATES,
  STATE_VALUES,
  TRANSITIONS,
  createStateMachine
} from '../../src/game/state-machine.js';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

function listFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...listFiles(path));
    else found.push(path);
  }
  return found;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const sourceFiles = listFiles(SRC)
  .filter((path) => path.endsWith('.js'))
  .map((path) => ({
    name: relative(SRC, path).replace(/\\/g, '/'),
    code: stripComments(readFileSync(path, 'utf8'))
  }));

/** Every argument expression passed at a call site of `name(` in the delivered source. */
function callArguments(name) {
  const found = [];
  const pattern = new RegExp(String.raw`\b${name}\s*\(([^()]*)\)`, 'g');
  for (const file of sourceFiles) {
    for (const match of file.code.matchAll(pattern)) {
      const before = file.code.slice(Math.max(0, match.index - 16), match.index);
      if (/\bfunction\s*$/.test(before)) continue; // the declaration, not a call
      found.push({ file: file.name, argument: match[1].trim() });
    }
  }
  return found;
}

/**
 * Names reachable through the prototype chain of a frozen object literal. Derived at
 * runtime rather than hard-coded, so a future engine that adds or removes an
 * `Object.prototype` member is covered without editing this file.
 */
const INHERITED_NAMES = Object.getOwnPropertyNames(Object.prototype).filter(
  (name) => !Object.hasOwn(TRANSITIONS.idle, name)
);

// ---------------------------------------------------------------------------
// 1. Characterisation — what the delivered module actually does today
// ---------------------------------------------------------------------------

test('F-01 (characterised, NOT fixed): inherited property names are accepted as events', () => {
  assert.ok(INHERITED_NAMES.length >= 10, `expected a populated prototype, got ${INHERITED_NAMES.length}`);
  assert.ok(INHERITED_NAMES.includes('constructor'));
  assert.ok(INHERITED_NAMES.includes('__proto__'));
  assert.equal(Object.getPrototypeOf(TRANSITIONS.idle), Object.prototype);

  const accepted = [];
  const escaped = [];
  for (const name of INHERITED_NAMES) {
    const machine = createStateMachine();
    if (machine.transition(name) === true) accepted.push(name);
    if (!STATE_VALUES.includes(machine.getState())) escaped.push(name);
  }

  // THIS IS THE DEFECT, PINNED. When `state-machine.js` is fixed these two assertions
  // fail, and the correct response is to invert them, not to delete this file.
  assert.deepEqual(accepted, INHERITED_NAMES, 'every inherited name is accepted as an event');
  assert.deepEqual(escaped, INHERITED_NAMES, 'every one of them drives state off STATE_VALUES');
});

test('F-01: `constructor` leaves the state variable holding a function, not a state', () => {
  const machine = createStateMachine();
  assert.equal(machine.getState(), STATES.IDLE);
  assert.equal(machine.transition('constructor'), true);

  const state = machine.getState();
  assert.equal(typeof state, 'function');
  assert.equal(state, Object);
  assert.equal(STATE_VALUES.includes(state), false);

  // The value would reach `root.dataset.gameState` in main.js:39. It stringifies to
  // something inert — no `<`, `>`, `"` or `&` — so this is a state-integrity defect and
  // not an injection vector. Asserted so the severity claim in WS-09 §3.6.3 is machine-checked.
  const rendered = String(state);
  assert.match(rendered, /^function Object\(\)/);
  for (const character of ['<', '>', '"', '&', "'"]) {
    assert.equal(rendered.includes(character), false, `stringified state contains ${character}`);
  }
});

test('F-01: once off the enumeration the machine is bricked — no event is accepted again', () => {
  const machine = createStateMachine();
  machine.transition('toString');
  assert.equal(STATE_VALUES.includes(machine.getState()), false);

  // `TRANSITIONS[state]` is now undefined, so the guard short-circuits for everything.
  for (const event of [...EVENTS, 'constructor', 'toString', '']) {
    assert.equal(machine.transition(event), false, `event ${event} after escape`);
  }
  assert.equal(STATE_VALUES.includes(machine.getState()), false, 'and it never returns');
});

test('F-01: the signal fires for a transition that never should have happened', () => {
  const emitted = [];
  const machine = createStateMachine({ onTransition: (change) => emitted.push(change) });
  machine.transition('hasOwnProperty');

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].from, 'idle');
  assert.equal(emitted[0].event, 'hasOwnProperty');
  assert.equal(typeof emitted[0].to, 'function');
});

// ---------------------------------------------------------------------------
// 2. The fix, as an executable specification
// ---------------------------------------------------------------------------

test('F-01 fix spec: an own-property lookup rejects every inherited name and keeps all three edges', () => {
  /** The corrected line 45, in full. Nothing else in `transition()` needs to change. */
  const hardenedNext = (state, event) =>
    Object.hasOwn(TRANSITIONS, state) && Object.hasOwn(TRANSITIONS[state], event)
      ? TRANSITIONS[state][event]
      : undefined;

  for (const state of STATE_VALUES) {
    for (const name of INHERITED_NAMES) {
      assert.equal(hardenedNext(state, name), undefined, `${state} + ${name}`);
    }
  }

  // Complete, not merely safe: all three declared edges still resolve.
  assert.equal(hardenedNext('idle', 'start'), 'running');
  assert.equal(hardenedNext('running', 'collide'), 'run-end');
  assert.equal(hardenedNext('run-end', 'restart'), 'running');

  // And the state keys themselves are looked up the same way, so a `state` of
  // `'constructor'` cannot reach a row either.
  assert.equal(hardenedNext('constructor', 'start'), undefined);
  assert.equal(hardenedNext('__proto__', 'start'), undefined);
});

test('the declared alphabet is exactly EVENTS — no fourth event name is declared anywhere', () => {
  const declared = new Set();
  for (const state of STATE_VALUES) {
    for (const event of Object.keys(TRANSITIONS[state])) declared.add(event);
  }
  assert.deepEqual([...declared].sort(), [...EVENTS].sort());
  assert.deepEqual(Object.keys(TRANSITIONS).sort(), [...STATE_VALUES].sort());
});

// ---------------------------------------------------------------------------
// 3. Containment — the guard that actually protects AC-26 going forward
// ---------------------------------------------------------------------------

test('F-01 containment: every argument reaching transition() in src/ is pinned', () => {
  const transitionCalls = callArguments('transition');
  const argumentTexts = transitionCalls.map((call) => call.argument).sort();

  // The delivered revision: `main.js:55` passes the literal 'collide'; `main.js:48`
  // passes the parameter of `enterRun`, whose own two call sites pass literals.
  assert.deepEqual(
    argumentTexts,
    ["'collide'", 'event'],
    `transition() call sites changed: ${JSON.stringify(transitionCalls)}`
  );

  const enterRunCalls = callArguments('enterRun').map((call) => call.argument).sort();
  assert.deepEqual(
    enterRunCalls,
    ["'restart'", "'start'"],
    `enterRun() call sites changed: ${JSON.stringify(enterRunCalls)}`
  );

  // Every literal that can reach `transition()` is a declared event.
  for (const literal of ["'collide'", "'restart'", "'start'"]) {
    assert.ok(EVENTS.includes(literal.slice(1, -1)), `${literal} is not a declared event`);
  }
});

test('F-01 containment: no external input expression appears at a transition() call site', () => {
  const untrusted = [
    'event.key',
    'event.code',
    'location',
    'hash',
    'search',
    'params',
    'JSON.parse',
    'dataset',
    'localStorage',
    'sessionStorage',
    'fetch',
    'message',
    'postMessage',
    'querySelector'
  ];
  for (const call of callArguments('transition')) {
    for (const token of untrusted) {
      assert.equal(
        call.argument.includes(token),
        false,
        `${call.file} routes ${token} into transition(): ${call.argument}`
      );
    }
  }
});
