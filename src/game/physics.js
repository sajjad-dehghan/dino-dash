/**
 * Gravity, the jump impulse and the grounded test (ADR-002).
 * DOM-free by contract.
 */

import { LAYOUT, PHYSICS } from './run-state.js';

/**
 * Apply one jump impulse. Returns true only when a jump actually started, which is
 * exactly once per grounded press (AC-03, AC-04). Airborne presses do nothing.
 */
export function jump(character) {
  if (!character.grounded) return false;
  character.velocityY = PHYSICS.jumpVelocityPxPerSecond;
  character.grounded = false;
  return true;
}

/** Integrate the character for one clamped time step. */
export function stepCharacter(character, stepSeconds) {
  const restingY = LAYOUT.groundY - character.height;
  if (!character.grounded) {
    character.velocityY += PHYSICS.gravityPxPerSecondSquared * stepSeconds;
    character.y += character.velocityY * stepSeconds;
    if (character.y >= restingY) {
      character.y = restingY;
      character.velocityY = 0;
      character.grounded = true;
    }
  } else {
    character.y = restingY;
    character.velocityY = 0;
  }
  return character;
}

/** Clamp a raw frame delta to the maximum simulation step (ADR-002 §5). */
export function clampStepSeconds(deltaMs) {
  const seconds = deltaMs / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.min(seconds, PHYSICS.maxStepSeconds);
}
