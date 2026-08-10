/**
 * The score trace (ADR-003).
 *
 * One record per run end, appended by the `running -> run-end` transition and by
 * nothing else. Exactly three fields:
 *
 *   { score: integer, endedAt: ISO-8601 UTC string with `Z`, sessionLengthMs: integer }
 *
 * Page memory only. There is no persistence path in this delivery to clear — no
 * localStorage, no sessionStorage, no IndexedDB, no cookie, no fetch, no sendBeacon,
 * no XMLHttpRequest, no WebSocket. The array dies with the page's JavaScript realm,
 * so there is deliberately NO unload handler here (ADR-003 §3).
 *
 * DOM-free by contract; the wall clock is injected.
 */

/** The frozen field set. Any additional field is a defect in Unit 1 (AC-25). */
export const RECORD_FIELDS = Object.freeze(['endedAt', 'score', 'sessionLengthMs']);

function toNonNegativeInteger(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

/**
 * @param {object} [options]
 * @param {() => string} [options.wallClockIso] returns the UTC ISO-8601 instant
 */
export function createScoreTrace(options = {}) {
  const wallClockIso =
    typeof options.wallClockIso === 'function'
      ? options.wallClockIso
      : () => new Date().toISOString();

  /** @type {{score: number, endedAt: string, sessionLengthMs: number}[]} */
  const records = [];

  /**
   * Append exactly one record for a run that just ended.
   * @param {{score: number, sessionLengthMs: number}} run
   */
  function appendRunEnd(run) {
    const record = {
      score: toNonNegativeInteger(run.score),
      endedAt: wallClockIso(),
      sessionLengthMs: toNonNegativeInteger(run.sessionLengthMs)
    };
    records.push(record);
    return { ...record };
  }

  /** A new array of new objects on every call, so observing cannot corrupt (ADR-003 §4). */
  function list() {
    return records.map((record) => ({
      score: record.score,
      endedAt: record.endedAt,
      sessionLengthMs: record.sessionLengthMs
    }));
  }

  function size() {
    return records.length;
  }

  return Object.freeze({ appendRunEnd, list, size });
}

/** The page-session trace. Module state; survives restarts, dies with the realm (AC-22). */
export const scoreTrace = createScoreTrace();
