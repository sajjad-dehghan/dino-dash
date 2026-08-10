/**
 * Keyboard input (AC-03, AC-04, AC-05, AC-12, AC-15).
 *
 * The whole input surface of the delivery:
 *   Space and Up Arrow — start, jump, restart. Both keys, all session, no mode,
 *   no rebinding, no setting.
 *
 * There is no pointer handler anywhere in this delivery: keyboard is not an
 * alternative path, it is the only path (AC-12).
 *
 * Auto-repeat (`event.repeat`) is ignored, so holding a key produces exactly one
 * jump. `preventDefault()` runs for both keys including repeats, so the page never
 * scrolls and no document default fires (AC-05).
 *
 * DOM-side module.
 */

/** The two keys with an effect. `KeyboardEvent.code`, so layout-independent. */
export const ACTION_KEY_CODES = Object.freeze(['Space', 'ArrowUp']);

/**
 * The same two keys by `KeyboardEvent.key`. Physical presses always carry `code`;
 * this fallback exists so the same two keys are recognised when an event arrives
 * with `key` only, as some automation harnesses produce. It names no third key.
 */
export const ACTION_KEY_VALUES = Object.freeze([' ', 'Spacebar', 'ArrowUp']);

function isActionKey(event) {
  return ACTION_KEY_CODES.includes(event.code) || ACTION_KEY_VALUES.includes(event.key);
}

/**
 * @param {object} options
 * @param {EventTarget} options.target
 * @param {() => void} options.onActionPress fired once per discrete key-down edge
 */
export function attachKeyboard(options) {
  const target = options.target;
  const onActionPress = options.onActionPress;

  function handleKeyDown(event) {
    if (!isActionKey(event)) return;
    // Always suppress the browser default for the handled keys, repeats included.
    event.preventDefault();
    if (event.repeat) return;
    onActionPress();
  }

  target.addEventListener('keydown', handleKeyDown, { passive: false });

  return function detach() {
    target.removeEventListener('keydown', handleKeyDown);
  };
}
