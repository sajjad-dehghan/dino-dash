/**
 * Bootstrap (ADR-002 §4): builds the graph, wires input, starts the loop and installs
 * the in-page accessor. The only module with import-time effects.
 *
 * Unit 1 has no persistence path, no network path and no identity surface. There is no
 * `fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`,
 * `indexedDB` or `document.cookie` anywhere in this delivery (AC-22, AC-23, AC-24, AC-25),
 * and no pointer handler of any kind (AC-12).
 */

import { createClock } from './engine/clock.js';
import { createLoop } from './engine/loop.js';
import { createStateMachine, STATES } from './game/state-machine.js';
import { createRunState } from './game/run-state.js';
import { jump } from './game/physics.js';
import { advanceRun, markRunStart } from './game/simulation.js';
import { scoreForElapsedMs } from './game/score.js';
import { scoreTrace } from './trace/score-trace.js';
import { getBackgroundVariations, variationById } from './render/palette.js';
import { createCanvasRenderer } from './render/canvas-renderer.js';
import { createHud } from './render/hud.js';
import { attachKeyboard } from './input/keyboard.js';

const root = document.querySelector('#dino-dash');
const canvas = root.querySelector('#dd-canvas');

const clock = createClock();
const renderer = createCanvasRenderer(canvas);
const hud = createHud(root);

/** Per-run data. Replaced — never scrubbed — on every entry to `running` (AC-13). */
let runState = createRunState(0);
/** The score the last finished run ended on; what the run-end state displays (AC-09). */
let finalScore = 0;

const machine = createStateMachine({
  onTransition({ from, to }) {
    // 1. DOM attribute, 2. accessor (reads the same variable), 3. event (ADR-004 §1).
    root.dataset.gameState = to;
    root.dispatchEvent(
      new CustomEvent('dino-dash:statechange', { bubbles: true, detail: { from, to } })
    );
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
    scoreTrace.appendRunEnd({ score: finalScore, sessionLengthMs: runState.elapsedMs });
  }
}

/** Space and Up Arrow do exactly this, in every state, for the whole session. */
function handleActionPress() {
  const state = machine.getState();
  if (state === STATES.IDLE) {
    enterRun('start');
  } else if (state === STATES.RUNNING) {
    jump(runState.character);
  } else if (state === STATES.RUN_END) {
    enterRun('restart');
  }
}

function frame(nowMs, deltaMs) {
  if (machine.getState() === STATES.RUNNING) {
    // The monotonic start mark is taken on the run's first frame (ADR-003 §2).
    markRunStart(runState, nowMs);
    if (advanceRun(runState, nowMs, deltaMs)) {
      endRun(nowMs);
    }
  }

  const variation = variationById(runState.variationId);
  hud.applyVariation(variation);
  renderer.draw(runState, variation);
  hud.render({ score: runState.score, finalScore });
}

// --- bootstrap, synchronously, before the idle state is presented -------------

hud.applyVariation(variationById(runState.variationId));
hud.render({ score: 0, finalScore: 0 });
renderer.draw(runState, variationById(runState.variationId));

Object.defineProperty(window, 'dinoDash', {
  value: Object.freeze({
    version: 1,
    getScoreTrace() {
      return scoreTrace.list();
    },
    getState() {
      return machine.getState();
    },
    getBackgroundVariations() {
      return getBackgroundVariations();
    }
  }),
  writable: false,
  configurable: false,
  enumerable: true
});

attachKeyboard({ target: window, onActionPress: handleActionPress });
window.addEventListener('resize', renderer.resize);

createLoop({ clock, onFrame: frame }).start();
