/**
 * Play-field renderer (ADR-002 §1).
 *
 * The canvas draws ONLY the play field — sky, ground, ground line, character, cacti.
 * It is `aria-hidden` and never focusable; every character of player-facing text lives
 * in the DOM layer (`render/hud.js`).
 *
 * Every colour comes from `render/palette.js`. There is no colour literal in this file
 * and no interpolation between variations: swaps are discrete, so no unenumerated
 * colour is ever drawn (ADR-004 §2).
 *
 * DOM-side module.
 */

import { LAYOUT } from '../game/run-state.js';

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fillRounded(ctx, x, y, width, height, radius) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function drawCharacter(ctx, character, variation, phase, grounded) {
  const { x, y, width: w, height: h } = character;

  ctx.fillStyle = variation.character;

  // tail
  ctx.beginPath();
  ctx.moveTo(x, y + 0.44 * h);
  ctx.lineTo(x + 0.3 * w, y + 0.31 * h);
  ctx.lineTo(x + 0.3 * w, y + 0.69 * h);
  ctx.closePath();
  ctx.fill();

  // body
  fillRounded(ctx, x + 0.17 * w, y + 0.27 * h, 0.57 * w, 0.54 * h, 0.17 * w);
  // neck and head
  fillRounded(ctx, x + 0.52 * w, y + 0.04 * h, 0.43 * w, 0.38 * h, 0.14 * w);
  // snout
  fillRounded(ctx, x + 0.74 * w, y + 0.23 * h, 0.26 * w, 0.17 * h, 0.06 * w);

  // legs — a two-frame run cycle while grounded, tucked while airborne
  const striding = grounded && Math.floor(phase) % 2 === 0;
  const legTop = y + 0.75 * h;
  const legWidth = 0.17 * w;
  const fullLeg = h - 0.75 * h;
  const shortLeg = fullLeg - 0.09 * h;
  fillRounded(ctx, x + 0.24 * w, legTop, legWidth, striding ? shortLeg : fullLeg, legWidth / 2);
  fillRounded(ctx, x + 0.5 * w, legTop, legWidth, striding ? fullLeg : shortLeg, legWidth / 2);

  // accents, drawn strictly inside the body so their background is the character
  ctx.fillStyle = variation.characterAccent;
  fillRounded(ctx, x + 0.24 * w, y + 0.5 * h, 0.36 * w, 0.17 * h, 0.08 * w);
  fillRounded(ctx, x + 0.75 * w, y + 0.12 * h, 0.11 * w, 0.1 * h, 0.03 * w);
}

function drawCactus(ctx, obstacle, variation) {
  const columnWidth = obstacle.width / obstacle.columns;
  for (let column = 0; column < obstacle.columns; column += 1) {
    const columnX = obstacle.x + column * columnWidth;
    const trunkWidth = Math.max(9, columnWidth * 0.44);
    const trunkX = columnX + (columnWidth - trunkWidth) / 2;
    const armThickness = Math.max(6, trunkWidth * 0.62);

    ctx.fillStyle = variation.cactus;
    fillRounded(ctx, trunkX, obstacle.y, trunkWidth, obstacle.height, trunkWidth / 2);

    // left arm
    const leftArmY = obstacle.y + obstacle.height * 0.42;
    fillRounded(ctx, columnX + 1, leftArmY, trunkX - columnX + 1, armThickness, armThickness / 2);
    fillRounded(
      ctx,
      columnX + 1,
      leftArmY - obstacle.height * 0.2,
      armThickness,
      obstacle.height * 0.24,
      armThickness / 2
    );

    // right arm
    const rightArmY = obstacle.y + obstacle.height * 0.55;
    const rightArmX = trunkX + trunkWidth - 1;
    const rightArmWidth = columnX + columnWidth - rightArmX - 1;
    if (rightArmWidth > 3) {
      fillRounded(ctx, rightArmX, rightArmY, rightArmWidth, armThickness, armThickness / 2);
      fillRounded(
        ctx,
        columnX + columnWidth - armThickness - 1,
        rightArmY - obstacle.height * 0.16,
        armThickness,
        obstacle.height * 0.2,
        armThickness / 2
      );
    }

    // accent stripe, drawn strictly inside the trunk
    ctx.fillStyle = variation.cactusAccent;
    const stripeWidth = Math.max(3, trunkWidth * 0.26);
    fillRounded(
      ctx,
      trunkX + (trunkWidth - stripeWidth) / 2,
      obstacle.y + obstacle.height * 0.16,
      stripeWidth,
      obstacle.height * 0.6,
      stripeWidth / 2
    );
  }
}

export function createCanvasRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1));
    canvas.width = Math.round(LAYOUT.width * ratio);
    canvas.height = Math.round(LAYOUT.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /**
   * @param {object} runState
   * @param {object} variation an entry of the background-variation enumeration
   */
  function draw(runState, variation) {
    ctx.clearRect(0, 0, LAYOUT.width, LAYOUT.height);

    // sky
    ctx.fillStyle = variation.sky;
    ctx.fillRect(0, 0, LAYOUT.width, LAYOUT.height);

    // sun, high in the corner and clear of the character's jump arc and of the cacti
    ctx.fillStyle = variation.groundLine;
    ctx.beginPath();
    ctx.arc(838, 54, 26, 0, Math.PI * 2);
    ctx.fill();

    // ground band
    ctx.fillStyle = variation.ground;
    ctx.fillRect(0, LAYOUT.groundY, LAYOUT.width, LAYOUT.height - LAYOUT.groundY);

    // ground line — the surface the character and cacti stand on
    ctx.fillStyle = variation.groundLine;
    ctx.fillRect(0, LAYOUT.groundY, LAYOUT.width, LAYOUT.groundLineHeight);

    // ground dashes, inside the band, carrying the sense of motion
    const dashSpacing = 96;
    const offset = -(runState.distancePx % dashSpacing);
    for (let x = offset - dashSpacing; x < LAYOUT.width + dashSpacing; x += dashSpacing) {
      ctx.fillRect(Math.round(x), LAYOUT.groundY + 26, 44, 6);
      ctx.fillRect(Math.round(x + 52), LAYOUT.groundY + 46, 22, 6);
    }

    for (const obstacle of runState.obstacles) {
      drawCactus(ctx, obstacle, variation);
    }

    drawCharacter(
      ctx,
      runState.character,
      variation,
      runState.distancePx / 22,
      runState.character.grounded
    );
  }

  resize();
  return Object.freeze({ resize, draw });
}
