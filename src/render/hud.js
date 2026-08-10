/**
 * The DOM UI layer (ADR-002 §1).
 *
 * Every character of player-facing text is real DOM text on a fully opaque backing
 * plate, so the background actually rendered behind text is exactly one enumerated
 * palette colour (AC-16). The layer is written FROM run state once per frame and is
 * never read back — run state is the single source of truth.
 *
 * Colours reach CSS only as custom properties written here from the palette, so no
 * colour literal exists in the stylesheet (ADR-004 §2).
 *
 * DOM-side module.
 */

import { formatScore } from '../game/score.js';

export function createHud(root) {
  const elements = {
    score: root.querySelector('#dd-score-value'),
    finalScore: root.querySelector('#dd-final-score-value')
  };

  let appliedVariationId = null;

  /** Push a variation's colours into the stylesheet as custom properties. */
  function applyVariation(variation) {
    if (variation.id === appliedVariationId) return;
    appliedVariationId = variation.id;
    const style = root.ownerDocument.documentElement.style;
    style.setProperty('--dd-sky', variation.sky);
    style.setProperty('--dd-ground', variation.ground);
    style.setProperty('--dd-ground-line', variation.groundLine);
    style.setProperty('--dd-plate', variation.plate);
    style.setProperty('--dd-text-on', variation.textOn);
    style.setProperty('--dd-shell', variation.shell);
    style.setProperty('--dd-shell-text', variation.shellText);
    style.setProperty('--dd-focus', variation.focus);
    root.dataset.backgroundVariation = variation.id;
  }

  /**
   * @param {object} view
   * @param {number} view.score current session score
   * @param {number|null} view.finalScore the score the finished run ended on
   */
  function render(view) {
    const score = formatScore(view.score);
    if (elements.score.textContent !== score) {
      elements.score.textContent = score;
    }
    if (view.finalScore !== null && view.finalScore !== undefined) {
      const finalScore = formatScore(view.finalScore);
      if (elements.finalScore.textContent !== finalScore) {
        elements.finalScore.textContent = finalScore;
      }
    }
  }

  return Object.freeze({ applyVariation, render });
}
