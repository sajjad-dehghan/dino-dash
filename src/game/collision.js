/**
 * Axis-aligned overlap test (ADR-002).
 *
 * Contact with a cactus is the ONLY event that leaves `running` (AC-06, AC-07).
 * DOM-free by contract.
 */

/** Forgiveness inset, in pixels, applied to the character box on every side. */
export const COLLISION_INSET_PX = 6;

export function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** The character's collision box: its drawn box, inset on every side. */
export function characterHitBox(character, inset = COLLISION_INSET_PX) {
  return {
    x: character.x + inset,
    y: character.y + inset,
    width: Math.max(0, character.width - inset * 2),
    height: Math.max(0, character.height - inset * 2)
  };
}

/** True when the character is in contact with any cactus. */
export function characterHitsObstacle(character, obstacles, inset = COLLISION_INSET_PX) {
  const box = characterHitBox(character, inset);
  return obstacles.some((obstacle) => overlaps(box, obstacle));
}
