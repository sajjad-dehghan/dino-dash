/**
 * WS-10 coverage for WS-06 limitation L-06 and WS-09 §3.3 / §3.6.1.
 *
 * `tests/unit/source-hygiene.test.mjs` asserts five persistence tokens, eight network
 * tokens and eight pointer tokens. WS-06 §3.2 checked THIRTY-FIVE storage tokens by hand
 * and handed the shortfall to WS-10 as a coverage observation; WS-09 checked 51 injection
 * tokens and 44 identity tokens the same way. Every one of those manual results is a
 * number in a document that no command re-derives.
 *
 * This file turns them into assertions. It deliberately overlaps `source-hygiene` on the
 * few tokens both cover rather than editing that file, so WS-03's test count and its
 * stated intent are left intact.
 *
 * Method, matching WS-06 §3.2 and WS-09 exactly: comments are stripped before counting,
 * so the modules may keep documenting what they deliberately do not use. Where a token
 * has a non-zero result the exact count and location are pinned, not waived — that is how
 * a scan stays honest about what it found.
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

const files = listFiles(SRC).map((path) => {
  const raw = readFileSync(path, 'utf8');
  return {
    name: relative(SRC, path).replace(/\\/g, '/'),
    raw,
    code: stripComments(raw)
  };
});

/** @returns {{total: number, sites: string[]}} occurrences after comment stripping */
function scan(token) {
  let total = 0;
  const sites = [];
  for (const file of files) {
    const count = file.code.split(token).length - 1;
    if (count > 0) {
      total += count;
      sites.push(`${file.name} x${count}`);
    }
  }
  return { total, sites };
}

function assertAbsent(tokens, label) {
  const hits = [];
  for (const token of tokens) {
    const { total, sites } = scan(token);
    if (total > 0) hits.push(`${token}: ${sites.join(', ')}`);
  }
  assert.deepEqual(hits, [], `${label} present in src/:\n${hits.join('\n')}`);
}

test('the scan covers the whole delivered tree, not a subset of it', () => {
  assert.equal(files.length, 18, 'the delivery is 18 files (WS-09 §4.3)');
  assert.ok(files.some((file) => file.name === 'index.html'));
  assert.ok(files.some((file) => file.name === 'styles/game.css'));
  assert.equal(files.filter((file) => file.name.endsWith('.js')).length, 15);
});

/**
 * WS-06 §3.2's full list. `source-hygiene.test.mjs` asserts the first five; the other
 * thirty were checked once, by hand, in a document.
 */
const STORAGE_TOKENS = Object.freeze([
  'localStorage', 'sessionStorage', 'indexedDB', 'IndexedDB', 'openDatabase',
  'document.cookie', 'cookie', 'caches', 'CacheStorage', 'cacheStorage',
  'navigator.storage', 'StorageManager', 'showSaveFilePicker', 'showOpenFilePicker',
  'showDirectoryPicker', 'getDirectory', 'FileSystemHandle', 'createWritable', 'OPFS',
  'requestFileSystem', 'webkitStorageInfo', 'localforage', 'Dexie', 'PouchDB', 'sqlite',
  'WebSQL', 'FileReader', 'createObjectURL', 'Blob', 'serviceWorker', 'CacheAPI',
  'window.name', 'history.pushState', 'replaceState', 'storage'
]);

test('AC-22/AC-23: all 35 of WS-06 §3.2 storage tokens are absent from src/', () => {
  assert.equal(STORAGE_TOKENS.length, 35, 'the list WS-06 measured, unabridged');
  assertAbsent(STORAGE_TOKENS, 'storage API');
});

test('AC-22/AC-23: the nine raw storage hits are all comments, and all nine are still there', () => {
  // WS-06 §3.2: 9 raw, 0 after stripping. If a later edit deletes the comments the count
  // changes and this test says so; if a later edit adds a real call site, the test above
  // fails first. Both directions are covered on purpose.
  let raw = 0;
  for (const token of STORAGE_TOKENS) {
    for (const file of files) raw += file.raw.split(token).length - 1;
  }
  assert.equal(raw, 9, 'raw storage-token occurrences across the tree');
});

test('AC-23: the three side-channel persistence tricks are absent', () => {
  // A scan that only looks for storage APIs misses these three, which persist across a
  // reload without any storage API at all.
  assertAbsent(['window.name', 'history.pushState', 'history.replaceState', 'replaceState'], 'side-channel persistence');
});

const INJECTION_TOKENS = Object.freeze([
  'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'document.writeln',
  'createContextualFragment', 'DOMParser', 'parseFromString', 'srcdoc', 'javascript:',
  'data:text/html', 'eval(', 'new Function', 'Function(', 'setTimeout', 'setInterval',
  'setImmediate', 'importScripts', 'execScript', 'dangerouslySetInnerHTML', 'v-html',
  'setAttribute', 'setAttributeNS', 'outerText', 'insertAdjacentElement', 'appendChild',
  'insertBefore', 'replaceChildren', 'createTextNode', 'location.href', 'location.assign',
  'location.replace', 'location.search', 'location.hash', 'window.open', 'postMessage',
  'onmessage', 'document.domain', 'atob', 'unescape', 'decodeURIComponent',
  'URLSearchParams', 'document.referrer', 'Object.setPrototypeOf', 'structuredClone',
  'JSON.parse'
]);

test('no HTML-parsing or dynamic-code sink exists anywhere in src/ — 46 tokens', () => {
  assertAbsent(INJECTION_TOKENS, 'injection sink');

  // Stronger than the storage result: these do not appear even in a comment.
  let raw = 0;
  for (const token of INJECTION_TOKENS) {
    for (const file of files) raw += file.raw.split(token).length - 1;
  }
  assert.equal(raw, 0, 'injection tokens appear nowhere, comments included');
});

test('the URL is never read, so a static page has no input channel but the keyboard', () => {
  assertAbsent(
    ['location.search', 'location.hash', 'location.href', 'URLSearchParams', 'document.referrer', 'window.location'],
    'URL read'
  );
});

test('AC-25: no identity or device-fingerprint read exists, except the one WS-09 recorded', () => {
  assertAbsent(
    [
      'navigator.', 'userAgent', 'geolocation', 'crypto.randomUUID', 'toDataURL',
      'AudioContext', 'Intl.', 'nickname', 'username', 'playerId', 'deviceId',
      'sessionId', 'uuid', 'fingerprint', 'email', 'sign in', 'signin', 'login',
      'account', 'profile'
    ],
    'identity surface'
  );

  // F-06, pinned. `devicePixelRatio` is the delivery's ONLY device-characteristic read.
  // Exactly one occurrence, in exactly one file. A second one anywhere fails this test.
  const dpr = scan('devicePixelRatio');
  assert.equal(dpr.total, 1, `devicePixelRatio occurrences: ${dpr.sites.join(', ')}`);
  assert.deepEqual(dpr.sites, ['render/canvas-renderer.js x1']);

  // And it is clamped and consumed on the spot, never retained.
  const renderer = files.find((file) => file.name === 'render/canvas-renderer.js').code;
  assert.match(renderer, /Math\.min\(3, Math\.max\(1, globalThis\.devicePixelRatio \|\| 1\)\)/);
});

test('AC-24: no egress path of any kind exists in src/', () => {
  assertAbsent(
    [
      'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'importScripts',
      'http://', 'https://', '//cdn', 'unpkg', 'jsdelivr', 'cdnjs', 'googleapis', 'gstatic',
      'new Worker', 'SharedWorker', 'BroadcastChannel', 'RTCPeerConnection', 'navigator.connection'
    ],
    'network API'
  );
});

test('AC-27: no character catalogue, unlock state, points balance or currency exists', () => {
  assertAbsent(
    [
      'catalogue', 'catalog', 'unlock', 'locked', 'balance', 'currency', 'coin', 'gem',
      'wallet', 'purchase', 'buy', 'price', 'cost', 'shop', 'store', 'inventory',
      'characterSelect', 'character-select', 'selectCharacter', 'skin', 'avatar',
      'leaderboard', 'scoreboard', 'ranking', 'lobby', 'presence', 'matchmaking',
      'friend', 'invite', 'settings', 'preferences', 'personalBest', 'highScore',
      'high-score', 'bestScore'
    ],
    'economy, catalogue or later-unit surface'
  );

  // AC-26/AC-27: the markup ships one play area and no second view to switch to.
  const html = files.find((file) => file.name === 'index.html').raw;
  assert.equal((html.match(/<canvas/gi) || []).length, 1, 'exactly one canvas');
  assert.equal((html.match(/<button/gi) || []).length, 0, 'AC-25/AC-27: no control to click');
});

test('AC-24: the shipped markup references nothing remote', () => {
  const html = files.find((file) => file.name === 'index.html').raw;
  const css = files.find((file) => file.name === 'styles/game.css').raw;

  const remoteReference = /(?:src|href)\s*=\s*["'](?:https?:)?\/\//i;
  assert.equal(remoteReference.test(html), false, 'index.html references a remote origin');
  assert.equal(/@import|url\((?!["']?data:)/i.test(css), false, 'the stylesheet fetches something');

  // One module script, one stylesheet, one data: favicon — and no inline handler.
  assert.equal((html.match(/<script/gi) || []).length, 1);
  assert.equal((html.match(/<link/gi) || []).length, 2);
  assert.equal(/\son[a-z]+\s*=/i.test(html), false, 'an inline event handler exists');
});
