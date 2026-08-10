/**
 * requestAnimationFrame loop (ADR-002 §5).
 *
 * Injects the clock, hands each frame a raw monotonic timestamp and a raw delta.
 * Clamping is the simulation's business, not the loop's. DOM-side module.
 */

export function createLoop(options) {
  const clock = options.clock;
  const onFrame = options.onFrame;
  const requestFrame =
    typeof options.requestFrame === 'function'
      ? options.requestFrame
      : (callback) => globalThis.requestAnimationFrame(callback);

  let running = false;
  let previousMs = 0;

  function tick() {
    if (!running) return;
    const nowMs = clock.now();
    const deltaMs = previousMs === 0 ? 0 : nowMs - previousMs;
    previousMs = nowMs;
    onFrame(nowMs, deltaMs);
    requestFrame(tick);
  }

  return Object.freeze({
    start() {
      if (running) return;
      running = true;
      previousMs = 0;
      requestFrame(tick);
    },
    stop() {
      running = false;
    }
  });
}
