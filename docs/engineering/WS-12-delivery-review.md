# WS-12 — Developer Experience and Delivery

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-12, owner role ENG-12, producer actor `actor-eng-12` |
| Branch | `codex/evt-20260809-001` |
| Toolchain revision (commands and CI) | `c85a5ac` |
| Revision this document adds | the next commit on the same branch — documentation only, see §5.4 |
| Implements | ADR-005 (build and test toolchain), WS-01 blocker **B-01** |
| Acceptance criterion targeted | **AC-30** |
| Authored | 2026-08-11 |

WS-12 owns the commands, not the tests. Unit-tier content is WS-03's and WS-10's; the two perf
harnesses are WS-11's; the game is sealed at WS-03. **No file under `src/` was created, modified or
deleted by this workstream**, and the changed-file inventory in §8 is the whole of it.

---

## 1. The headline: `npm test` needs no install step

The single most important property of this delivery, and the reason AC-30 is closable:

```
git clone <repo> && cd <repo> && npm test
```

There is **no `npm ci`, no `npm install`, no network access and no `node_modules`** between a clean
checkout and machine-readable test results. The delivery has zero runtime dependencies (ADR-005 §6)
and now also **zero dev dependencies**. Every stated command is `node` plus files that are already in
the checkout.

This is a deliberate strengthening of ADR-005 §4, which stated four commands of which the first was
`npm ci  … NETWORK REQUIRED (registry + browser download)`. That command is **absent here, on
purpose**. What WS-01 **B-01** flagged as an unavoidable wrinkle — "a clean checkout will need a
dependency install step, which touches the network at *install* time … the two must be stated
separately in the evidence or a verifier will read them as contradictory" — does not arise, because
there is no install step to state. The distinction B-01 asked ENG-12 to draw carefully is now vacuous
in the safest possible direction:

| | Network? |
| --- | --- |
| Running the game (AC-24) | none |
| Installing the toolchain | **there is no install step** |
| Running the tests | none — loopback only, and only for the harness in §2.5 |
| Producing the accessibility evidence | none |

Consequences worth stating because a later unit will be tempted to trade them away: no lockfile drift,
no registry outage between a verifier and a reproduction, no supply-chain surface for WS-09 to audit
beyond the empty set, no `node_modules/` — which is on the contract's own `prohibitedPaths` — and no
version of the toolchain that can rot while the delivery revision stays fixed.

---

## 2. The stated commands

All are run from the repository root. **Node ≥ 20.11.0** is declared in `package.json` `engines`;
everything below was executed on **Node v22.23.2** (see §7, risk R-03, for what that does and does not
evidence). `npm` is used only as a script runner — the raw `node` form beside each is equivalent and
works with no npm at all.

| # | Command | What it does | Machine-readable output | Exit code |
| --- | --- | --- | --- | --- |
| 2.1 | `npm test` | Unit tier, 61 tests | `tests/.results/unit-junit.xml` (JUnit XML) + spec on stdout | 0 pass / non-zero fail |
| 2.2 | `npm run evidence:a11y` | Accessibility evidence, contrast half | `tests/.results/a11y-contrast.json` + `.sha256` sidecar | 0 pass / 1 if any pair fails |
| 2.3 | `npm start` | Serves `src/` at `http://127.0.0.1:4173/` | — (long-running) | — |
| 2.4 | `npm run perf:simulation` | WS-11 §2–§6.2 measurements | stdout report | 0 always — **asserts nothing** |
| 2.5 | `npm run perf:artifact` | WS-11 §8 cold-load weight | stdout report | 0 always — **asserts nothing** |

Raw forms, for a verifier who wants no npm in the loop:

```
node --test --test-reporter=spec --test-reporter-destination=stdout \
     --test-reporter=junit --test-reporter-destination=tests/.results/unit-junit.xml \
     "tests/unit/*.test.mjs"
node tests/a11y/contrast-evidence.mjs [outputPath]
node tests/tools/static-server.mjs [port]
node --expose-gc tests/perf/simulation-cost.mjs
node tests/perf/artifact-weight.mjs [port]
```

### 2.6 The perf harnesses are not in the pass/fail path — and must not be put there

`perf:simulation` and `perf:artifact` are named `perf:*`, are excluded from `node --test` discovery
(they are not `*.test.mjs`), are **not** run by `npm test`, and are **not** in the CI workflow. WS-11
§12 records that they assert nothing because asserting would require a threshold that no artifact in
this delivery contains and that ENG-11 had no authority to invent. Wiring them into a pass/fail
pipeline would manufacture exactly that threshold. They are scripts so that WS-11's numbers are
re-runnable, and for no other reason.

### 2.7 Why the unit tier writes JUnit and what its shape actually is

Node's built-in `junit` reporter, no dependency. Verified representation, because "machine-readable"
is a claim about a parser's view and not about a human's:

- one `<testcase name=… time=… classname="test"/>` element per test, inside a single `<testsuites>`
  root;
- a failing test adds a `failure="…"` attribute **and** a nested `<failure type="testCodeFailure"
  message="…">` element carrying the assertion diff — confirmed by deliberately failing a throwaway
  test outside this repository: `1` `<failure>` element emitted, process exit code `1`;
- **the totals are emitted as XML comments** (`<!-- tests 61 -->`, `<!-- fail 0 -->`), not as
  `tests=`/`failures=` attributes, and there is **no `<testsuite>` wrapper** when the tier has no
  suites. A parser that counts `<testcase>` and `<failure>` elements reads this correctly; a parser
  that requires the summary attributes will read zero. Recorded as risk **R-04** rather than papered
  over. The process exit code is the unambiguous signal and is what CI gates on.

---

## 3. The accessibility evidence command

`tests/a11y/contrast-evidence.mjs` — new in this workstream, zero dependencies, ~130 lines including
the header that states its own limits.

**It does not reimplement the contrast maths.** It imports `measureContrast()` from
`src/render/palette.js` — the same function `tests/unit/palette.test.mjs` asserts against and the same
module the renderer draws from. There is one WCAG implementation in this delivery and this command
calls it. If the palette changes, the evidence changes with it and cannot silently disagree.

Output: one JSON document with `schemaVersion`, `kind`, `sourceRevision` (from `git rev-parse HEAD`,
overridable by `DINO_DASH_REVISION`, `null` rather than invented when unavailable), `environment`,
`method`, `thresholds`, `summary`, per-criterion `coverage`, explicit `limitations`, and **33 rows** —
3 background variations × 11 declared pairs. Each row carries `variationId`, `foregroundKey`,
`backgroundKey`, the two `#rrggbb` values, the measured `ratio`, the `minimum` that applies and
`pass`. A sha256 of the file is written to a `.sha256` sidecar and printed, so the artifact can be
deposited with `kind`, `sha256` and `sourceRevision` as AC-30's verification clause requires.

Real output, executed at `c85a5ac`:

```
dino-dash accessibility evidence - declared palette contrast matrix
  criteria         AC-16, AC-17 (contrast half); AC-14 focus pair only; AC-12 not covered
  variations       3
  declared pairs   11 per variation
  measured rows    33
  passed / failed  33 / 0
  min text ratio   11.91 (threshold 4.5)
  min non-text     3.07 (threshold 3)
  revision         c85a5ac74771429bd6c9a3be62a4be58197ca98f
  sha256           <differs per run; see the note below>
  PASS  dawn  textOn/plate                     #241033 on #FFE3A8   14.04:1  min 4.5
  PASS  dawn  shellText/shell                  #FFE3A8 on #2B0F3A   13.64:1  min 4.5
  PASS  dawn  character/sky                    #0E2A5E on #FFE3A8   11.12:1  min 3
  PASS  dawn  character/groundLine             #0E2A5E on #B36A15     3.3:1  min 3
  PASS  dawn  characterAccent/character        #FF9EBB on #0E2A5E    7.19:1  min 3
  PASS  dawn  cactus/sky                       #05392A on #FFE3A8   10.34:1  min 3
  PASS  dawn  cactus/groundLine                #05392A on #B36A15    3.07:1  min 3
  PASS  dawn  cactusAccent/cactus              #9BE84A on #05392A    8.64:1  min 3
  PASS  dawn  groundLine/sky                   #B36A15 on #FFE3A8    3.37:1  min 3
  PASS  dawn  groundLine/ground                #B36A15 on #2B0F3A    4.05:1  min 3
  PASS  dawn  focus/shell                      #9BE84A on #2B0F3A   11.39:1  min 3
  PASS  noon  textOn/plate                     #08243B on #A9E9FF   11.91:1  min 4.5
  PASS  noon  shellText/shell                  #A9E9FF on #08243B   11.91:1  min 4.5
  PASS  noon  character/sky                    #2E0A5E on #A9E9FF   11.95:1  min 3
  PASS  noon  character/groundLine             #2E0A5E on #B85C2E    3.49:1  min 3
  PASS  noon  characterAccent/character        #7FD8F7 on #2E0A5E    9.89:1  min 3
  PASS  noon  cactus/sky                       #04301F on #A9E9FF    10.9:1  min 3
  PASS  noon  cactus/groundLine                #04301F on #B85C2E    3.18:1  min 3
  PASS  noon  cactusAccent/cactus              #7DE86B on #04301F    9.41:1  min 3
  PASS  noon  groundLine/sky                   #B85C2E on #A9E9FF    3.43:1  min 3
  PASS  noon  groundLine/ground                #B85C2E on #08243B    3.48:1  min 3
  PASS  noon  focus/shell                      #7DE86B on #08243B   10.28:1  min 3
  PASS  dusk  textOn/plate                     #1A0B2E on #FFE6F4    15.8:1  min 4.5
  PASS  dusk  shellText/shell                  #FFE6F4 on #1A0B2E    15.8:1  min 4.5
  PASS  dusk  character/sky                    #5C0A2E on #FFE6F4   11.62:1  min 3
  PASS  dusk  character/groundLine             #5C0A2E on #A87A12    3.55:1  min 3
  PASS  dusk  characterAccent/character        #FFC94A on #5C0A2E    8.91:1  min 3
  PASS  dusk  cactus/sky                       #05392A on #FFE6F4      11:1  min 3
  PASS  dusk  cactus/groundLine                #05392A on #A87A12    3.36:1  min 3
  PASS  dusk  cactusAccent/cactus              #7DE86B on #05392A    8.39:1  min 3
  PASS  dusk  groundLine/sky                   #A87A12 on #FFE6F4    3.28:1  min 3
  PASS  dusk  groundLine/ground                #A87A12 on #1A0B2E    4.82:1  min 3
  PASS  dusk  focus/shell                      #7DE86B on #1A0B2E   12.05:1  min 3
```

The tightest margins in the delivery are `cactus/groundLine` at **3.07:1** (dawn) and
`cactusAccent`-free `groundLine/sky` at **3.28:1** (dusk), both against a 3:1 threshold. They pass; a
palette edit of a few hex points would not.

**Digest note.** The JSON embeds `generatedAt`, so its sha256 differs between runs by design — the
digest identifies an artifact instance, which is what evidence deposition needs. The `rows` array
itself is deterministic: two runs at the same revision produce byte-identical `rows`. A verifier
comparing runs should compare `rows`, not the file digest.

### 3.1 What this command is not — stated before anyone over-reads it

It measures the **declared palette**, not **rendered pixels**. AC-16 asks for the ratio "against the
background actually rendered behind it" and AC-17 asks for "representative rendered pixels". That
needs a browser painting a real canvas — ADR-005's browser tier, which is WS-10's content and is
**absent from this delivery** (§4).

Two properties, both asserted by the existing unit tier, are what stop this document from being
circular:

- `tests/unit/source-hygiene.test.mjs` — *"ADR-004: no colour literal exists outside
  `src/render/palette.js`"*: the declared palette is the only source of drawn colour, so there is no
  second colour that could be rendered instead;
- the same file — *"AC-16: nothing behind text is partially transparent"*: text composites against
  the opaque plate named in the pair, not against whatever is underneath it.

Together they make the declared pair the pair that is actually drawn, **to the extent a static check
can establish that**. It is not a rendered-pixel sample and this document does not offer it as one. A
failing row here proves the palette cannot pass; a passing row does not by itself close AC-16 or
AC-17. That gap belongs to WS-10 and is carried as risk **R-01**.

---

## 4. Playwright: what was actually tried, and what was found

ADR-005 §3 chose Playwright for the browser tier. WS-12 **did not add it**, and the reason is a
judgement, not a failure — so here is the evidence rather than the conclusion.

**What was tested.** In a temporary directory **outside both repositories**
(`…/scratchpad/pw-probe`, never inside `dino-dash-app`):

| Step | Result |
| --- | --- |
| `npm view @playwright/test version` | `1.62.1` — the registry is reachable from this environment |
| `npm install @playwright/test@1.62.1` | succeeded, "up to date in 6s" — resolved from a warm npm cache |
| `npx playwright install chromium` | exit 0, **no output and no download observed** — the build was already present in `%LOCALAPPDATA%\ms-playwright` (`chromium-1234`, `chromium_headless_shell-1234`, `ffmpeg-1011`, `winldd-1007`) |
| launch probe: `chromium.launch()`, `newPage()`, `setContent`, `textContent`, `close()` | **succeeded** — `LAUNCHED 151.0.7922.34`, page text read back, clean close, exit 0 |

**So the honest finding is the opposite of a broken toolchain: a Playwright Chromium browser does
launch in this environment.** What was *not* observed is a **cold** acquisition — both the npm cache
and the browser cache were already populated on this machine, so nothing evidences that a fresh
machine could download either. That distinction matters and is not glossed: a verifier on a clean
machine may see a different result, and this record claims only what it saw.

**Why the dependency is still not added.** Four reasons, in order of weight:

1. **Browser-tier *content* is WS-10's scope, not WS-12's.** Adding `@playwright/test` to
   `devDependencies` with no browser test in the repository is precisely the phantom dependency this
   workstream was told not to leave: an install cost, an SBOM entry and an audit surface for WS-09
   buying nothing that runs.
2. **A stated command that does not run is worse than an absent one.** AC-30 is satisfied by commands
   that execute, and every command in §2 executes today from a clean checkout.
3. **Installing writes `node_modules/`, which is on the contract's own `writeBoundary.prohibitedPaths`
   and cannot be ignored from inside the narrowed boundary** (ADR-005 §5.3 raised exactly this and
   escalated rather than settled it). Keeping the dependency set empty means the question never has
   to be answered.
4. **It converts AC-30 from a zero-install proof into a network-dependent one** (§1), and on this
   machine the install only appeared instant because two caches happened to be warm.

**What WS-10 inherits, stated so the decision is theirs and not foreclosed:** the browser tier is
*feasible here*; the blocker is scope and boundary, not capability. If WS-10 adds it, the four items
above are the cost, and ADR-005 §5.1's requirement that `playwright.config.js` live under `tests/` and
be passed with `--config` still stands. Nothing in this workstream reopens or overrides ADR-005 §3 —
`npm test` is deliberately named so a browser tier can be added to it without renaming anything a
verifier has already cited.

---

## 5. AC-30 proof — an actually clean checkout

Not a claim about a clean checkout. A clean checkout.

### 5.1 How it was made

```
git worktree add --detach <temp-dir-outside-both-repos> c85a5ac
```

A detached worktree of the toolchain revision in a temporary directory outside `dino-dash-app` and
outside `D:/os-test/dino-dash`. Verified before running anything: `git rev-parse HEAD` →
`c85a5ac74771429bd6c9a3be62a4be58197ca98f`; **no `node_modules` directory**; `tests/.results/`
present and containing only its committed `.gitignore` placeholder. No install command was run there,
at any point.

### 5.2 The runs, with real exit codes

| Command | Exit | Observed |
| --- | ---: | --- |
| `npm test` | **0** | `tests 61 / pass 61 / fail 0 / cancelled 0 / skipped 0 / todo 0`, `duration_ms 469.5565`; wrote `tests/.results/unit-junit.xml` (7,149 B) |
| `npm run evidence:a11y` | **0** | 33 rows, 33 passed, 0 failed; `sourceRevision` resolved to `c85a5ac74771429bd6c9a3be62a4be58197ca98f`; wrote `a11y-contrast.json` (12,930 B) and `a11y-contrast.json.sha256` (digest `f9da70b7…3983e5` for that run) |
| `node tests/tools/static-server.mjs 4188` | — | `dino-dash: serving src/ at http://127.0.0.1:4188/`; `GET /` → `200 text/html; charset=utf-8`, 2,532 B; `GET /main.js` → `200 text/javascript; charset=utf-8` |
| `npm run perf:artifact` | **0** | 17 requests, 0 non-200, disk total = wire total |
| `npm run perf:simulation` | **0** | full WS-11 report, ends "No threshold was asserted. These are observations, not budgets." |

Nothing was installed. Nothing reached the network except loopback in the two server-backed steps.
The worktree was removed afterwards.

### 5.3 One real discrepancy the clean checkout exposed — line endings

`perf:artifact` reported **43,842 bytes over 17 requests** in the clean checkout, against WS-11 §8's
and WS-08 §3's **42,517**. The difference is **not** a change to `src/` — WS-12 modified nothing there.
It is `core.autocrlf=true` with **no `.gitattributes` in the repository**: files committed with LF are
checked out with CRLF on Windows, adding one byte per line. Directly measured: `src/index.html` is
2,477 B in the existing working tree and **2,539 B** in a fresh checkout of the same blob.

Consequences a verifier needs before reconciling numbers:

- **byte totals and any sha256 taken over `src/` files are checkout-dependent on Windows**, so
  WS-08's and WS-11's figures reproduce only in a working tree with LF on disk;
- the request *count* (17), the non-200 count (0) and the disk-total-equals-wire-total property are
  unaffected, and those are the load-bearing claims;
- the fix would be a repository-root `.gitattributes`. **That path is outside the narrowed write
  boundary and outside the contract's `allowedPaths`**, so — exactly as ADR-005 §5.3 handled the root
  `.gitignore` — it is **raised here and not created**. Carried as risk **R-02**.

### 5.4 The one thing this section cannot prove about itself

The transcript above was produced from a clean checkout of `c85a5ac`, which contains every file any
stated command reads or executes. **This document is committed on top of that revision and is the only
file in that second commit.** It adds no code, no script and no configuration; no command in §2 reads
it. A verifier repeating §5.1–§5.2 at the final revision is running byte-identical inputs. The
alternative — recording a proof of a revision that does not exist yet — is not available to any
workstream, and inventing the output would be worse than stating the ordering plainly, which is what
this paragraph does.

---

## 6. AC-12 and AC-14 — the stated *procedure*

AC-30 accepts "a stated command **or procedure**". The contrast half of AC-16/AC-17 has a command
(§3). AC-12 (keyboard-only journey) and AC-14 (focus visibility, order, no trap) are **behavioural in
a rendered browser** and this delivery has no browser tier, so they have a procedure. It is stated
here rather than being quietly folded into the command's claims.

**Preconditions.** A clean checkout. `npm start`, then `http://127.0.0.1:4173/` in a current
Chromium-based browser at 100% zoom. Record browser name and version. Keep a pointer device
physically unused throughout — this is the point of the exercise, not a formality.

**AC-12 — the whole journey by keyboard alone.** Perform twice, end to end:

1. `Tab` until the play area holds focus. Screenshot: the focus indicator must be visible.
2. `Space` — the run starts. Screenshot the running state.
3. `Space` and `Up Arrow` alternately, at least four jumps, at least one obstacle cleared.
4. Play into a cactus. Screenshot the run-end state.
5. `Space` — a new run starts from the run-end state, score reads zero.
6. Collide again.

Record every step that could not be completed without a pointer. **Expected count: zero.** A non-zero
count is the finding; it is not to be reconciled away.

**AC-14 — focus, in each of idle, running and run-end.** In each state press `Tab` repeatedly through
a full cycle, screenshot every focus stop, and record: (a) whether each stop shows a visible focus
indicator, (b) the order of stops, (c) that continuing to press `Tab` returns to the first stop, and
(d) that `Tab` never becomes unresponsive. The delivery has exactly one focusable element in the page
— `#dd-stage`, `tabindex="0"` — and the canvas is deliberately not focusable, so the expected cycle is
short and leaves the document through the browser chrome and returns. The focus indicator's colour
pair (`focus`/`shell`) is measured by §3 at **11.39:1 / 10.28:1 / 12.05:1** across the three
variations; the *measurement* is machine evidence, the *visibility* is what this step observes.

**What the automated tier already contributes, and what it does not.**
`tests/unit/source-hygiene.test.mjs` asserts *"AC-12: no pointer, mouse or touch handler exists"*,
*"AC-14: the play area is focusable and the canvas is not"* and *"AC-15: every key with an effect is
named in on-screen text"*. Those are **absence and structure checks over the source**. They cannot
observe a rendered focus ring or a completed journey, and they are not offered as AC-12 or AC-14
evidence. The JSON from §3 records this explicitly: `coverage` marks AC-12 `none` and AC-14 `partial`,
pointing here.

**Deposition.** AC-30 requires evidence recorded under `.development-os/evidence/` with `kind`,
`sha256` and `sourceRevision`. `.development-os/` is outside this workstream's write boundary
(AC-28), so WS-12 deposits nothing there; it produces artifacts with the fields that deposition needs.
WS-01 **B-02** records the reading under which those two criteria are consistent, and that reading is
not re-litigated here.

---

## 7. Risks carried, and open items

- **R-01 — the contrast evidence is declared-palette, not rendered-pixel.** AC-16 and AC-17 ask for
  measurements from rendered output. §3.1 states exactly how far the static check reaches and what
  backs it. Closing it needs ADR-005's browser tier, which is WS-10's. **Recorded gap, not a pass.**
- **R-02 — `core.autocrlf=true` and no `.gitattributes`** (§5.3). Byte totals and source digests are
  checkout-dependent on Windows; WS-08's and WS-11's figures reproduce only in an LF working tree. The
  fix is a root-level path outside the write boundary and is **raised, not created**.
- **R-03 — the `engines` floor is stated but not executed.** `>=20.11.0` is the first Node 20 carrying
  the built-in `junit` reporter. Everything in this document ran on **v22.23.2 only**. The CI matrix
  in §9 pins `20.11.0` and `22.x` precisely so the floor gets exercised — but that workflow has never
  run (§9). Until it does, the floor is a declaration, not a measurement.
- **R-04 — the JUnit totals are XML comments, not attributes** (§2.7). A parser requiring
  `tests=`/`failures=` on a `<testsuite>` element reads zero from this file. Element counts and the
  process exit code are correct and are what CI gates on.
- **R-05 — no cold acquisition of Playwright was observed** (§4). The launch succeeded from warm
  caches on this machine. Nothing here evidences that a fresh machine can download either the package
  or the browser build.
- **R-06 — `npm ci` is not part of any stated procedure.** `package-lock.json` exists and is
  authentic (`npm install --package-lock-only`, no `node_modules` created), but it pins an empty
  dependency set. It is committed so WS-09 has a concrete artifact to audit and so the shape is
  present if a later unit adds a dependency; **it is not required by any command in §2**.

## 8. Changed-file inventory (AC-28)

Everything WS-12 created or modified, and nothing else:

| Status | Path | Note |
| --- | --- | --- |
| added | `package.json` | `"type": "module"`, `engines`, six scripts, empty dependency sets |
| added | `package-lock.json` | `lockfileVersion` 3, empty dependency set (R-06) |
| added | `tests/a11y/contrast-evidence.mjs` | the accessibility evidence command |
| added | `tests/.results/.gitignore` | placeholder so the results directory exists in a clean checkout |
| modified | `tests/.gitignore` | `.results/` → `.results/*` plus a negation for the placeholder above |
| added | `.github/workflows/ci.yml` | see §9 |
| added | `docs/engineering/WS-12-delivery-review.md` | this file |

All seven lie inside `tests/`, `docs/`, `.github/`, `package.json`, `package-lock.json` — the narrowed
boundary of WS-01 §0. **Nothing under `src/`, `engineering/`, `.development-os/`, `DEVELOPMENT.md`,
`development-os.config.json`, or anywhere in `D:/os-test/dino-dash`, was created or modified.**
`git diff --check` on the staged set was clean.

### 8.1 Finding: `src/package.json` is now redundant — and is **not** deleted

WS-03 §7 note 1 created `src/package.json` containing `{"type":"module"}` because, without it, Node
resolves `src/**/*.js` as CommonJS and the unit tier cannot import the delivery at all. It also
recorded that the file "becomes redundant (harmlessly) if WS-12 sets `"type": "module"` at the root".

**WS-12 has set `"type": "module"` at the root, so that condition is now met, and the file is
redundant.** It is **not removed**: `src/` is sealed at WS-03 and this workstream changed nothing
there. Two facts for whoever eventually disposes of it:

- it is the one file under `src/` the browser never fetches (WS-11 §8 measures the 42 B difference
  between the `src/` disk total and the cold-load closure), so removing it changes no rendered byte;
- it is *harmless* rather than *inert*: as the nearest `package.json` to `src/**`, it is what Node
  actually resolves against. Removing it would leave the root declaration doing the same job — but
  that is a change to `src/`, and it needs whichever workstream owns `src/` at the time, not this one.

## 9. CI

`.github/workflows/ci.yml` — checkout, `actions/setup-node` at `20.11.0` and `22.x`, assert
`node_modules` is absent, `npm test`, `npm run evidence:a11y`, upload both result files plus the
sha256 sidecar as artifacts.

**It has never been executed.** No CI run exists for this repository at this revision, and the file's
own header says so. What is evidenced is that the two commands it runs were executed locally and from
a clean checkout (§5). Deliberately not in it: no install step (nothing to install), no browser tier
(§4), no performance job (§2.6). If a tier cannot run in CI, it is not in the workflow.

## 10. What ENG-12 did not do

- **Changed nothing under `src/`.** The delivery is sealed at WS-03. §8.1 records a redundancy and
  leaves the file in place.
- **Added no dependency, runtime or dev.** Both sets in `package.json` are empty and the lockfile
  pins nothing. No phantom dependency, no unused script, no command that does not run.
- **Wrote no test content.** Unit-tier tests are WS-03's and WS-10's; the two perf harnesses are
  WS-11's. WS-12 added one evidence *command*, which asserts a threshold that
  `src/render/palette.js` and the existing unit tier already declare, and computes nothing of its own.
- **Invented no threshold.** The only numbers this workstream asserts are 4.5 and 3, which are the
  contract's own AC-16 and AC-17 values. No performance budget, no coverage target, no timing bound.
- **Did not claim the browser tier.** §4 records that Playwright launches here and still explains why
  the dependency is absent. AC-16/AC-17's rendered-pixel half stays open as **R-01** for WS-10.
- **Did not create a root `.gitattributes` or a root `.gitignore`.** Both are outside the boundary;
  §5.3 raises the first as ADR-005 §5.3 raised the second.
- **Issued no verification disposition.** WS-12 records `not_applicable`. Only ENG-15 at WS-14 issues
  one, and nothing here anticipates it.
