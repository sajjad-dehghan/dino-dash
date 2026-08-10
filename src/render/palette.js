/**
 * Palette and the closed background-variation enumeration (ADR-004 §2).
 *
 * This module is the SINGLE SOURCE OF TRUTH for every colour the delivery renders.
 * No colour literal may appear anywhere else in `src/` — the stylesheet consumes
 * these values as CSS custom properties written by `render/hud.js`, and the canvas
 * renderer reads them directly.
 *
 * DOM-free by contract (ADR-002 §4): no `window`, `document`, `performance` or DOM type.
 */

/** The closed, ordered enumeration of background variations. */
export const BACKGROUND_VARIATIONS = Object.freeze([
  Object.freeze({
    id: 'dawn',
    label: 'Dawn',
    minScore: 0,
    sky: '#FFE3A8',
    ground: '#2B0F3A',
    groundLine: '#B36A15',
    character: '#0E2A5E',
    characterAccent: '#FF9EBB',
    cactus: '#05392A',
    cactusAccent: '#9BE84A',
    textOn: '#241033',
    plate: '#FFE3A8',
    shell: '#2B0F3A',
    shellText: '#FFE3A8',
    focus: '#9BE84A'
  }),
  Object.freeze({
    id: 'noon',
    label: 'Noon',
    minScore: 100,
    sky: '#A9E9FF',
    ground: '#08243B',
    groundLine: '#B85C2E',
    character: '#2E0A5E',
    characterAccent: '#7FD8F7',
    cactus: '#04301F',
    cactusAccent: '#7DE86B',
    textOn: '#08243B',
    plate: '#A9E9FF',
    shell: '#08243B',
    shellText: '#A9E9FF',
    focus: '#7DE86B'
  }),
  Object.freeze({
    id: 'dusk',
    label: 'Dusk',
    minScore: 200,
    sky: '#FFE6F4',
    ground: '#1A0B2E',
    groundLine: '#A87A12',
    character: '#5C0A2E',
    characterAccent: '#FFC94A',
    cactus: '#05392A',
    cactusAccent: '#7DE86B',
    textOn: '#1A0B2E',
    plate: '#FFE6F4',
    shell: '#1A0B2E',
    shellText: '#FFE6F4',
    focus: '#7DE86B'
  })
]);

/** Every colour key that names a rendered surface, in enumeration order. */
export const VARIATION_COLOUR_KEYS = Object.freeze([
  'sky',
  'ground',
  'groundLine',
  'character',
  'characterAccent',
  'cactus',
  'cactusAccent',
  'textOn',
  'plate',
  'shell',
  'shellText',
  'focus'
]);

/**
 * The complete contrast matrix this delivery claims, as
 * [foregroundKey, backgroundKey, minimumRatio, why].
 *
 * 4.5:1 pairs are AC-16 (text). 3:1 pairs are AC-17 (non-text game elements).
 * Every pair below is a place where one surface is actually drawn against another.
 */
export const CONTRAST_REQUIREMENTS = Object.freeze([
  Object.freeze(['textOn', 'plate', 4.5, 'AC-16: all player-facing text sits on an opaque plate']),
  Object.freeze(['shellText', 'shell', 4.5, 'AC-16: page heading text on the app shell']),
  Object.freeze(['character', 'sky', 3, 'AC-17: the character is drawn against the sky']),
  Object.freeze(['character', 'groundLine', 3, 'AC-17: the character stands on the ground line']),
  Object.freeze(['characterAccent', 'character', 3, 'AC-17: character detail against the character body']),
  Object.freeze(['cactus', 'sky', 3, 'AC-17: cacti are drawn against the sky']),
  Object.freeze(['cactus', 'groundLine', 3, 'AC-17: cacti stand on the ground line']),
  Object.freeze(['cactusAccent', 'cactus', 3, 'AC-17: cactus detail against the cactus body']),
  Object.freeze(['groundLine', 'sky', 3, 'AC-17: the ground line borders the sky above it']),
  Object.freeze(['groundLine', 'ground', 3, 'AC-17: the ground line borders the ground below it']),
  Object.freeze(['focus', 'shell', 3, 'AC-14: the focus indicator against the app shell'])
]);

/** Score thresholds are derived from the enumeration itself; selection is deterministic. */
export function variationForScore(score) {
  const value = Number.isFinite(score) ? score : 0;
  let selected = BACKGROUND_VARIATIONS[0];
  for (const variation of BACKGROUND_VARIATIONS) {
    if (value >= variation.minScore) {
      selected = variation;
    }
  }
  return selected;
}

export function variationById(id) {
  return BACKGROUND_VARIATIONS.find((variation) => variation.id === id) || BACKGROUND_VARIATIONS[0];
}

/** A copy of the enumeration, for `window.dinoDash.getBackgroundVariations()` (ADR-003 §4). */
export function getBackgroundVariations() {
  return BACKGROUND_VARIATIONS.map((variation) => ({ ...variation }));
}

function channelToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex) {
  const normalised = String(hex).replace('#', '');
  const red = parseInt(normalised.slice(0, 2), 16);
  const green = parseInt(normalised.slice(2, 4), 16);
  const blue = parseInt(normalised.slice(4, 6), 16);
  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** HSV saturation in [0,1] — the machine-checkable half of AC-18. */
export function saturation(hex) {
  const normalised = String(hex).replace('#', '');
  const red = parseInt(normalised.slice(0, 2), 16) / 255;
  const green = parseInt(normalised.slice(2, 4), 16) / 255;
  const blue = parseInt(normalised.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max === 0 ? 0 : (max - min) / max;
}

/** Hue in degrees [0,360) — used to assert three distinct hues (AC-18). */
export function hue(hex) {
  const normalised = String(hex).replace('#', '');
  const red = parseInt(normalised.slice(0, 2), 16) / 255;
  const green = parseInt(normalised.slice(2, 4), 16) / 255;
  const blue = parseInt(normalised.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return 0;
  let degrees;
  if (max === red) degrees = 60 * (((green - blue) / delta) % 6);
  else if (max === green) degrees = 60 * ((blue - red) / delta + 2);
  else degrees = 60 * ((red - green) / delta + 4);
  return (degrees + 360) % 360;
}

/**
 * Every declared contrast pair, measured. Returns one row per variation per pair.
 * The unit tier asserts `pass` is true for all of them; the browser tier confirms
 * the drawn pixels match these declared colours.
 */
export function measureContrast() {
  const rows = [];
  for (const variation of BACKGROUND_VARIATIONS) {
    for (const [foregroundKey, backgroundKey, minimum, reason] of CONTRAST_REQUIREMENTS) {
      const ratio = contrastRatio(variation[foregroundKey], variation[backgroundKey]);
      rows.push({
        variationId: variation.id,
        foregroundKey,
        backgroundKey,
        foreground: variation[foregroundKey],
        background: variation[backgroundKey],
        ratio: Math.round(ratio * 100) / 100,
        minimum,
        pass: ratio >= minimum,
        reason
      });
    }
  }
  return rows;
}
