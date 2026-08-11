/**
 * WS-10 — the AC-by-AC coverage matrix, as a command rather than a paragraph.
 *
 *   node tests/tools/ac-coverage.mjs        -> stdout table + tests/.results/ac-coverage.json (+ .sha256)
 *
 * This is a MEASUREMENT HARNESS, not a test. It matches no glob in the `npm test` script
 * (`tests/unit/*.test.mjs`), in the same convention WS-11 used for `tests/perf/*` and
 * WS-09 for `tests/security/*`, so it cannot affect the unit tier's pass count.
 *
 * Two halves, deliberately separated so a reader can tell which is measured and which is
 * judged:
 *
 *   MEASURED  — which test titles in `tests/unit/*.test.mjs` name which AC. Derived by
 *               scanning the delivered test files. Nobody hand-maintains this list.
 *   DECLARED  — ENG-10's disposition per AC: `machine`, `partial` or `none`. This is a
 *               judgement about whether the assertions that exist actually reach the
 *               substance of the criterion, and it is written down here so it is
 *               reviewable rather than buried in prose.
 *
 * The harness then CHECKS the two against each other and exits non-zero on a
 * contradiction: an AC declared `machine` or `partial` with no test and no artifact behind
 * it, or an AC declared `none` that a test title nonetheless claims. That check is the
 * reason this is worth running at all — it makes an inflated matrix fail loudly.
 *
 * Exit code 0 = the declared matrix is consistent with what is actually in the tree.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const UNIT_DIR = join(ROOT, 'tests', 'unit');
const RESULTS_DIR = join(ROOT, 'tests', '.results');

// ---------------------------------------------------------------------------
// MEASURED: scan the unit tier
// ---------------------------------------------------------------------------

const unitFiles = readdirSync(UNIT_DIR).filter((name) => name.endsWith('.test.mjs')).sort();

/** @type {Map<string, {file: string, title: string}[]>} */
const byCriterion = new Map();
let totalTitles = 0;

for (const name of unitFiles) {
  const source = readFileSync(join(UNIT_DIR, name), 'utf8');
  for (const match of source.matchAll(/^test\(\s*(['"`])([\s\S]*?)\1\s*,/gm)) {
    const title = match[2];
    totalTitles += 1;
    for (const reference of new Set(title.match(/AC-\d{2}/g) || [])) {
      if (!byCriterion.has(reference)) byCriterion.set(reference, []);
      byCriterion.get(reference).push({ file: `tests/unit/${name}`, title });
    }
  }
}

// ---------------------------------------------------------------------------
// DECLARED: ENG-10's disposition, with the reason the disposition is not higher
// ---------------------------------------------------------------------------

/**
 * `evidence`  — machine evidence reaching the substance of the criterion.
 * `partial`   — a real machine check covers part of it; the named remainder does not exist.
 * `none`      — no machine evidence in this delivery. Saying so is the correct result.
 *
 * `artifacts` names non-test evidence: a command that produces a file, or another
 * workstream's recorded measurement.
 */
const DECLARED = [
  ['AC-01', 'none', [], [], 'The criterion is entirely a browser observation — opens, reaches idle, renders, zero console errors. No command in this delivery starts a browser. The nearest machine evidence (absent-surface: zero remote references; WS-08 §3: 17 requests, 0 cross-origin) belongs to AC-24 and is not offered as AC-01 evidence.'],
  ['AC-02', 'partial', ['keyboard-journey: both keys start a run from idle', 'keyboard-journey: the idle instruction element names Space and Up Arrow and the word start'], [], 'The instruction is asserted to exist in the markup with the right key names; that it is rendered and legible is a browser observation.'],
  ['AC-03', 'evidence', ['physics-and-score: one grounded press is one jump', 'keyboard-journey: holding produces exactly one jump'], [], ''],
  ['AC-04', 'evidence', ['keyboard-journey: alternating Space and Up Arrow jumps four times'], [], ''],
  ['AC-05', 'partial', ['keyboard-journey: defaultPrevented true for both keys and repeats, false for every other key'], [], 'preventDefault is asserted on a real EventTarget; that the document scroll position does not move needs a browser with a scrollable viewport.'],
  ['AC-06', 'evidence', ['run-loop: contact ends the run and the score stops', 'keyboard-journey: the final score is frozen for 300 frames'], [], ''],
  ['AC-07', 'evidence', ['collision-and-obstacles: clearing a cactus does not end the run', 'run-loop: jumping clears cacti and the run continues'], [], ''],
  ['AC-08', 'evidence', ['physics-and-score: starts at zero, integer, never decreases', 'run-loop: non-decreasing across a run', 'frame-gap-accrual: non-decreasing across a gap of any length'], [], ''],
  ['AC-09', 'evidence', ['run-loop: the trace record matches the final displayed score', 'keyboard-journey: run-end score equals the last in-run score'], [], ''],
  ['AC-10', 'partial', ['keyboard-journey: five consecutive keyboard restarts, each starting at zero'], [], 'That no page load occurred (navigation entries, network panel) cannot be observed without a browser.'],
  ['AC-11', 'partial', ['keyboard-journey: restart is operable from a key event alone', 'keyboard-journey: the #dd-restart-instruction element names Space and Up Arrow'], [], 'Legibility of the rendered instruction is a browser observation.'],
  ['AC-12', 'partial', ['keyboard-journey: the six-step journey completes from key events alone', 'keyboard-journey: exactly one listener type is registered, and it is keydown'], ['source-hygiene: no pointer, mouse or touch token in src/'], 'The journey is driven over re-created wiring, not over main.js in a page. Focus, rendering and a physically disconnected pointer are unobserved.'],
  ['AC-13', 'evidence', ['run-state: a played-out run shares nothing with the next', 'keyboard-journey: score zero, obstacles cleared, character reset on every restart'], [], ''],
  ['AC-14', 'partial', [], ['source-hygiene: tabindex="0" exists, the canvas is aria-hidden and not focusable, .dd-stage:focus styles an outline'], 'A rendered focus indicator, the Tab cycle and the absence of a focus trap are browser observations. No headless check reaches them.'],
  ['AC-15', 'partial', ['keyboard-journey: no key but the two documented ones has any effect, in any state'], ['source-hygiene: the only handled key codes are Space and ArrowUp, and both are named on screen'], 'Both halves are machine-checked over the source; that the naming text is visibly rendered is not.'],
  ['AC-16', 'partial', ['palette: every declared text pair clears 4.5:1'], ['npm run evidence:a11y -> tests/.results/a11y-contrast.json + .sha256'], 'Declared-palette, not rendered-pixel. WS-12 R-01. Closing it needs the browser tier, which did not install (WS-10 §5).'],
  ['AC-17', 'partial', ['palette: every declared non-text pair clears 3:1'], ['npm run evidence:a11y -> tests/.results/a11y-contrast.json + .sha256'], 'Declared-palette, not rendered-pixel. WS-12 R-01.'],
  ['AC-18', 'partial', ['palette: character, cactus and ground carry three distinct saturated hues'], [], 'The objective half is checked against the declared palette, not against sampled rendered pixels. The judgement half is the owner\'s under final_user_visible_acceptance and is not a runnable condition.'],
  ['AC-19', 'evidence', ['score-trace: exactly three fields, correctly typed', 'score-trace: endedAt is a real UTC instant', 'trace-contract: ADR-003\'s published assertion block passes against a real record'], [], ''],
  ['AC-20', 'partial', ['run-loop: record score equals the final displayed score and sessionLengthMs equals elapsed'], [], 'The record-level equality is machine-checked. The 250 ms tolerance against an INDEPENDENT stopwatch is a manual procedure; an injected clock cannot be its own witness.'],
  ['AC-21', 'evidence', ['score-trace: sessionLengthMs comes from the injected monotonic source', 'score-trace: a mid-run wall-clock jump does not corrupt sessionLengthMs'], [], 'Recorded as evidence with ADR-003 §2\'s disclosure: the injected clock is the declared SUBSTITUTE for changing the OS clock (WS-01 B-05), and is reported as a substitute.'],
  ['AC-22', 'partial', ['score-trace: records accumulate across restarts, oldest first', 'absent-surface: all 35 storage tokens absent', 'keyboard-journey: one record per completed run across five runs'], [], 'Accumulation and the absence of any persistence path are machine-checked. "Discarded when the page unloads" and an empty storage inspector are browser observations.'],
  ['AC-23', 'partial', ['absent-surface: 35 storage tokens and the three side-channel tricks are absent'], [], 'A reload comparison against a fresh browser profile has no headless equivalent.'],
  ['AC-24', 'partial', ['absent-surface: no egress path in src/, markup references nothing remote'], ['WS-08 §3: 17 same-origin requests, 0 cross-origin, 0 after load'], 'Playing with the network disabled is a browser observation.'],
  ['AC-25', 'evidence', ['score-trace: no identifying field is present or accepted', 'absent-surface: no identity read except the recorded devicePixelRatio', 'trace-contract: no field beyond the three is accepted whatever the caller passes'], [], 'The criterion is an absence, and an absence over a static, form-control-free delivery is fully checkable from source.'],
  ['AC-26', 'partial', ['keyboard-journey: the keyboard-reachable state set is exactly three', 'state-machine: no event sequence reaches a fourth state'], [], 'Holds for every keyboard input. It does NOT hold for arbitrary strings: state-machine-prototype characterises WS-09 F-01, under which inherited property names drive the state off STATE_VALUES. Unreachable at this revision and guarded by the containment test.'],
  ['AC-27', 'partial', ['absent-surface: no catalogue, unlock, balance, currency or second view'], [], 'Absence is machine-checked over source and markup. "The character rendered is identical across five runs" is a rendered-pixel comparison.'],
  ['AC-28', 'partial', [], ['git diff --name-only against the WS-09 revision; git rev-parse HEAD:src against the WS-03 seal'], 'Evidenced by command in WS-10 §7, not by a test. The product-workspace half is asserted by not writing there and cannot be self-certified.'],
  ['AC-29', 'evidence', ['trace-contract: the documented field set is the delivered field set', 'trace-contract: documented units, types and the UTC Z convention hold'], [], 'The document is read by the test, so documentation and behaviour cannot drift apart silently. The human "predict it without reading the run loop" procedure is not replaced.'],
  ['AC-30', 'partial', [], ['npm test -> tests/.results/unit-junit.xml', 'npm run evidence:a11y -> a11y-contrast.json + .sha256', 'node tests/tools/ac-coverage.mjs -> ac-coverage.json + .sha256', 'WS-12 §5 clean-checkout proof'], 'The commands exist, run zero-install and emit machine-readable results. Deposition under .development-os/evidence/ is outside every engineering workstream\'s write boundary and is not done here.']
];

// ---------------------------------------------------------------------------
// CHECK
// ---------------------------------------------------------------------------

const problems = [];
const rows = DECLARED.map(([id, disposition, tests, artifacts, limitation]) => {
  const measured = byCriterion.get(id) || [];
  if (disposition !== 'none' && tests.length === 0 && artifacts.length === 0) {
    problems.push(`${id}: declared ${disposition} with neither a test nor an artifact behind it`);
  }
  if (disposition === 'none' && measured.length > 0) {
    problems.push(`${id}: declared none, but ${measured.length} unit test title(s) claim it`);
  }
  if (disposition === 'evidence' && limitation === '' && measured.length === 0) {
    problems.push(`${id}: declared evidence with no unit test title naming it`);
  }
  return {
    id,
    disposition,
    unitTestsNamingIt: measured.length,
    measuredTitles: measured.map((entry) => `${entry.file} :: ${entry.title}`),
    declaredTests: tests,
    declaredArtifacts: artifacts,
    limitation
  };
});

const declaredIds = rows.map((row) => row.id);
for (let index = 1; index <= 30; index += 1) {
  const id = `AC-${String(index).padStart(2, '0')}`;
  if (!declaredIds.includes(id)) problems.push(`${id}: missing from the declared matrix`);
}
for (const id of byCriterion.keys()) {
  if (!declaredIds.includes(id)) problems.push(`${id}: named by a test but absent from the matrix`);
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

function revision() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const counts = { evidence: 0, partial: 0, none: 0 };
for (const row of rows) counts[row.disposition] += 1;

console.log(`repository            : ${ROOT}`);
console.log(`revision              : ${revision()}`);
console.log(`unit test files       : ${unitFiles.length}`);
console.log(`unit test titles      : ${totalTitles}`);
console.log(`criteria declared     : ${rows.length}`);
console.log('');
console.log('AC      disposition  unit tests naming it  limited by');
for (const row of rows) {
  const limit = row.limitation ? row.limitation.slice(0, 78) : '';
  console.log(
    `${row.id}  ${row.disposition.padEnd(11)}  ${String(row.unitTestsNamingIt).padStart(20)}  ${limit}`
  );
}
console.log('');
console.log(`evidence=${counts.evidence}  partial=${counts.partial}  none=${counts.none}`);

if (problems.length > 0) {
  console.log('');
  console.log('MATRIX INCONSISTENT:');
  for (const problem of problems) console.log(`  ${problem}`);
}

const report = {
  schema: 'ws10-ac-coverage/1',
  generatedAt: new Date().toISOString(),
  repository: 'dino-dash-app',
  sourceRevision: revision(),
  planId: 'ENGPLAN-EVT-20260809-001',
  workstreamId: 'WS-10',
  requestId: 'DEVREQ-EVT-20260809-001',
  gate: 'GATE-AUTOMATED-TESTS',
  unitTier: { files: unitFiles, titles: totalTitles },
  counts,
  consistent: problems.length === 0,
  problems,
  criteria: rows
};

if (existsSync(RESULTS_DIR)) {
  const path = join(RESULTS_DIR, 'ac-coverage.json');
  const json = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(path, json, 'utf8');
  const digest = createHash('sha256').update(json).digest('hex');
  writeFileSync(`${path}.sha256`, `${digest}  ac-coverage.json\n`, 'utf8');
  console.log('');
  console.log(`wrote tests/.results/ac-coverage.json (${json.length} bytes)`);
  console.log(`sha256                : ${digest}`);
} else {
  console.log('');
  console.log(`tests/.results/ is absent; nothing written`);
}

process.exit(problems.length === 0 ? 0 : 1);
