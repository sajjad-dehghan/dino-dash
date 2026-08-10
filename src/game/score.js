/**
 * Session score (ADR-002 §5, AC-08).
 *
 * The score is a pure function of elapsed run time, not of frames rendered, so it is
 * frame-rate independent, integer, starts at zero and never decreases.
 * DOM-free by contract.
 */

import { RUN } from './run-state.js';

/** Integer score for a run that has been going for `elapsedMs`. */
export function scoreForElapsedMs(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs * RUN.scorePerMs);
}

/** Run speed for a run that has been going for `elapsedMs`. */
export function speedForElapsedMs(elapsedMs) {
  const seconds = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs / 1000 : 0;
  return Math.min(
    RUN.maxSpeedPxPerSecond,
    RUN.baseSpeedPxPerSecond + RUN.speedGainPxPerSecondSquared * seconds
  );
}

/** The four-digit readout the HUD shows. Never negative, never fractional. */
export function formatScore(score) {
  const value = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
  return String(value).padStart(4, '0');
}
