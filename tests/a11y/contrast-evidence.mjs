/**
 * Accessibility evidence command - the declared-palette contrast matrix (WS-12, AC-30).
 *
 *   node tests/a11y/contrast-evidence.mjs [outputPath]
 *   npm run evidence:a11y
 *
 * WHAT THIS PRODUCES
 * ------------------
 * One machine-readable JSON document holding every declared contrast pair in every
 * background variation - 3 variations x 11 declared pairs = 33 rows - each with the
 * two `#rrggbb` values actually declared for that surface, the measured WCAG 2.x
 * contrast ratio, the threshold that applies to it, and pass/fail. A sha256 sidecar
 * of the JSON file is written next to it and printed to stdout, so the evidence can
 * be deposited with `kind`, `sha256` and `sourceRevision` as AC-30 requires.
 *
 * WHAT IT DOES NOT DO, STATED SO NOBODY OVER-READS IT
 * ---------------------------------------------------
 * This measures the DECLARED palette, not RENDERED PIXELS. AC-16 and AC-17 ask for
 * ratios computed from "the background actually rendered behind it", which needs a
 * real browser painting a real canvas. That is ADR-005's browser tier and WS-10's
 * work; it is not present in this delivery. Two facts make this document meaningful
 * rather than circular, and both are asserted by the existing unit tier:
 *
 *   - `tests/unit/source-hygiene.test.mjs` asserts no colour literal exists anywhere
 *     in `src/` outside `src/render/palette.js`, so the declared palette is the only
 *     source of drawn colour;
 *   - the same test asserts nothing behind text is partially transparent, so text
 *     composites against the opaque plate named in the pair, not against whatever is
 *     underneath it.
 *
 * Neither substitutes for a rendered-pixel sample. See §6 of
 * `docs/engineering/WS-12-delivery-review.md` for the AC-12 and AC-14 manual
 * procedure, which this command cannot perform and does not claim to.
 *
 * ZERO DEPENDENCIES, AND THE MATHS IS NOT DUPLICATED HERE. Every ratio comes from
 * `measureContrast()` in `src/render/palette.js` - the same function the unit tier
 * asserts against and the same module the game renders from. This file imports it,
 * adds no arithmetic of its own, and writes nothing under `src/`.
 *
 * EXIT CODE: 0 when every declared pair meets its threshold, 1 when any pair fails.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BACKGROUND_VARIATIONS,
  CONTRAST_REQUIREMENTS,
  measureContrast
} from '../../src/render/palette.js';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const DEFAULT_OUTPUT = resolve(REPO_ROOT, 'tests/.results/a11y-contrast.json');
const outputPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_OUTPUT;

/** The revision the evidence was produced from. Never invented: null when unknown. */
function sourceRevision() {
  if (process.env.DINO_DASH_REVISION) return process.env.DINO_DASH_REVISION;
  try {
    return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

const rows = measureContrast();
const failures = rows.filter((row) => !row.pass);
const textRows = rows.filter((row) => row.minimum === 4.5);
const nonTextRows = rows.filter((row) => row.minimum === 3);
const ratios = rows.map((row) => row.ratio);

const evidence = {
  schemaVersion: '1.0.0',
  kind: 'accessibility-contrast-evidence',
  requestId: 'DEVREQ-EVT-20260809-001',
  planId: 'ENGPLAN-EVT-20260809-001',
  workstreamId: 'WS-12',
  producerActorId: 'actor-eng-12',
  generatedAt: new Date().toISOString(),
  sourceRevision: sourceRevision(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  },
  method: {
    computedBy: 'src/render/palette.js measureContrast()',
    formula: 'WCAG 2.x relative luminance, ratio (L1 + 0.05) / (L2 + 0.05)',
    input: 'declared #rrggbb palette values',
    renderedPixelSampling: false,
    browser: null,
    note: 'Declared-palette measurement. Rendered-pixel sampling is the ADR-005 browser tier and is absent from this delivery.'
  },
  thresholds: {
    text: { minimum: 4.5, criteria: ['AC-16'] },
    nonText: { minimum: 3, criteria: ['AC-17', 'AC-14'] }
  },
  summary: {
    variations: BACKGROUND_VARIATIONS.length,
    declaredPairsPerVariation: CONTRAST_REQUIREMENTS.length,
    rows: rows.length,
    passed: rows.length - failures.length,
    failed: failures.length,
    minimumRatioObserved: Math.min(...ratios),
    maximumRatioObserved: Math.max(...ratios),
    minimumTextRatioObserved: Math.min(...textRows.map((row) => row.ratio)),
    minimumNonTextRatioObserved: Math.min(...nonTextRows.map((row) => row.ratio))
  },
  coverage: [
    {
      criterion: 'AC-16',
      covered: 'partial',
      what: 'Every text/plate pair in every background variation, measured against 4.5:1.',
      whatIsNotCovered:
        'Ratios sampled from rendered pixels of a real screenshot. Needs the browser tier (WS-10).'
    },
    {
      criterion: 'AC-17',
      covered: 'partial',
      what: 'Character, cactus and ground-line pairs in every background variation, measured against 3:1.',
      whatIsNotCovered:
        'Ratios sampled from rendered pixels of a real screenshot. Needs the browser tier (WS-10).'
    },
    {
      criterion: 'AC-14',
      covered: 'partial',
      what: 'The focus-indicator/shell colour pair is measured against 3:1 as one of the declared pairs.',
      whatIsNotCovered:
        'Focus visibility, focus order and absence of a focus trap are behavioural and are not machine-evidenced by this delivery. Manual procedure: docs/engineering/WS-12-delivery-review.md section 6.'
    },
    {
      criterion: 'AC-12',
      covered: 'none',
      what: 'Nothing. This command produces no AC-12 evidence.',
      whatIsNotCovered:
        'The keyboard-only journey is behavioural. tests/unit/source-hygiene.test.mjs asserts no pointer handler exists in src/, which is an absence check, not a journey. Manual procedure: docs/engineering/WS-12-delivery-review.md section 6.'
    }
  ],
  limitations: [
    'Declared palette values, not rendered pixels.',
    'No browser was launched and no screenshot was taken by this command.',
    'AC-12 and AC-14 behaviour are covered by a stated manual procedure, not by this command.',
    'A failing row here means the palette cannot pass; a passing row does not by itself close AC-16 or AC-17.'
  ],
  rows
};

const serialised = `${JSON.stringify(evidence, null, 2)}\n`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, serialised, 'utf8');

const sha256 = createHash('sha256').update(serialised, 'utf8').digest('hex');
writeFileSync(`${outputPath}.sha256`, `${sha256}  ${outputPath}\n`, 'utf8');

const out = process.stdout;
out.write('dino-dash accessibility evidence - declared palette contrast matrix\n');
out.write(`  criteria         AC-16, AC-17 (contrast half); AC-14 focus pair only; AC-12 not covered\n`);
out.write(`  variations       ${evidence.summary.variations}\n`);
out.write(`  declared pairs   ${evidence.summary.declaredPairsPerVariation} per variation\n`);
out.write(`  measured rows    ${evidence.summary.rows}\n`);
out.write(`  passed / failed  ${evidence.summary.passed} / ${evidence.summary.failed}\n`);
out.write(`  min text ratio   ${evidence.summary.minimumTextRatioObserved} (threshold 4.5)\n`);
out.write(`  min non-text     ${evidence.summary.minimumNonTextRatioObserved} (threshold 3)\n`);
out.write(`  revision         ${evidence.sourceRevision ?? 'unknown'}\n`);
out.write(`  output           ${outputPath}\n`);
out.write(`  sha256           ${sha256}\n`);

for (const row of rows) {
  out.write(
    `  ${row.pass ? 'PASS' : 'FAIL'}  ${row.variationId.padEnd(5)} ` +
      `${`${row.foregroundKey}/${row.backgroundKey}`.padEnd(32)} ` +
      `${row.foreground} on ${row.background}  ` +
      `${String(row.ratio).padStart(6)}:1  min ${row.minimum}\n`
  );
}

if (failures.length > 0) {
  out.write(`\n${failures.length} declared pair(s) below threshold.\n`);
  process.exitCode = 1;
}
