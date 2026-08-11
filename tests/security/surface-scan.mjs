/**
 * WS-09 attack-surface scan (DEVREQ-EVT-20260809-001, GATE-SECURITY).
 *
 * A measurement harness, not a test. It asserts nothing and has no pass/fail
 * outcome, in the same spirit as `tests/perf/*` (WS-11 §11): inventing a
 * threshold here would manufacture a judgement nobody recorded. It prints a
 * table and writes `tests/.results/security-surface.json`.
 *
 *   node tests/security/surface-scan.mjs
 *
 * What it measures, over every file in `src/`:
 *   1. HTML-parsing and dynamic-code sinks   (XSS / code injection)
 *   2. Network egress tokens                 (AC-24)
 *   3. Persistence tokens                    (AC-22, AC-23)
 *   4. Identity / device / PII tokens        (AC-25)
 *   5. Remote subresources and inline handlers in the shipped markup
 *   6. What each surviving DOM write site can actually carry
 *   7. Object-keyed lookups reached through the prototype chain
 *
 * The comment stripper is byte-identical to `tests/unit/source-hygiene.test.mjs`,
 * so raw and stripped counts can be compared against that suite directly.
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatScore, scoreForElapsedMs } from '../../src/game/score.js';
import { BACKGROUND_VARIATIONS, getBackgroundVariations, variationById } from '../../src/render/palette.js';
import { STATES, STATE_VALUES, TRANSITIONS, EVENTS, createStateMachine } from '../../src/game/state-machine.js';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const RESULTS = fileURLToPath(new URL('../.results/', import.meta.url));

function listFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...listFiles(path));
    else found.push(path);
  }
  return found;
}

/** Byte-identical to tests/unit/source-hygiene.test.mjs:34-39. */
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
    ext: extname(path),
    raw,
    code: stripComments(raw)
  };
});

function occurrences(haystack, needle) {
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n += 1;
    i += needle.length;
  }
  return n;
}

function scan(title, tokens) {
  const rows = [];
  let totalRaw = 0;
  let totalCode = 0;
  for (const token of tokens) {
    let raw = 0;
    let code = 0;
    const sites = [];
    for (const file of files) {
      const r = occurrences(file.raw, token);
      const c = occurrences(file.code, token);
      raw += r;
      code += c;
      if (c > 0) sites.push(`${file.name}x${c}`);
    }
    totalRaw += raw;
    totalCode += code;
    rows.push({ token, raw, afterCommentStrip: code, sites });
  }
  return { title, tokenCount: tokens.length, filesScanned: files.length, totalRaw, totalAfterCommentStrip: totalCode, rows };
}

function printScan(result) {
  console.log(`\n--- ${result.title}: ${result.tokenCount} tokens, ${result.filesScanned} files ---`);
  for (const row of result.rows) {
    console.log(
      `  ${row.token.padEnd(28)} raw=${String(row.raw).padStart(2)}  after-comment-strip=${String(row.afterCommentStrip).padStart(2)}` +
        (row.sites.length ? `   [${row.sites.join(', ')}]` : '')
    );
  }
  console.log(`  ${'TOTAL'.padEnd(28)} raw=${String(result.totalRaw).padStart(2)}  after-comment-strip=${String(result.totalAfterCommentStrip).padStart(2)}`);
}

// --- 1. HTML-parsing and dynamic-code sinks -----------------------------------
const injectionScan = scan('injection sinks (HTML parsing and dynamic code)', [
  'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'document.writeln',
  'createContextualFragment', 'DOMParser', 'parseFromString', 'srcdoc', 'javascript:',
  'data:text/html', 'eval(', 'new Function', 'Function(', 'setTimeout', 'setInterval',
  'setImmediate', 'import(', 'importScripts', 'execScript', 'dangerouslySetInnerHTML',
  'v-html', 'createElement(\'script\'', 'createElement("script"', 'setAttribute',
  'setAttributeNS', 'outerText', 'insertAdjacentElement', 'appendChild', 'insertBefore',
  'replaceChildren', 'createTextNode', 'location.href', 'location.assign',
  'location.replace', 'location.search', 'location.hash', 'window.open', 'postMessage',
  'onmessage', 'document.domain', 'atob', 'unescape', 'decodeURIComponent',
  'URLSearchParams', 'document.referrer', 'Object.assign(window', '__proto__',
  'Object.setPrototypeOf', 'structuredClone', 'JSON.parse'
]);

// --- 2. network egress (AC-24; WS-04 §3.2 scanned 15 tokens, this widens it) ---
const networkScan = scan('network egress tokens (AC-24)', [
  'fetch', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'RTCPeerConnection',
  'navigator.sendBeacon', 'importScripts', 'Worker(', 'SharedWorker', 'serviceWorker',
  'register(', 'http://', 'https://', 'ws://', 'wss://', '//cdn', 'unpkg', 'jsdelivr',
  'cdnjs', 'googleapis', 'gstatic', 'src="//', 'preconnect', 'dns-prefetch', 'prefetch',
  'preload', 'crossorigin', 'integrity=', 'PerformanceObserver', 'reportURI', 'report-uri',
  'navigator.connection', 'requestIdleCallback'
]);

// --- 3. persistence (AC-22, AC-23; WS-06 §3.2 scanned 35 tokens) ---------------
const storageScan = scan('persistence tokens (AC-22, AC-23)', [
  'localStorage', 'sessionStorage', 'indexedDB', 'IndexedDB', 'document.cookie', 'cookie',
  'caches', 'navigator.storage', 'showSaveFilePicker', 'createWritable', 'openDatabase',
  'window.name', 'history.pushState', 'history.replaceState', 'BroadcastChannel'
]);

// --- 4. identity / device / PII (AC-25) ----------------------------------------
const identityScan = scan('identity, device and PII tokens (AC-25)', [
  'navigator.', 'userAgent', 'userAgentData', 'platform', 'language', 'languages',
  'geolocation', 'getCurrentPosition', 'screen.', 'devicePixelRatio', 'timeZone',
  'getTimezoneOffset', 'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints',
  'crypto.randomUUID', 'randomUUID', 'getUserMedia', 'mediaDevices', 'credentials',
  'PublicKeyCredential', 'FederatedCredential', 'Notification', 'permissions',
  'battery', 'getBattery', 'Intl.', 'canvas.toDataURL', 'toDataURL', 'getImageData',
  'AudioContext', 'nickname', 'username', 'playerId', 'deviceId', 'sessionId', 'uuid',
  'fingerprint', 'email', 'sign in', 'signin', 'login', 'account', 'profile'
]);

for (const result of [injectionScan, networkScan, storageScan, identityScan]) printScan(result);

// --- 5. shipped markup: remote subresources and inline execution ---------------
const html = files.find((file) => file.name === 'index.html');
const markup = {
  scriptTags: [...html.code.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]),
  linkTags: [...html.code.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]),
  inlineEventHandlers: [...html.code.matchAll(/\son[a-z]+\s*=/gi)].map((m) => m[0].trim()),
  remoteUrls: [...html.raw.matchAll(/(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+/gi)].map((m) => m[0]),
  cspMeta: [...html.code.matchAll(/<meta[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/gi)].map((m) => m[0]),
  integrityAttrs: [...html.code.matchAll(/\bintegrity\s*=/gi)].map((m) => m[0]),
  formControls: [...html.code.matchAll(/<(?:form|input|select|textarea|button)\b/gi)].map((m) => m[0])
};
const cssRaw = files.find((file) => file.name === 'styles/game.css').raw;
markup.cssRemoteRefs = [...cssRaw.matchAll(/url\(\s*["']?(?!data:)[^)]*\)|@import/gi)].map((m) => m[0]);

console.log('\n--- shipped markup: src/index.html and src/styles/game.css ---');
console.log(`  <script> tags                    : ${markup.scriptTags.length}  ${JSON.stringify(markup.scriptTags)}`);
console.log(`  <link> tags                      : ${markup.linkTags.length}  ${JSON.stringify(markup.linkTags)}`);
console.log(`  inline on* event handlers        : ${markup.inlineEventHandlers.length}`);
console.log(`  remote (//, http, https) src/href: ${markup.remoteUrls.length}`);
console.log(`  subresource integrity attributes : ${markup.integrityAttrs.length}`);
console.log(`  Content-Security-Policy <meta>   : ${markup.cspMeta.length}`);
console.log(`  form controls (AC-25)            : ${markup.formControls.length}`);
console.log(`  CSS url()/@import (non-data:)     : ${markup.cssRemoteRefs.length}`);

// --- 6. what the surviving DOM write sites can carry ---------------------------
const HOSTILE = [
  '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', 'javascript:alert(1)',
  '</span><svg onload=alert(1)>', '&#60;script&#62;', '${alert(1)}',
  'red; background:url(javascript:alert(1))', Infinity, -Infinity, NaN, -1, 0.5,
  Number.MAX_SAFE_INTEGER, 1e308, null, undefined, {}, [], () => {},
  { toString: () => '<script>alert(1)</script>' },
  { valueOf: () => '<img onerror=alert(1)>' }
];
const DIGITS_ONLY = /^[0-9]+$/;

const hostileOut = HOSTILE.map((value) => {
  let out;
  try {
    out = formatScore(value);
  } catch (error) {
    out = `THREW ${error.constructor.name}`;
  }
  return { input: String(typeof value === 'object' && value !== null ? JSON.stringify(value) ?? '[object]' : String(value)).slice(0, 40), output: out, digitsOnly: typeof out === 'string' && DIGITS_ONLY.test(out) };
});

const sweep = { values: 0, notDigitsOnly: 0, characters: new Set(), minLength: Infinity, maxLength: 0 };
for (let ms = 0; ms <= 3_600_000; ms += 37) {
  const rendered = formatScore(scoreForElapsedMs(ms));
  sweep.values += 1;
  if (!DIGITS_ONLY.test(rendered)) sweep.notDigitsOnly += 1;
  sweep.minLength = Math.min(sweep.minLength, rendered.length);
  sweep.maxLength = Math.max(sweep.maxLength, rendered.length);
  for (const character of rendered) sweep.characters.add(character);
}

const CSS_PROPS = ['sky', 'ground', 'groundLine', 'plate', 'textOn', 'shell', 'shellText', 'focus'];
const HEX = /^#[0-9A-Fa-f]{6}$/;
const cssOffContract = [];
for (const variation of BACKGROUND_VARIATIONS) {
  for (const property of CSS_PROPS) {
    if (!HEX.test(variation[property])) cssOffContract.push(`${variation.id}.${property}`);
  }
}

console.log('\n--- DOM write sites: what each can actually carry ---');
console.log('  sink 1,2  hud.js:49,54   elements.*.textContent = formatScore(...)');
for (const row of hostileOut) {
  console.log(`      formatScore(${row.input.padEnd(42)}) = ${JSON.stringify(row.output)}${row.digitsOnly ? '' : '   <-- NOT /^[0-9]+$/'}`);
}
console.log(`      hostile inputs                 : ${hostileOut.length}, outputs not /^[0-9]+$/: ${hostileOut.filter((r) => !r.digitsOnly).length}`);
console.log(`      production sweep 0..3600000 ms : ${sweep.values} values, not /^[0-9]+$/: ${sweep.notDigitsOnly}`);
console.log(`      characters ever produced       : ${[...sweep.characters].sort().join('')} (length ${sweep.minLength}..${sweep.maxLength})`);
console.log('  sink 3    hud.js:38      root.dataset.backgroundVariation = variation.id');
console.log(`      closed enumeration             : ${JSON.stringify(getBackgroundVariations().map((v) => v.id))}, frozen=${Object.isFrozen(BACKGROUND_VARIATIONS)}`);
console.log(`      variationById(hostile string)  : ${JSON.stringify(variationById('<img onerror=alert(1)>').id)}`);
console.log('  sink 4    hud.js:30-37   style.setProperty("--dd-*", <palette value>)');
console.log(`      values written                 : ${CSS_PROPS.length * BACKGROUND_VARIATIONS.length}, off /^#[0-9A-Fa-f]{6}$/: ${cssOffContract.length}`);
console.log('  sink 5    main.js:39     root.dataset.gameState = to');
console.log(`      STATE_VALUES                   : ${JSON.stringify(STATE_VALUES)}`);

// --- 7. object-keyed lookups reached through the prototype chain ---------------
const INHERITED = ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', '__defineGetter__', '__lookupGetter__'];
const protoAccepted = [];
for (const event of INHERITED) {
  const machine = createStateMachine();
  if (machine.transition(event)) {
    const reached = machine.getState();
    protoAccepted.push({ event, reachedType: typeof reached, offEnumeration: !STATE_VALUES.includes(reached) });
  }
}
const declaredRejected = EVENTS.filter((event) => {
  const machine = createStateMachine();
  return !machine.transition(event) && TRANSITIONS[STATES.IDLE][event] !== undefined;
});

console.log('\n--- prototype-chain lookups ---');
console.log(`  TRANSITIONS.idle own keys           : ${JSON.stringify(Object.keys(TRANSITIONS[STATES.IDLE]))}`);
console.log(`  prototype is Object.prototype       : ${Object.getPrototypeOf(TRANSITIONS[STATES.IDLE]) === Object.prototype}`);
console.log(`  inherited names probed              : ${INHERITED.length}`);
console.log(`  accepted as events by transition()  : ${protoAccepted.length}  ${JSON.stringify(protoAccepted.map((p) => p.event))}`);
console.log(`  of those, driving state off STATE_VALUES: ${protoAccepted.filter((p) => p.offEnumeration).length}`);
console.log(`  declared events wrongly rejected    : ${declaredRejected.length}`);
console.log(`  variationById() same probe          : ${JSON.stringify([...new Set(INHERITED.map((id) => variationById(id).id))])}  (find-based, no prototype path)`);

// --- machine-readable output ---------------------------------------------------
const report = {
  producedBy: 'tests/security/surface-scan.mjs',
  workstream: 'WS-09',
  request: 'DEVREQ-EVT-20260809-001',
  capturedAt: new Date().toISOString(),
  node: process.version,
  filesScanned: files.map((file) => file.name).sort(),
  scans: {
    injection: injectionScan,
    network: networkScan,
    storage: storageScan,
    identity: identityScan
  },
  markup: {
    scriptTags: markup.scriptTags,
    linkTags: markup.linkTags,
    inlineEventHandlers: markup.inlineEventHandlers.length,
    remoteUrls: markup.remoteUrls.length,
    integrityAttributes: markup.integrityAttrs.length,
    contentSecurityPolicyMeta: markup.cspMeta.length,
    formControls: markup.formControls.length,
    cssRemoteReferences: markup.cssRemoteRefs.length
  },
  domSinks: {
    hostile: hostileOut,
    productionSweep: {
      values: sweep.values,
      notDigitsOnly: sweep.notDigitsOnly,
      characters: [...sweep.characters].sort().join(''),
      minLength: sweep.minLength,
      maxLength: sweep.maxLength
    },
    backgroundVariationIds: getBackgroundVariations().map((v) => v.id),
    cssValuesOffContract: cssOffContract,
    stateValues: STATE_VALUES
  },
  prototypeChain: {
    inheritedNamesProbed: INHERITED,
    acceptedAsEvents: protoAccepted,
    declaredEventsWronglyRejected: declaredRejected
  }
};

mkdirSync(RESULTS, { recursive: true });
writeFileSync(join(RESULTS, 'security-surface.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`\nwrote tests/.results/security-surface.json (${JSON.stringify(report).length} bytes of JSON)`);
