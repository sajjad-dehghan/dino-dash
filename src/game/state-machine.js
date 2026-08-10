/**
 * The three states, the transition table, and the state signal emission point
 * (ADR-002 §2, ADR-004 §1).
 *
 * The state variable is written ONLY by `transition()` here. No other module assigns it.
 * A transition not present in the table is a no-op — not an error, not a new state.
 * DOM-free by contract; the signal is emitted through an injected callback.
 */

/** The closed state set. Exactly three values, ever (AC-26). */
export const STATES = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  RUN_END: 'run-end'
});

export const STATE_VALUES = Object.freeze([STATES.IDLE, STATES.RUNNING, STATES.RUN_END]);

/** The complete transition table. Everything not listed is a no-op. */
export const TRANSITIONS = Object.freeze({
  idle: Object.freeze({ start: STATES.RUNNING }),
  running: Object.freeze({ collide: STATES.RUN_END }),
  'run-end': Object.freeze({ restart: STATES.RUNNING })
});

export const EVENTS = Object.freeze(['start', 'collide', 'restart']);

/**
 * @param {object} [options]
 * @param {(change: {from: string, to: string, event: string}) => void} [options.onTransition]
 */
export function createStateMachine(options = {}) {
  const onTransition = typeof options.onTransition === 'function' ? options.onTransition : null;
  let state = STATES.IDLE;

  function getState() {
    return state;
  }

  /**
   * Apply an event. Returns true only when the state actually changed.
   * The signal is emitted here, by the only writer, so it cannot drift.
   */
  function transition(event) {
    const next = TRANSITIONS[state] ? TRANSITIONS[state][event] : undefined;
    if (!next) return false;
    const from = state;
    state = next;
    if (onTransition) onTransition({ from, to: next, event });
    return true;
  }

  return Object.freeze({ getState, transition });
}
