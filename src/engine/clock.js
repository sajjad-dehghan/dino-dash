/**
 * Monotonic time source (ADR-003 §2).
 *
 * The time function is injected; it defaults to `performance.now`, reached through
 * `globalThis` so that this module stays DOM-free and importable in Node for the
 * unit tier (ADR-002 §4). Two wall-clock readings are never differenced here.
 */

function defaultMonotonicNow() {
  return globalThis.performance.now();
}

function defaultWallClockIso() {
  return new Date().toISOString();
}

/**
 * @param {object} [options]
 * @param {() => number} [options.now] monotonic millisecond source
 * @param {() => string} [options.wallClockIso] UTC ISO-8601 instant source
 */
export function createClock(options = {}) {
  const now = typeof options.now === 'function' ? options.now : defaultMonotonicNow;
  const wallClockIso =
    typeof options.wallClockIso === 'function' ? options.wallClockIso : defaultWallClockIso;

  return Object.freeze({
    /** Monotonic milliseconds. Never derived from the wall clock. */
    now() {
      return now();
    },
    /** Wall-clock instant as an ISO-8601 UTC string with the literal `Z` designator. */
    wallClockIso() {
      return wallClockIso();
    }
  });
}
