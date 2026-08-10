/**
 * Static WCAG computation over every declared palette pair (ADR-004 §2, ADR-005 §3).
 * A palette that cannot pass this check fails before a screenshot is ever taken.
 * Covers the AC-16 / AC-17 thresholds and the objective half of AC-18.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKGROUND_VARIATIONS,
  CONTRAST_REQUIREMENTS,
  contrastRatio,
  getBackgroundVariations,
  hue,
  measureContrast,
  relativeLuminance,
  saturation,
  variationForScore
} from '../../src/render/palette.js';

test('AC-16/AC-17: every declared contrast pair meets its threshold in every variation', () => {
  const rows = measureContrast();
  assert.equal(rows.length, BACKGROUND_VARIATIONS.length * CONTRAST_REQUIREMENTS.length);
  const failures = rows.filter((row) => !row.pass);
  assert.deepEqual(
    failures.map((row) => `${row.variationId}:${row.foregroundKey}/${row.backgroundKey}=${row.ratio}`),
    []
  );
});

test('AC-16: text pairs clear 4.5:1 and non-text pairs clear 3:1', () => {
  for (const row of measureContrast()) {
    if (row.minimum === 4.5) assert.ok(row.ratio >= 4.5, `${row.variationId} ${row.foregroundKey}`);
    else assert.ok(row.ratio >= 3, `${row.variationId} ${row.foregroundKey}`);
  }
});

test('contrast ratio maths agrees with the WCAG reference extremes', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF') * 100) / 100, 21);
  assert.equal(contrastRatio('#123456', '#123456'), 1);
  assert.equal(relativeLuminance('#FFFFFF'), 1);
  assert.equal(relativeLuminance('#000000'), 0);
});

test('AC-18: character, cactus and ground carry three distinct saturated hues', () => {
  for (const variation of BACKGROUND_VARIATIONS) {
    const samples = [variation.character, variation.cactus, variation.groundLine];
    for (const colour of samples) {
      assert.ok(saturation(colour) > 0.25, `${variation.id} ${colour} saturation`);
    }
    const hues = samples.map(hue);
    for (let i = 0; i < hues.length; i += 1) {
      for (let j = i + 1; j < hues.length; j += 1) {
        const separation = Math.abs(hues[i] - hues[j]);
        const circular = Math.min(separation, 360 - separation);
        assert.ok(circular > 25, `${variation.id} hues ${hues[i]} vs ${hues[j]}`);
      }
    }
  }
});

test('ADR-004: the enumeration is closed, ordered and frozen', () => {
  assert.ok(Object.isFrozen(BACKGROUND_VARIATIONS));
  assert.deepEqual(
    BACKGROUND_VARIATIONS.map((variation) => variation.id),
    ['dawn', 'noon', 'dusk']
  );
  for (const variation of BACKGROUND_VARIATIONS) {
    assert.ok(Object.isFrozen(variation));
  }
});

test('ADR-004: variation selection is a deterministic function of score', () => {
  assert.equal(variationForScore(0).id, 'dawn');
  assert.equal(variationForScore(99).id, 'dawn');
  assert.equal(variationForScore(100).id, 'noon');
  assert.equal(variationForScore(199).id, 'noon');
  assert.equal(variationForScore(200).id, 'dusk');
  assert.equal(variationForScore(100000).id, 'dusk');
  // called twice, same answer — no randomness, no wall clock
  assert.equal(variationForScore(150).id, variationForScore(150).id);
});

test('getBackgroundVariations returns copies, so an observer cannot corrupt the palette', () => {
  const copy = getBackgroundVariations();
  copy[0].sky = '#000000';
  assert.notEqual(BACKGROUND_VARIATIONS[0].sky, '#000000');
});
