/**
 * WS-11 measurement harness — cold-load transfer weight and request count.
 *
 * THIS IS A MEASUREMENT TOOL, NOT A TEST. It asserts nothing and declares no budget.
 * It is deliberately NOT named `*.test.mjs` and must not be wired into the pass/fail
 * unit tier: there is no byte budget in DEVREQ-EVT-20260809-001 to assert against.
 *
 * It independently re-derives the cold-load closure that WS-08 reported
 * (42,517 B over 17 requests) rather than citing it, by (1) walking the static module
 * graph from `src/index.html` and summing bytes on disk, and (2) issuing one real HTTP
 * GET per resource against the delivery's own static server and summing what came back.
 *
 *   node tests/perf/artifact-weight.mjs [port]
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const SRC = resolve(fileURLToPath(new URL('../../src/', import.meta.url)));
const SERVER = resolve(fileURLToPath(new URL('../tools/static-server.mjs', import.meta.url)));
const PORT = Number(process.argv[2] || 4291);
const posix = (p) => relative(SRC, p).split('\\').join('/');

// ------------------------------------------------ 1. static closure from disk

/** Every `href=`/`src=` in the entry document, plus every `@import`/`url()` in CSS. */
function documentRefs(html) {
  const out = [];
  for (const m of html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)) out.push(m[1]);
  return out;
}
function cssRefs(css) {
  const out = [];
  for (const m of css.matchAll(/@import\s+(?:url\()?["']([^"']+)/g)) out.push(m[1]);
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)/g)) out.push(m[1]);
  return out;
}
/** Static ES module specifiers only — the graph the browser resolves before first paint. */
function moduleRefs(js) {
  const out = [];
  for (const m of js.matchAll(/(?:^|[\s;}])(?:import|export)[\s\S]{0,200}?from\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of js.matchAll(/(?:^|[\s;}])import\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of js.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

const entry = join(SRC, 'index.html');
const seen = new Map();
const external = [];
const queue = [entry];

while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  const text = readFileSync(file, 'utf8');
  const bytes = statSync(file).size;
  seen.set(file, bytes);

  const ext = extname(file);
  const refs = ext === '.html' ? documentRefs(text) : ext === '.css' ? cssRefs(text) : moduleRefs(text);
  for (const ref of refs) {
    if (/^(https?:|data:|blob:|\/\/|#|mailto:)/i.test(ref)) { external.push({ from: posix(file), ref }); continue; }
    const target = ref.startsWith('/') ? join(SRC, ref) : resolve(dirname(file), ref);
    try { if (statSync(target).isFile()) queue.push(target); } catch { /* not a fetchable file */ }
  }
}

const closure = [...seen.entries()]
  .map(([file, bytes]) => ({ path: posix(file), bytes }))
  .sort((a, b) => a.path.localeCompare(b.path));
const diskTotal = closure.reduce((n, r) => n + r.bytes, 0);

console.log('1. Cold-load closure walked from src/index.html (bytes on disk)');
console.log('-'.repeat(62));
for (const r of closure) console.log(String(r.bytes).padStart(8) + '  ' + r.path);
console.log('-'.repeat(62));
console.log(String(diskTotal).padStart(8) + '  TOTAL over ' + closure.length + ' resources');
console.log('cross-origin / absolute references found in the closure: ' + external.length +
  (external.length ? ' -> ' + JSON.stringify(external) : ''));

// Everything under src/ that the closure does NOT reach.
const all = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p); else all.push(p);
  }
})(SRC);
const unreached = all.filter((p) => !seen.has(p));
console.log('files under src/ NOT fetched on a cold load: ' + unreached.length +
  (unreached.length ? ' -> ' + unreached.map((p) => posix(p) + ' (' + statSync(p).size + ' B)').join(', ') : ''));
console.log('total bytes of src/ on disk: ' + all.reduce((n, p) => n + statSync(p).size, 0));

// --------------------------------------------- 2. real HTTP GETs over the wire

const child = spawn(process.execPath, [SERVER, String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((ok, fail) => {
  child.stdout.on('data', (d) => String(d).includes('serving') && ok());
  child.on('error', fail);
  setTimeout(() => fail(new Error('server did not start')), 10000);
});

console.log('\n2. One real HTTP GET per resource against tests/tools/static-server.mjs');
console.log('-'.repeat(74));
let wireTotal = 0, requests = 0, nonOk = 0;
const t0 = process.hrtime.bigint();
for (const r of closure) {
  const res = await fetch('http://127.0.0.1:' + PORT + '/' + r.path);
  const body = Buffer.from(await res.arrayBuffer());
  requests++;
  wireTotal += body.byteLength;
  if (res.status !== 200) nonOk++;
  console.log(String(res.status).padStart(5) + String(body.byteLength).padStart(9) + '  ' +
    (res.headers.get('content-type') || '').padEnd(30) + r.path);
}
const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
child.kill();

console.log('-'.repeat(74));
console.log('requests                 ' + requests);
console.log('bytes transferred        ' + wireTotal);
console.log('non-200 responses        ' + nonOk);
console.log('wall time, serial GETs   ' + elapsedMs.toFixed(1) + ' ms on loopback (NOT a page load time)');
console.log('disk total vs wire total ' + diskTotal + ' vs ' + wireTotal +
  (diskTotal === wireTotal ? '  (identical: no build step, no compression)' : '  (DIFFER)'));
console.log('\nEND. No budget was asserted. These are observations, not budgets.');
