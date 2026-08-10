/**
 * Source-level assertions that certain things are absent from the delivery by
 * construction rather than by inspection:
 *
 *  - no persistence path      (AC-22, AC-23)
 *  - no network path          (AC-24)
 *  - no identity surface      (AC-25)
 *  - no pointer input path    (AC-12)
 *  - no colour literal outside src/render/palette.js (ADR-004 §2)
 *  - no partial transparency behind text            (AC-16)
 *
 * Comments are stripped before scanning, so the modules may keep documenting what
 * they deliberately do not use.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

function listFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...listFiles(path));
    else found.push(path);
  }
  return found;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const files = listFiles(SRC).map((path) => ({
  path,
  name: relative(SRC, path).replace(/\\/g, '/'),
  code: stripComments(readFileSync(path, 'utf8'))
}));

test('the delivery ships the module layout ADR-002 §4 declares', () => {
  const names = files.map((file) => file.name).sort();
  for (const expected of [
    'index.html',
    'main.js',
    'styles/game.css',
    'engine/clock.js',
    'engine/loop.js',
    'game/state-machine.js',
    'game/run-state.js',
    'game/physics.js',
    'game/obstacles.js',
    'game/collision.js',
    'game/score.js',
    'trace/score-trace.js',
    'render/palette.js',
    'render/canvas-renderer.js',
    'render/hud.js',
    'input/keyboard.js'
  ]) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
});

test('AC-22/AC-23: no persistence API appears anywhere in src/', () => {
  const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'IndexedDB', 'document.cookie'];
  for (const file of files) {
    for (const token of forbidden) {
      assert.ok(!file.code.includes(token), `${file.name} references ${token}`);
    }
  }
});

test('AC-24: no network API appears anywhere in src/', () => {
  const forbidden = [
    'fetch(',
    'XMLHttpRequest',
    'sendBeacon',
    'WebSocket',
    'EventSource',
    'importScripts',
    'http://',
    'https://'
  ];
  for (const file of files) {
    for (const token of forbidden) {
      assert.ok(!file.code.includes(token), `${file.name} references ${token}`);
    }
  }
});

test('AC-12: no pointer, mouse or touch handler exists', () => {
  const forbidden = [
    'mousedown',
    'mouseup',
    'click',
    'pointerdown',
    'pointerup',
    'touchstart',
    'touchend',
    'onclick'
  ];
  for (const file of files) {
    for (const token of forbidden) {
      assert.ok(!file.code.includes(token), `${file.name} references ${token}`);
    }
  }
});

test('AC-25: no identity surface exists in the markup', () => {
  const html = files.find((file) => file.name === 'index.html').code;
  for (const token of ['<input', '<form', '<select', '<textarea', 'sign in', 'nickname', 'profile']) {
    assert.ok(!html.toLowerCase().includes(token), `index.html contains ${token}`);
  }
});

test('ADR-004: no colour literal exists outside src/render/palette.js', () => {
  const literal = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/;
  for (const file of files) {
    if (file.name === 'render/palette.js') continue;
    const match = file.code.match(literal);
    assert.equal(match, null, `${file.name} contains colour literal ${match && match[0]}`);
    assert.ok(!/\brgba?\(/.test(file.code), `${file.name} contains an rgb()/rgba() colour`);
    assert.ok(!/\bhsla?\(/.test(file.code), `${file.name} contains an hsl()/hsla() colour`);
  }
});

test('AC-16: nothing behind text is partially transparent', () => {
  const css = files.find((file) => file.name === 'styles/game.css').code;
  assert.ok(!css.includes('opacity'), 'stylesheet sets opacity');
  assert.ok(!css.includes('gradient'), 'stylesheet uses a gradient');
  assert.ok(css.includes('background-color: var(--dd-plate)'), 'plates are opaque palette colours');
});

test('AC-14: the play area is focusable and the canvas is not', () => {
  const html = files.find((file) => file.name === 'index.html').code;
  const css = files.find((file) => file.name === 'styles/game.css').code;
  assert.ok(html.includes('tabindex="0"'), 'a focus stop exists');
  assert.ok(html.includes('aria-hidden="true"'), 'the canvas is aria-hidden');
  assert.ok(!/canvas[^>]*tabindex/.test(html), 'the canvas is not focusable');
  assert.ok(css.includes('.dd-stage:focus'), 'a visible focus indicator is styled');
  assert.ok(css.includes('outline:'), 'the focus indicator is an outline');
});

test('AC-15: every key with an effect is named in on-screen text', () => {
  const html = files.find((file) => file.name === 'index.html').code;
  const keyboard = files.find((file) => file.name === 'input/keyboard.js').code;
  // the only key codes the delivery handles
  const handled = keyboard.match(/'(Space|ArrowUp)'/g) || [];
  assert.deepEqual([...new Set(handled)].sort(), ["'ArrowUp'", "'Space'"]);
  assert.ok(html.includes('Space'), 'Space is named on screen');
  assert.ok(html.includes('Up Arrow'), 'Up Arrow is named on screen');
  assert.ok(html.includes('Tab'), 'Tab is named on screen');
});

test('ADR-002 §4: the DOM-free core references no DOM type', () => {
  const domFree = files.filter(
    (file) =>
      file.name.startsWith('game/') ||
      file.name.startsWith('trace/') ||
      file.name === 'engine/clock.js' ||
      file.name === 'render/palette.js'
  );
  assert.ok(domFree.length >= 8);
  for (const file of domFree) {
    for (const token of ['window.', 'document.', 'HTMLElement', 'requestAnimationFrame', 'canvas']) {
      assert.ok(!file.code.includes(token), `${file.name} references ${token}`);
    }
    if (file.name === 'engine/clock.js') {
      // ADR-002 §4 sanctions exactly one indirection: the injected default time source.
      assert.ok(file.code.includes('globalThis.performance.now()'));
      assert.ok(!/(^|[^.])\bperformance\.now/.test(file.code.replace('globalThis.performance.now', '')));
    } else {
      assert.ok(!file.code.includes('performance'), `${file.name} references performance`);
    }
  }
});
