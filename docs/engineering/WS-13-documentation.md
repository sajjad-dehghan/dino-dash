# WS-13 — Technical Documentation

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-13, owner role ENG-14, producer actor `actor-eng-14`, domain `technical_documentation` |
| Plan dependencies | WS-02 … WS-12 — all `completed` |
| Branch | `codex/evt-20260809-001` |
| Revision documented | `src` tree `0566d5d39599d0cdf374b5dee27d22afdb544c41` (WS-03's seal); parent commit `0fb86ee1bea2cd1131103745ec2aee217cd2bb47` |
| Gate owned | `GATE-DOCUMENTATION` (**required: true**) |
| Acceptance criterion | **AC-29** (this workstream's specific deliverable) |
| Disposition | **Discharged**, with the delivery's known gaps carried into the documentation rather than resolved by it (§4) |
| Verification disposition | `not_applicable` — only ENG-15 at WS-14 issues one |
| Authored | 2026-08-11 |

WS-13 wrote documentation and nothing else. **No file under `src/` was created, modified or deleted**;
`git rev-parse HEAD:src` is byte-identical to WS-03's seal before and after. Root `README.md` and
`BENCHMARK.md` are the owner's and were not touched — both were already modified in the working tree
by some process other than this workstream and were left exactly as found, unstaged.

---

## 1. What was produced

| Path | What it is |
| --- | --- |
| `docs/score-trace-contract.md` | **AC-29's deliverable.** The score-trace field contract written for a Unit 3 author: the three fields with types and units, the timezone convention and its open risk, `window.dinoDash.getScoreTrace()`, copy-on-read, lifetime, what the record is *not*, the evolution rule, and the AC-29 self-test |
| `docs/runbook.md` | Every stated command, each executed and its real output recorded; the manual AC-12/AC-14 procedure; the clean-checkout recipe; eleven carried gaps |
| `docs/operating-overview.md` | The delivery for someone joining cold: three states, the DOM-free core, the palette-as-single-source rule, timing, what is deliberately absent, gaps inherited |
| `docs/README.md` | The index. Points a Unit 3 author at the contract in the first table, above everything else |
| `docs/engineering/WS-13-documentation.md` | This record |

**Discoverability, which is what AC-29 actually asks for.** A Unit 3 author lands on `docs/README.md`;
the first row of the first table is the score-trace contract, and a call-out immediately below repeats
it. The contract document itself opens with "If you are building Unit 3, this is the document you
need. You can read it alone. You do not need to open any file under `src/`." ADR-003 remains the
normative decision and is linked from both.

## 2. AC-29 self-test — prediction first, then a real record

AC-29's verification is *"locate the documentation without reading the run-loop source, predict the
three field names, their types and their units from the documentation alone, then compare against an
actual record."* Performed in that order, and the order is the whole point.

**Step 1 — prediction, written to a file outside the repository before opening
`src/trace/score-trace.js` or any run-loop module**, from ADR-003 and the contract document alone:

```
score            number, integer, points, >= 0
endedAt          string, ISO-8601 UTC, literal "Z", YYYY-MM-DDTHH:MM:SS.mmmZ
sessionLengthMs  number, integer, milliseconds, monotonic-derived, >= 0
keys             exactly "endedAt,score,sessionLengthMs"
absent           no id, no schema version, no device marker, no nesting
```

**Step 2 — three real runs** over the delivered `src/game/*` and `src/trace/score-trace.js` at the
sealed tree, ended by real collisions and recorded through the append-on-run-end path:

```
{"score":35,"endedAt":"2026-08-11T14:04:36.171Z","sessionLengthMs":3600}
{"score":35,"endedAt":"2026-08-11T14:04:36.172Z","sessionLengthMs":3600}
{"score":35,"endedAt":"2026-08-11T14:04:36.173Z","sessionLengthMs":3600}

keys           : endedAt,score,sessionLengthMs
score          : number   integer=true
endedAt        : string   /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/ matched, Date.parse ok
sessionLengthMs: number   integer=true
prototype      : Object.prototype
copy-on-read   : two reads returned a different array AND different record objects
record count   : 3 after three runs
```

**Step 3 — comparison: zero discrepancies.** Three names, three types, both units, the `Z`
convention, the closed key set, the plain-object shape and copy-on-read all matched the prediction.

Two disclosures, because a self-test that hides its method is worth nothing:

- **The runs were seeded and deterministic**, so all three scored 35 over 3,600 ms. The runs are real
  collisions; the sameness is the seed, not the contract.
- **The scratch harness was written outside the repository** and is not part of the delivery. The
  module's API surface (`appendRunEnd`, `list`, `size`, `RECORD_FIELDS`) was discovered by **runtime
  introspection** (`Object.keys` on the imported namespace and the instance), not by reading the
  module. `src/main.js`'s accessor names were confirmed by a targeted grep after the prediction was
  already fixed on disk.
- **The `window.dinoDash.getScoreTrace()` path itself was not exercised** — that needs a browser, and
  this delivery has no browser tier (§4). What was exercised is the module the accessor delegates to.
  Stated as a limitation, not folded into the result.

**Standing protection.** `tests/unit/trace-contract.test.mjs` (7 tests, under `npm test`) reads
ADR-003 and asserts the delivered module matches the documented field set, types, units and UTC `Z`
convention, so documentation and behaviour cannot drift silently. It does not replace the human
procedure above; AC-29 asks for both.

## 3. Every command in the runbook was executed

Node v22.23.2, npm 10.9.8, Windows 11 Pro 10.0.28000, Git Bash, repository root, **no `node_modules`,
no install step**. Nothing was documented that was not run.

| Command | Exit | Observed |
| --- | ---: | --- |
| `npm test` | **0** | `tests 114 / pass 114 / fail 0`, `duration_ms 338.0159`; wrote `tests/.results/unit-junit.xml` |
| `npm run evidence:a11y` | **0** | 3 variations, 11 declared pairs, 33 rows, 33 passed / 0 failed; min text 11.91 (threshold 4.5), min non-text 3.07 (threshold 3) |
| `node tests/tools/static-server.mjs 4173` | — | `serving src/ at http://127.0.0.1:4173/`; `GET /` → 200, 2,477 B; `GET /main.js` → 200, 3,903 B |
| `node tests/tools/ac-coverage.mjs` | **0** | `evidence=11 partial=18 none=1`; wrote `ac-coverage.json` (24,722 B), sha256 `bf5ca2cd52f7bda398a93c4b576ba88eab11f69481c4a5876d614194549ae7fe` |
| `npm run perf:artifact` | **0** | 17 requests, 0 non-200, disk total = wire total (42,517 = 42,517) |
| `npm run perf:simulation` | **0** | full WS-11 report; ends "No threshold was asserted. These are observations, not budgets." |

`npm test` was run again after the documents were written: **114 / 114, exit 0.** The
`AC-29: the documentation exists where a Unit 3 author will look` assertion in
`tests/unit/trace-contract.test.mjs` reads ADR-003, which this workstream did not modify.

## 4. Gaps carried into the documentation, not closed by it

All six of the named carry-forwards appear in `docs/runbook.md` §6, `docs/operating-overview.md` §9
and the index's own gap list, worded as recorded gaps rather than passes:

1. **No browser tier.** WS-12 found Playwright's Chromium launches here from warm caches; WS-10's
   genuinely cold acquisition produced **ten minutes, zero output, zero bytes**, exit 143. Fourteen
   criteria are `partial` or `none` for this one reason.
2. **The rendered-pixel half of AC-16 / AC-17 is unmeasured.** The contrast command measures the
   declared palette. A failing row proves the palette cannot pass; a passing row does not close the
   criterion.
3. **The performance budget is unset and must not be invented.** `GATE-PERFORMANCE` and
   `GATE-RELIABILITY` are recorded gaps. PERF-R-01 (the 8.5 % jump-apex spread across 30–144 fps) is
   documented as a measurement and explicitly not judged.
4. **WS-09 F-01 is guarded, not fixed** — the prototype-chain lookup in `transition()`; unreachable at
   this revision, characterised and containment-tested, left in place because `src/` is sealed. The
   runbook records that the characterisation tests are written to fail when someone fixes it.
5. **`endedAt`'s `Z` interpretation risk** against AC-19's "explicit UTC offset" — §2 of the contract
   document, stated as live and unsettled.
6. **AC-30 names AC-12 and AC-14 and no command produces evidence for either**; AC-14 has no
   substitute at all. The stated procedure is `docs/runbook.md` §2.

Also carried: the score trace grows unboundedly by design (~58.3 B/record), the hidden-tab score
accrual property (WS-05 §3.8 / WS-10 §5, **not** covered by the owner's forgery acceptance), the
`aria-hidden` canvas as a known limitation rather than a satisfied requirement, the CRLF/byte-total
issue, and the fact that CI has never run.

## 5. `GATE-DOCUMENTATION` — disposition

`engineering/quality/gates.json`: `GATE-DOCUMENTATION`, domain `documentation`, ownerRole `ENG-14`,
**`required: true`**, declared evidence *"updated operating documentation"*, *"runbook or migration
notes"*.

| Evidence the gate names | Where it is | Disposition |
| --- | --- | --- |
| **updated operating documentation** | `docs/operating-overview.md` (states, DOM-free core, palette rule, timing, deliberate absences, recovery), `docs/score-trace-contract.md` (the one artifact a later unit consumes), `docs/README.md` (index and discoverability) | **Satisfied** |
| **runbook or migration notes** | `docs/runbook.md` — six commands each executed with real output, the manual AC-12/AC-14 procedure, the clean-checkout recipe, CI status, eleven carried gaps. Migration notes are `not_applicable`: nothing persists anywhere, so there is no data to migrate and no rollback beyond reverting the commit | **Satisfied** |

**`GATE-DOCUMENTATION` is DISCHARGED.** **AC-29 is met**: the contract is documented in a location a
Unit 3 author finds without reading `src/`, and the prediction-then-compare procedure returned zero
discrepancies against a record produced by running the delivered code (§2).

Two things this discharge does **not** claim: it does not close any criterion belonging to another
workstream, and the AC-29 self-test did not exercise the browser accessor (§2), because no browser
tier exists.

`engineering/standards/` contains eight standards and **none covers `technical_documentation`** —
there is no domain standard for this workstream to discharge. Recorded so ENG-15 does not look for
one.

## 6. Write boundary (AC-28)

Five files created, nothing modified, nothing deleted:

| Status | Path |
| --- | --- |
| added | `docs/score-trace-contract.md` |
| added | `docs/runbook.md` |
| added | `docs/operating-overview.md` |
| added | `docs/README.md` |
| added | `docs/engineering/WS-13-documentation.md` |

All five under `docs/`. **Nothing under `src/`, `tests/`, `engineering/`, `.development-os/`,
`.github/`, `DEVELOPMENT.md`, `development-os.config.json`, root `README.md`, root `BENCHMARK.md`, or
anywhere in the product workspace `D:/os-test/dino-dash`, was created, modified or deleted.**
`git rev-parse HEAD:src` → `0566d5d3…44c41`, unchanged. `git diff --check` clean on the staged set.
The scratch prediction file and the observation harness from §2 live outside the repository and are
not part of the delivery.

## 7. What ENG-14 did not do

- **Changed nothing under `src/`.** The seal holds.
- **Touched neither root `README.md` nor `BENCHMARK.md`.** Both are the owner's, both were already
  modified in the working tree by another process, and both were left as found and unstaged. Where
  they disagree with `docs/`, the `docs/` files state the revision they were verified at.
- **Documented no command it did not run.** All six in §3 were executed and their real output
  recorded.
- **Closed no gap by describing it.** Every carry-forward in §4 is worded as a recorded gap.
- **Invented no threshold, no budget and no number.** Every figure is quoted from a workstream record
  or from a command ENG-14 executed.
- **Re-accepted no risk.** `DEC-20260809-001`'s client-side forgeability acceptance is described and
  bounded exactly as WS-02 **AR-02** requires; the hidden-tab accrual property is kept distinct from
  it, as WS-05 **L-05** and WS-10 **L-07** require.
- **Deposited no evidence under `.development-os/`.** That path is outside this write boundary.
- **Issued no verification disposition.** WS-13 records `not_applicable`. Only ENG-15 at WS-14 issues
  the delivery's.
