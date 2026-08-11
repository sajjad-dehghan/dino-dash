# Runbook — running the game, the tests and the evidence

| | |
| --- | --- |
| Request / plan | `DEVREQ-EVT-20260809-001` / `ENGPLAN-EVT-20260809-001`, WS-13 (ENG-14) |
| Commands owned by | WS-12 (`docs/engineering/WS-12-delivery-review.md`), tests by WS-03 / WS-10, perf harnesses by WS-11 |
| Every command below was executed by ENG-14 | Node **v22.23.2**, npm 10.9.8, Windows 11 Pro 10.0.28000, Git Bash, repository root `D:/os-test/dino-dash-app`, branch `codex/evt-20260809-001`, `src` tree `0566d5d3…44c41`, **no `node_modules`** |

## 0. Prerequisites — there is no install step

```
git clone <repo> && cd <repo> && npm test
```

**No `npm ci`, no `npm install`, no network, no `node_modules`.** The delivery has zero runtime
dependencies and zero dev dependencies. Every command is `node` plus files already in the checkout.
`npm` is only a script runner — the raw `node` form beside each command works with no npm at all.

Node **≥ 20.11.0** is declared in `package.json` `engines` (20.11.0 is the first Node 20 carrying the
built-in `junit` reporter). Everything recorded here ran on **v22.23.2** only — see §6, R-03.

---

## 1. The commands

Run all of these from the repository root.

| # | Command | Raw form | What it produces | Exit |
| --- | --- | --- | --- | --- |
| 1 | `npm test` | `node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=tests/.results/unit-junit.xml "tests/unit/*.test.mjs"` | `tests/.results/unit-junit.xml` + spec on stdout | 0 pass / non-zero fail |
| 2 | `npm start` | `node tests/tools/static-server.mjs [port]` | serves `src/` at `http://127.0.0.1:4173/` | long-running |
| 3 | `npm run evidence:a11y` | `node tests/a11y/contrast-evidence.mjs [outPath]` | `tests/.results/a11y-contrast.json` + `.sha256` | 0 pass / 1 if a pair fails |
| 4 | `node tests/tools/ac-coverage.mjs` | — | `tests/.results/ac-coverage.json` + `.sha256` | 0 / 1 on an inconsistent matrix |
| 5 | `npm run perf:simulation` | `node --expose-gc tests/perf/simulation-cost.mjs` | stdout report | **0 always — asserts nothing** |
| 6 | `npm run perf:artifact` | `node tests/perf/artifact-weight.mjs [port]` | stdout report | **0 always — asserts nothing** |

### 1.1 `npm test` — the unit tier

Verified by ENG-14 at `src` tree `0566d5d3…44c41`:

```
ℹ tests 114   ℹ pass 114   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   ℹ todo 0
ℹ duration_ms 338.0159                                            exit 0
```

14 test files under `tests/unit/`. Machine-readable output is JUnit XML: one `<testcase>` per test
inside a single `<testsuites>` root; a failure adds a `failure=` attribute **and** a nested
`<failure>` element. **The totals are emitted as XML comments** (`<!-- tests 114 -->`), not as
`tests=`/`failures=` attributes, and there is no `<testsuite>` wrapper. Count `<testcase>` and
`<failure>` elements, or use the process exit code — see §6, R-04.

### 1.2 `npm start` — running the game

```
$ node tests/tools/static-server.mjs 4173
dino-dash: serving src/ at http://127.0.0.1:4173/
```

Verified by ENG-14: `GET /` → `200`, 2,477 B; `GET /main.js` → `200`, 3,903 B. Open
`http://127.0.0.1:4173/` in a current Chromium-based browser. The page reaches `idle` synchronously —
there is nothing to wait for and no loading state.

**Loopback only.** The page fetches nothing off-machine; there are zero remote references in the
markup (the favicon is an inline `data:` stub).

To observe the score trace from the browser console, see `docs/score-trace-contract.md` §3:

```js
window.dinoDash.getScoreTrace()
window.dinoDash.getState()
```

### 1.3 `npm run evidence:a11y` — the accessibility evidence

Verified by ENG-14:

```
dino-dash accessibility evidence - declared palette contrast matrix
  criteria         AC-16, AC-17 (contrast half); AC-14 focus pair only; AC-12 not covered
  variations       3
  declared pairs   11 per variation
  measured rows    33
  passed / failed  33 / 0
  min text ratio   11.91 (threshold 4.5)
  min non-text     3.07 (threshold 3)                              exit 0
```

Writes one JSON document with `schemaVersion`, `kind`, `sourceRevision`, `environment`, `method`,
`thresholds`, `summary`, per-criterion `coverage`, explicit `limitations` and 33 rows (3 background
variations × 11 declared pairs), plus a `.sha256` sidecar — the three fields
(`kind`, `sha256`, `sourceRevision`) that evidence deposition needs.

It imports `measureContrast()` from `src/render/palette.js` rather than reimplementing WCAG, so the
evidence and the renderer cannot disagree.

**The digest changes between runs by design** — `generatedAt` is embedded in the document. Compare
the `rows` array, not the file digest; `rows` is byte-stable at a fixed revision.

**What it is not:** it measures the **declared palette**, not rendered pixels. See §6, R-01.

### 1.4 `node tests/tools/ac-coverage.mjs` — the AC coverage matrix

Verified by ENG-14: `evidence=11  partial=18  none=1`, wrote `tests/.results/ac-coverage.json`
(24,722 bytes), sha256 `bf5ca2cd52f7bda398a93c4b576ba88eab11f69481c4a5876d614194549ae7fe`, exit 0.
The harness measures which unit-test titles name which criterion and exits non-zero if that
contradicts WS-10's declared disposition. The digest is per-run (`generatedAt`, `sourceRevision`).

### 1.5 The two performance harnesses

Verified by ENG-14, both exit 0:

```
$ npm run perf:artifact
requests                 17
bytes transferred        42517
non-200 responses        0
disk total vs wire total 42517 vs 42517  (identical: no build step, no compression)
END. No budget was asserted. These are observations, not budgets.

$ npm run perf:simulation      # node --expose-gc tests/perf/simulation-cost.mjs
… frame cost, obstacle scaling, allocation over 30 simulated minutes,
  frame-rate independence, the delta-time clamp, delivered constants …
END. No threshold was asserted. These are observations, not budgets.
```

**They are not in the pass/fail path and must not be put there.** They are not `*.test.mjs`, are
excluded from `node --test` discovery, are not run by `npm test`, and are not in CI. They assert
nothing because asserting would require a threshold no artifact in this delivery contains — see §6.

---

## 2. The manual accessibility procedure (AC-12, AC-14)

There is **no command** for these two. There is no browser tier (§6, R-06), so the evidence is a
stated procedure and it is stated rather than folded into §1.3's claims.

**Preconditions.** Clean checkout, `npm start`, `http://127.0.0.1:4173/` in a current Chromium-based
browser at 100 % zoom. Record browser name and version. **Keep a pointer device physically unused
throughout** — that is the point of the exercise, not a formality.

**AC-12 — the whole journey by keyboard alone.** Perform twice, end to end:

1. `Tab` until the play area holds focus. Screenshot: the focus indicator must be visible.
2. `Space` — the run starts. Screenshot the running state.
3. `Space` and `Up Arrow` alternately: at least four jumps, at least one obstacle cleared.
4. Play into a cactus. Screenshot the run-end state.
5. `Space` — a new run starts, score reads zero.
6. Collide again.

Record every step that could not be completed without a pointer. **Expected count: zero.** A non-zero
count is the finding; it is not to be reconciled away.

**AC-14 — focus, in each of `idle`, `running` and `run-end`.** In each state press `Tab` repeatedly
through a full cycle, screenshot every focus stop, and record (a) whether each stop shows a visible
focus indicator, (b) the order of stops, (c) that continuing to press `Tab` returns to the first stop,
and (d) that `Tab` never becomes unresponsive. The delivery has exactly one focusable element,
`#dd-stage` with `tabindex="0"`; the canvas is deliberately not focusable, so the cycle is short and
leaves the document through the browser chrome and returns. The focus pair (`focus`/`shell`) measures
11.39 / 10.28 / 12.05 : 1 across the three variations in §1.3 — the *measurement* is machine evidence,
the *visibility* is what this step observes.

**AC-22 / AC-23 storage check, same session.** With the page open: `localStorage`, `sessionStorage`,
IndexedDB and cookies must contain no key created by the game, and the network panel must show zero
outbound requests. Play three runs without reloading → `window.dinoDash.getScoreTrace().length === 3`.
Reload → `0`.

---

## 3. What the unit tier already covers, so you do not repeat it

`tests/unit/keyboard-journey.test.mjs` drives the **real** keyboard module against a real
`EventTarget` with real `keydown` events and completes the six-step AC-12 journey from key events
alone, asserts exactly one listener type (`keydown`), and asserts `defaultPrevented` in both
directions — `true` for Space and Up Arrow, **`false` for Tab** (suppressing Tab would break AC-14).

It does **not** import `src/main.js` (that module touches `document` at import time); it re-creates
main.js's wiring. A divergence between the test's wiring and the real bootstrap would not be caught,
and nothing is rendered — no canvas, no focus ring, no scroll position.

---

## 4. Reproducing a clean-checkout proof

```
git worktree add --detach <temp-dir-outside-both-repos> <revision>
cd <temp-dir> && git rev-parse HEAD          # confirm the revision
test -d node_modules && echo yes || echo no  # expect: no
npm test && npm run evidence:a11y && node tests/tools/ac-coverage.mjs
```

Use a directory **outside** `dino-dash-app` and outside the product workspace `D:/os-test/dino-dash`.
Never run an install step there.

**Byte totals reproduce only in an LF working tree.** `core.autocrlf=true` with no `.gitattributes`
in the repository means a fresh Windows checkout inflates every file by one byte per line:
`perf:artifact` reports 43,842 B in a fresh Windows checkout against 42,517 B in an LF tree. The
request **count** (17), the non-200 count (0) and disk-total = wire-total are unaffected, and those
are the load-bearing claims. See §6, R-02.

---

## 5. CI

`.github/workflows/ci.yml` — checkout, `actions/setup-node` at `20.11.0` and `22.x`, assert
`node_modules` is absent, `npm test`, `npm run evidence:a11y`, upload both result files and the
sha256 sidecar. Deliberately absent: any install step (nothing to install), the browser tier, and any
performance job.

**It has never been executed.** No CI run exists for this repository at any revision. What is
evidenced is that the commands it runs were executed locally and from a clean checkout.

---

## 6. Known gaps, carried forward honestly

Every item here is a **recorded gap, not a pass**. Do not cite a command in §1 as closing any of them.

- **R-01 — the contrast evidence is declared-palette, not rendered-pixel.** AC-16 asks for the ratio
  "against the background actually rendered behind it" and AC-17 for "representative rendered
  pixels". §1.3 measures the palette. Two unit-tier properties keep this from being circular — no
  colour literal exists outside `src/render/palette.js`, and nothing behind text is partially
  transparent — so the declared pair is the drawn pair *to the extent a static check can establish
  that*. **A failing row proves the palette cannot pass; a passing row does not by itself close AC-16
  or AC-17.** Open since WS-12; inherited unchanged by WS-10.
- **R-02 — `core.autocrlf=true` and no `.gitattributes`** (§4). Byte totals and any sha256 over
  `src/` files are checkout-dependent on Windows. The fix is a repository-root path outside every
  engineering write boundary, so it is **raised, not created**.
- **R-03 — the `engines` floor is declared, not executed.** `>=20.11.0`; everything recorded here ran
  on v22.23.2 only. The CI matrix pins `20.11.0` precisely so the floor gets exercised — and that
  workflow has never run (§5).
- **R-04 — the JUnit totals are XML comments, not attributes** (§1.1). A parser requiring
  `tests=`/`failures=` reads zero. Element counts and the exit code are correct.
- **R-05 — no performance budget exists, and none may be invented.** The request states the budget is
  **UNKNOWN** and that "any budget asserted before the baseline exists must be rejected". The two
  harnesses in §1.5 measure and assert nothing. `GATE-PERFORMANCE` and `GATE-RELIABILITY`
  (`required: false`) are **recorded gaps, not passes**. Setting a budget needs a device baseline from
  real target-user data, which this delivery does not have.
- **R-06 — there is no browser tier.** WS-12 found Playwright's Chromium *launches* here from warm
  caches; WS-10 then attempted a genuinely **cold** acquisition with `PLAYWRIGHT_BROWSERS_PATH`
  pointed at an empty directory and got **ten minutes, zero output, zero bytes downloaded**, exit 143.
  No dependency, config or browser test was added — a stated command that does not run fails AC-30.
  Fourteen criteria are `partial` or `none` for this single reason.
- **R-07 — AC-30 names AC-12 and AC-14, and no command produces evidence for either.** AC-12 has the
  logic-tier substitute in §3; **AC-14 has none** — a rendered focus indicator cannot be observed by
  anything in this repository. §2 is the procedure.
- **R-08 — WS-09 finding F-01 is guarded, not fixed.** `transition()` in
  `src/game/state-machine.js` resolves its lookup through the prototype chain, so inherited
  `Object.prototype` names are accepted as events and drive the state off the declared enumeration
  (and brick the machine afterwards). It is **unreachable at this revision** because every call site
  passes a pinned literal, and `tests/unit/state-machine-prototype.test.mjs` now characterises the
  defect, publishes the one-line `Object.hasOwn` fix as an executable spec, and asserts that no
  external input expression reaches a `transition()` call site. `src/` is sealed at WS-03, so the
  defect is **not fixed**. Those characterisation tests are written to **fail when someone fixes it** —
  the correct response is to invert the assertions, not delete the file.
- **R-09 — `endedAt`'s `Z` designator is an open interpretation risk.** AC-19 asks for "an explicit
  UTC offset"; the delivery emits `Z`. A verifier requiring a numeric `±HH:MM` would find `Z`
  insufficient. See `docs/score-trace-contract.md` §2.
- **R-10 — AC-20's stopwatch tolerance and AC-21's OS-clock procedure are satisfied by an injected
  clock**, which is a **declared substitute** for the manual procedure, disclosed as a substitute and
  never reported as the manual procedure itself.
- **R-11 — evidence deposition under `.development-os/evidence/` is not done by any engineering
  workstream.** That path is outside every engineering write boundary. The commands produce artifacts
  carrying `kind`, `sha256` and `sourceRevision`; depositing them is someone else's act.
