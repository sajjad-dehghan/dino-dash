# WS-07 — Data, Analytics and AI: recorded not-applicable determination

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-07, owner role ENG-07, producer actor `actor-eng-07`, domain `data_analytics_ai` |
| Plan dependency | WS-02 (complete) |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `ae8895e1aacb28c675aa4c78ad23da7848fee1d2` |
| Disposition | `not_applicable` — **verified by scan and by driving the delivered trace under controlled clocks, not asserted** |
| Gate | **none.** No gate in `engineering/quality/gates.json` is owned by ENG-07; see section 4 |
| Authored | 2026-08-11 |

This record exists because `not_applicable` is a disposition, not an omission. Four workstreams name
WS-07 in their declared dependencies — WS-09, WS-10, WS-13 and WS-14 (`engineering/taskboard/workstreams.csv`
lines 10, 11, 14, 15) — and an absent record blocks two required-gate workstreams on nothing
(WS-01 **R-03**). It contains no analytics event, no telemetry hook, no pipeline, no transformation,
no dataset, no model, no feature store, and no scaffolding for any of them. It adds no
"analytics hook for later": doing so would breach AC-24 the moment it was wired to anything, and
would be uncontracted work behind the human `product_direction_or_priority` gate in either case.

---

## 1. The determination

**Unit 1 has no analytics, no telemetry, no data pipeline and no model of any kind. That is the
contract, not an oversight. WS-07 has no implementation work, and ENG-07 built none.**

The absence is written into the request from three independent directions, and each one is testable
rather than stylistic:

| Source | What it says | What it removes |
| --- | --- | --- |
| AC-24 | "Unit 1 makes no network request after the initial asset load, and remains fully playable with the network disabled" | Every collection endpoint. An analytics event that is never transmitted is not analytics |
| AC-22 / AC-23 | Records "are written to no persistent store and transmitted to no destination"; "Unit 1 persists nothing … no personal best, no score history, no preference, no identifier" | Every local accumulation surface. There is nothing for a pipeline to read on a later page load |
| AC-25 | "no device or player identifier anywhere in the interface or in the score trace" | Every unit of analysis above the single run. Section 5.3 |

The request's canonical non-goals text puts "any network call" and "any identity" for Unit 1 in the
**removed from scope, not deferred** list, and states that reopening any of them "is a new product
direction requiring the human `product_direction_or_priority` gate, not a delivery detail."

`engineering/governance/roles.json` gives ENG-07 the capabilities "design data pipelines", "implement
analytics contracts" and "evaluate model quality and data provenance". At this revision the first has
no source and no sink, the second has no consumer and no transport, and the third has no model.
Section 3 establishes each by measurement. The same role definition carries the prohibition
"hide model or data limitations" — section 5 is where that obligation is discharged, and it is the
part of this record that is genuinely ENG-07's rather than a restatement of an earlier workstream's.

WS-01 §1 pre-classified WS-07 as `not_applicable`, and `docs/architecture/unit-1-system-impact.md:72`
records the same. This document does not rely on either; it re-derives the conclusion from the
request and checks it against the delivered tree and the running modules.

**The applicable domain standard, and its position.** Unlike WS-06 — which recorded that no standard
covers `database_storage` — `engineering/standards/data-ai.md` exists and names four required
considerations. Each is recorded here rather than skipped:

| Required consideration | Position at `ae8895e` |
| --- | --- |
| data lineage and classification | One dataset exists: the in-page score trace (3.6). Its lineage is one write site, one read site, one construction site, all inside the page's JavaScript realm. Its classification is **no personal data** — no identity field exists to classify (AC-25; WS-04 §3.7 measured the identity surface at zero) |
| quality checks and reproducible transformations | There is one transformation, `score = floor(elapsedMs × 0.01)` (`src/game/score.js:12-15`), asserted by the existing unit tier (3.7). There is no ETL, no job, no schedule and no derived table to reproduce |
| model evaluation, provenance, drift, human oversight | **Vacuous — there is no model.** Section 3.4 measures the ML/AI token count at zero and disambiguates every occurrence of the word "model" in the repository |
| privacy-aware analytics contracts | **Vacuous — there is no analytics contract.** Section 3.2 measures the vendor and beacon token count at zero. The one field contract that exists (ADR-003) is a run-record shape, not an analytics contract; section 5 states the difference |

---

## 2. Scope of the check, and environment

Sections 3.2 to 3.5 are **static, source-level** checks of the tree at
`ae8895e1aacb28c675aa4c78ad23da7848fee1d2`. Section 5 is **dynamic**: it imports the delivered
`src/trace/score-trace.js`, `src/engine/clock.js` and `src/game/score.js` and drives them under
injected clocks. No browser was launched — the network-panel and storage-inspector observations
AC-22/AC-23/AC-24 name are WS-10's to produce under `GATE-AUTOMATED-TESTS`, and are recorded as
outstanding in section 6, not claimed here.

Environment: Windows 11, Git Bash (GNU grep), Node `v22.23.2`, no `node_modules`, no root
`package.json` and no lockfile at this revision (WS-12 has not recorded a run). All commands were run
from the repository root `D:/os-test/dino-dash-app` on branch `codex/evt-20260809-001`. Every command
is read-only except `node --test`, which executes existing test files and writes no artifact; the two
harnesses import delivered modules and write nothing.

**Scans this record does not repeat.** WS-04 §3.2–3.6 established the network-API and event-surface
position, WS-05 §3.7–3.8 the app-lifecycle position, and WS-06 §3.2–3.5 the storage position. Those
counts are cited where they matter and are not re-run here. What is new in this document is the
analytics/telemetry vendor sweep (3.2), the beacon and signal sweep (3.3), the ML/AI sweep and the
"model" disambiguation (3.4), the data-artifact and pipeline-tooling sweep (3.5), and the analytic
capacity measurements in section 5.

---

## 3. Commands run and their actual output

### 3.1 The revision under review

```
$ git rev-parse HEAD
ae8895e1aacb28c675aa4c78ad23da7848fee1d2

$ node --version
v22.23.2

$ find src -type f | wc -l
18

$ git ls-files | wc -l
78
```

### 3.2 Analytics and telemetry vendor tokens in `src/`: 34 tokens, 18 files, raw and comment-stripped

The comment stripper is the same one `tests/unit/source-hygiene.test.mjs` uses (block comments, HTML
comments, line comments), so the two agree by construction — the same approach WS-06 §3.2 took for
storage.

```
$ node <scratch>/analytics-scan.cjs        # walks src/, counts each token raw and after strip
files scanned: 18

--- analytics / telemetry vendor tokens ---
gtag  googletagmanager  google-analytics  analytics.js  segment  amplitude  mixpanel  posthog
sentry  datadog  plausible  umami  matomo  piwik  hotjar  clarity  fbq  fbevents  dataLayer
heap  fullstory  logrocket  newrelic  bugsnag  rollbar  appinsights  applicationinsights
snowplow  countly  pendo  intercom  launchdarkly  optimizely  ga(
                    ... every one of the 34: raw=0  after-comment-strip=0
TOTAL (34 tokens)       raw=  0  after-comment-strip=  0
```

**Zero analytics or telemetry vendor tokens in `src/` — zero even *raw*, before any comment
stripping, across 34 tokens and all 18 delivered files.** This is a stronger result than the storage
and network sweeps returned: WS-06 §3.2 found nine raw storage hits that survived only as
documentation of an absence, and WS-04 §3.3 found the same for network tokens. Here there is nothing
to strip. Not one of the thirteen named vendors, not one of the twenty-one others, appears anywhere —
not in a comment, not in a string, not in a URL, not in an identifier.

The two-character token `ga` was checked separately, because a substring match on it is meaningless:

```
$ grep -rFoi -- "ga" src/ | wc -l
37
$ grep -rnowiE "ga" src/
(no output)
```

**37 case-insensitive substring hits, zero of them a word.** All 37 are inside `game`, `gameState`,
`game.css` and similar. The Google Analytics global `ga` does not appear as an identifier. Recorded
because a naive scan of this token produces a false positive of exactly 37.

### 3.3 Beacon and telemetry-signal tokens: 25 tokens, and where the three raw hits are

```
--- telemetry signal / beacon tokens ---
track       raw= 1  after-comment-strip=0
sendBeacon  raw= 2  after-comment-strip=0
telemetry  analytics  beacon  trackEvent  navigator.sendBeacon  reportEvent  logEvent
pageview  pageView  metric  metrics  instrument  collector  ingest  PerformanceObserver
reportError  onerror  ErrorEvent  reportingObserver  Reporting-Endpoints  NEL  web-vitals  webVitals
                    ... all 23 others: raw=0  after-comment-strip=0
TOTAL (25 tokens)       raw=  3  after-comment-strip=  0
```

**Zero after stripping comments. Three raw hits, all three inside comments, and none of them a
telemetry call:**

```
$ grep -rn -iE "track|beacon" src/
src/game/simulation.js:24: * start mark, so the score tracks real time; only the physics step is clamped.
src/main.js:6: * `fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`,
src/trace/score-trace.js:10: * localStorage, no sessionStorage, no IndexedDB, no cookie, no fetch, no sendBeacon,
```

`track` is the English verb in a sentence about the score following elapsed time. The two `sendBeacon`
hits are the same two comment blocks WS-06 §3.3 and WS-04 §3.3 already identified — `src/main.js:5-7`
and `src/trace/score-trace.js:9-12` — which name the APIs **in order to state that the delivery does
not use them**. A raw grep cannot tell documentation of an absence from a use; the stripped count is
the one that answers the question.

Nothing beyond the classic beacon APIs is present either: no `PerformanceObserver`, no error-reporting
listener (`onerror`, `reportError`, `ErrorEvent`, `ReportingObserver`), no Network Error Logging, and
no web-vitals collection. The delivery has no path by which a measurement could leave the page even
accidentally, which is the same conclusion WS-04 reached from the network side and is recorded here
from the collection side.

### 3.4 ML / AI tokens: 46 tokens, and what "model" actually refers to

```
--- ML / AI tokens ---
tensorflow  tfjs  @tensorflow  onnx  .onnx  onnxruntime  tflite  .tflite  wasm  .wasm
WebAssembly  WebNN  webgpu  torch  pytorch  keras  sklearn  scikit  huggingface  transformers
llm  openai  anthropic  gpt  gemini  model  inference  infer(  embedding  embeddings  vector
neural  classifier  classify  predict  prediction  train  training  weights  checkpoint
tokenizer  softmax  feature-store  featureStore
                    ... all 43 of these: raw=0  after-comment-strip=0
gradient    raw= 1  after-comment-strip=0
dataset     raw= 2  after-comment-strip=2
TOTAL (46 tokens)       raw=  3  after-comment-strip=  2
```

**Zero ML or AI tokens in `src/`.** No `tensorflow`, no `onnx`, no `.onnx`, no `.tflite`, no `wasm`,
no `WebAssembly`, no `WebNN`, no `webgpu`, no `inference`, no `embedding`, no `predict`, no `train`,
no `weights`, no `tokenizer`. Two tokens produce hits and neither is machine learning:

- **`gradient` — 1 raw hit, 0 after stripping.** `src/styles/game.css:8`, inside the comment
  "Backing plates are fully opaque: no rgba(), no opacity, no gradient anywhere behind" — a CSS
  paint gradient, named in order to forbid it under AC-16. Not an optimizer gradient.
- **`dataset` — 2 hits, both surviving the strip, both the DOM `HTMLElement.dataset` property:**

  ```
  src/main.js:39        root.dataset.gameState = to;
  src/render/hud.js:38  root.dataset.backgroundVariation = variation.id;
  ```

  These are `DOMStringMap` writes that set `data-game-state` and `data-background-variation`
  attributes on an element — the state signal and background enumeration ADR-004 specifies as
  observability affordances for AC-14/AC-16/AC-17 evidence. They are a **DOM attribute API, not a
  training dataset**. Recorded explicitly because `dataset` is the one token in this sweep that a
  reader skimming a scan output could misread as data-science tooling.

**The word "model": disambiguated exhaustively, because the task turns on it.**

```
$ grep -rFoi model src/   | wc -l
0
$ grep -rFoi model tests/ | wc -l
0
```

**The word does not appear in `src/` at all, in any case, and does not appear under `tests/`
either.** Every occurrence in the repository outside `.development-os/` was enumerated
(`git ls-files -z | xargs -0 grep -inoE ".{0,34}model.{0,34}"`) and falls into exactly four senses,
none of them a machine-learning model:

| Sense | Where | Count |
| --- | --- | --- |
| **State model** — the three-state machine ADR-002 specifies | `ADR-002-…-state-model-and-module-layout.md` (title, §26, §44, §81); `WS-01-coordination.md:93,125`; `WS-03-implementation.md:64` | 7 |
| **Data model** — schema/ownership sense | `engineering/database/database-readiness.md:3`; `WS-06-storage-review.md:42,418` | 3 |
| **Threat model** — security sense | `engineering/security/threat-model.md:1`; `engineering/standards/security.md:5` (threat modeling); `development-os.config.json:149,585`; `engineering/schemas/development-os-config.schema.json:99,103`; `roles.json:138` | 8 |
| **Auth model / lifecycle model / no-model** — prose in prior reviews, and this record's own domain vocabulary | `WS-04-backend-review.md:368,447`; `WS-05-client-review.md:505`; `WS-01-coordination.md:62`; `unit-1-system-impact.md:72`; `roles.json:90,108,113` and the mirrored strings in `development-os.config.json:101,119,124`; `engineering/standards/data-ai.md:7` | 12 |

The last group deserves the sharpest note: the three most model-sounding strings in the repository —
"model persistent data", "evaluate model quality and data provenance", "hide model or data
limitations" — are the **capability and prohibition strings of ENG-06 and ENG-07 themselves** in
`engineering/governance/roles.json`. They describe what these role boundaries may and may not do.
They are not evidence that a model exists. Nothing in the delivery loads, runs, trains, evaluates,
serves or ships one.

### 3.5 Repository level: no data artifact, and no pipeline tooling

```
$ git ls-files | grep -inE "analytic|telemetr|tracking|gtag|segment|amplitude|mixpanel|posthog|sentry|datadog|matomo|plausible|umami|hotjar|clarity|\.onnx|\.tflite|\.pb$|\.h5$|\.pkl|\.pt$|\.safetensors|\.wasm|model|notebook|\.ipynb|\.parquet|\.avro|\.csv$|dbt|airflow|dagster|spark"
11:docs/architecture/decisions/ADR-002-unit-1-rendering-state-model-and-module-layout.md
40:engineering/security/threat-model.md
50:engineering/taskboard/workstreams.csv

$ ls -d database migrations infrastructure services app apps packages
ls: cannot access 'database': No such file or directory
   … all seven: No such file or directory

$ ls -l package.json package-lock.json
ls: cannot access 'package.json': No such file or directory
ls: cannot access 'package-lock.json': No such file or directory

$ git ls-files .github
(no output)
```

**Three matches across 78 tracked files, and all three are false positives on the filename:** the
state-model ADR, the threat-model document, and the taskboard CSV (matched on `\.csv$` and on the
literal words "Data, Analytics, and AI" in the WS-07 row — that row is this workstream's own
scheduling entry). Zero model weight files of any format (`.onnx`, `.tflite`, `.pb`, `.h5`, `.pkl`,
`.pt`, `.safetensors`), zero `.wasm`, zero notebooks, zero columnar data files (`.parquet`, `.avro`),
and zero orchestration or transformation tooling (`dbt`, `airflow`, `dagster`, `spark`). There is no
dependency manifest at all at this revision, so there is not even a place where an analytics SDK could
be declared. None of the seven contract-allowed-but-not-to-be-created top-level directories exists
(WS-01 §0, **B-03**), and this workstream created none.

### 3.6 What data the delivery produces at all

**Exactly one dataset exists, and it is three fields wide.** ADR-003 §1 fixes it; WS-06 §3.5 traced
its lifetime through the source and is not repeated. Read off the delivered module directly:

```
$ node <scratch>/analytic-capacity.mjs   # imports src/trace/score-trace.js, src/engine/clock.js, src/game/score.js
RECORD_FIELDS                    : endedAt,score,sessionLengthMs
field count                      : 3

--- 4. shape and size of one record ---
keys sorted            : endedAt,score,sessionLengthMs
JSON bytes             : 74
types                  : score=number endedAt=string sessionLengthMs=number
nested values          : 0
```

| Field | Type | Unit | Clock |
| --- | --- | --- | --- |
| `score` | integer | points | none — derived from `sessionLengthMs`' source (`src/game/score.js:12-15`, `floor(elapsedMs × 0.01)`) |
| `endedAt` | string, ISO-8601 UTC with literal `Z` | instant | **wall clock** (`new Date().toISOString()`) |
| `sessionLengthMs` | integer | milliseconds | **monotonic** (`performance.now()` deltas, AC-21) |

That is the whole of it. One record per `running → run-end` transition, appended to an array in
module scope, discarded when the page's JavaScript realm is torn down, reaching no store and no
destination. There is no event stream, no session record, no funnel, no page-view, no error report,
no performance sample, and no user record — because there is no user record to have.

### 3.7 The existing automated tier runs green at this revision

```
$ node --test tests/unit/*.test.mjs
1..61
# tests 61
# suites 0
# pass 61
# fail 0
# duration_ms 225.8487
```

Sixty-one of sixty-one pass at `ae8895e` — the same count WS-05 §3.10 recorded at `290f45c`, three commits earlier,
unchanged by the three commits since.

### 3.8 Coverage observation for WS-10: no test asserts the analytics absence

```
$ grep -rniE "analytic|telemetr|beacon|gtag|segment|amplitude|mixpanel|posthog|sentry|datadog|track\(|dataLayer|tensorflow|onnx|wasm|model|inference|embedding" tests/
tests/unit/source-hygiene.test.mjs:84:    'sendBeacon',
```

**The only analytics-adjacent token anywhere under `tests/` is `sendBeacon`, and it appears as one
entry in the eight-token forbidden list of the AC-24 network assertion** (`source-hygiene.test.mjs:80-90`:
`fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `importScripts`, `http://`,
`https://`). That list catches an analytics beacon only if the vendor uses one of those transports —
which is the common case, but not the only one. **No test asserts against a vendor name, against
`dataLayer`, or against any ML/AI token.** Section 3.2 checked 34 vendor tokens and 3.4 checked 46
ML/AI tokens; the suite checks none of them by name.

Handed to WS-10 as a coverage observation, **not filed as a defect** — nothing in `src/` uses any of
them today, and the AC-24 transport assertion already closes the path that would make a vendor
snippet functional. This is the same shape of note WS-06 recorded as its **L-06**.

---

## 4. `GATE-*` ownership: ENG-07 owns none

```
$ node -e "const g=require('./engineering/quality/gates.json');
  console.log('total gates:', g.gates.length);
  console.log('gates owned by ENG-07:', g.gates.filter(x=>x.ownerRole==='ENG-07').length,
              JSON.stringify(g.gates.filter(x=>x.ownerRole==='ENG-07')));
  console.log('domains:', g.gates.map(x=>x.domain).join(', '));"
total gates: 15
gates owned by ENG-07: 0 []
domains: architecture, code, testing, security, supply_chain, database, api, infrastructure,
         privacy, accessibility, performance, reliability, seo, documentation, verification
```

**Fifteen gates exist. ENG-07 owns zero of them, and none is engaged by this workstream.** There is no
`GATE-DATA`, no `GATE-ANALYTICS`, no `GATE-MODEL` and no `GATE-AI` in the file — the fifteen domains
listed above are the complete set, and none of them is `data_analytics_ai`.

```
$ node -e "const r=require('./engineering/governance/roles.json');
  const g=require('./engineering/quality/gates.json');
  const owners=new Set(g.gates.map(x=>x.ownerRole));
  console.log('roles defined:', r.length);
  console.log('roles owning no gate:', r.map(x=>x.id).filter(id=>!owners.has(id)).join(', '));"
roles defined: 15
roles owning no gate: ENG-05, ENG-07, ENG-12
```

WS-07 therefore sits with WS-05, not with WS-04 or WS-06: those two each had a `required: false` gate
that exists, is owned, and could be recorded as inapplicable. **Here there is no gate to record at
all.** `not_applicable` is used because the contract's own non-goals remove the work — never to route
around a gate, because there is no gate to route around. No required gate is affected: WS-01 §1
independently verifies that all seven `required: true` gates (ARCHITECTURE, CODE-REVIEW,
AUTOMATED-TESTS, SECURITY, SUPPLY-CHAIN, DOCUMENTATION, INDEPENDENT-VERIFICATION) land on workstreams
with real work, and none of them is ENG-07's.

The nearest gate to this domain, `GATE-PRIVACY-COMPLIANCE` (data classification; retention and
compliance review), is **owned by ENG-09 and is `required: false`**. ENG-07 does not claim it, does
not pre-empt it, and does not pre-answer it. What this record contributes to whoever does engage it is
one measured fact: **the delivery collects no personal data, because it collects no data that leaves
the page and carries no field that names or distinguishes a person or a device** (AC-25; the identity
surface was measured at zero by WS-04 §3.7).

ENG-07 **owns no acceptance criterion** — WS-01 §3 assigns all 30 elsewhere. Nothing in this document
is a disposition for the delivery; only ENG-15 at WS-14 issues one.

---

## 5. Analysis: what the score trace can and cannot support

**This section designs nothing.** It records measured properties of the one dataset that exists,
because `roles.json` forbids ENG-07 to "hide model or data limitations" and because ADR-003's preamble
names this record as "the one Unit 1 artifact a later unit consumes". Proposing an event schema, a
metric definition, a warehouse table or a collection endpoint here would scaffold uncontracted work,
which WS-01 §0 and **B-03** prohibit and which the request's non-goals put behind the human
`product_direction_or_priority` gate. WS-06 §5 analysed this same record as a **persistence** subject;
what follows analyses it as an **analytical** subject, which is a different question and reaches
different conclusions. It is not a design and must not be cited as one.

The subject is `{ score, endedAt, sessionLengthMs }` — ADR-003 §1, frozen names, types and units under
the §6 evolution rule.

### 5.1 What this dataset can support

Within the lifetime of one page in one browser tab, and nowhere else:

- **Counting runs.** `window.dinoDash.getScoreTrace().length` is the number of runs completed since
  the page loaded. Exact, no sampling, no loss.
- **The distribution of `score` and of `sessionLengthMs` across those runs.** Both are non-negative
  integers guaranteed at the write by `toNonNegativeInteger` (`src/trace/score-trace.js:20-23`), which
  collapses `NaN`, `Infinity` and every negative to `0`. No cleaning pass is needed and no null case
  exists.
- **Within-session sequence effects, by index.** Index *n* is the *(n+1)*-th run of this page session
  (ADR-003 §3). Whether run 5 scores higher than run 1 is answerable from the array position alone,
  and — importantly — **only** from the array position, not from any field. See 5.2.
- **A single relationship between the two numeric fields**, with a measured caveat WS-06 §3.8
  quantified: `score ≈ floor(sessionLengthMs / 100)` holds for 99.406% of records and is off by
  exactly one point for the remaining 0.594%, because `score` floors the raw fractional elapsed value
  while `sessionLengthMs` rounds it. Cited, not re-measured. The analytical consequence is that
  `score` and `sessionLengthMs` are **one fact recorded twice**: a scatter of one against the other is
  a straight line with rounding noise, and carries no information that either field alone does not.

That is the complete list. There is no fourth analysable quantity in this delivery.

### 5.2 What it cannot support, and why each limit is structural

Each of these was measured by driving the delivered modules under injected clocks
(`<scratch>/analytic-capacity.mjs`), not inferred from reading the source.

**No identifier of any kind — so records are not individuated.** The record carries no run id, no row
id, no session id, no natural key. Two runs of the same duration produce byte-identical records:

```
--- 3. is any record distinguishable from another? ---
device A record : {"score":120,"endedAt":"2026-08-11T09:00:12.000Z","sessionLengthMs":12000}
device B record : {"score":120,"endedAt":"2026-08-11T09:00:12.000Z","sessionLengthMs":12000}
field-for-field identical : true
any field naming device, player or session : 0
```

Two records with identical field values are indistinguishable **and legal**. Consequences that land on
any future analysis: no deduplication is possible (a duplicate and a genuine repeat are the same
bytes), no record can be referenced, corrected or retracted individually, and no join key exists to
attach anything to a run. This is AC-25 working exactly as written, not a modelling oversight.

**No device marker — so two traces cannot be merged, only concatenated.** `navigator` is never read
(WS-04 §3.7 measured `navigator` and `userAgent` at zero raw hits in `src/`), so there is no device id,
user agent, locale or screen size. Records produced on two machines carry nothing to partition,
attribute or order them by relative to each other except `endedAt` — and `endedAt` is the field the
next two points disqualify for exactly that purpose.

**No schema version — so a record cannot state which contract produced it.**
`window.dinoDash.version === 1` (`src/main.js:95`) is the **accessor's** version, and ADR-003 §4 says
so in terms: "not the record's". Nothing inside the record identifies its vintage. In page memory this
costs nothing, since every record in the array was written by the code currently running. It becomes
load-bearing the moment records outlive their writer: after ADR-003 §6 rule 3 lets a later unit add a
field, the only available versioning is **inference from which keys are present**, which is sound only
while every change is strictly additive — which is what rules 3 and 5 already require.

**Two clocks, and they cannot be combined.** This is the limitation most likely to be discovered by
being wrong, so it was measured rather than argued. A five-run page session was driven through the
delivered `createClock` and `createScoreTrace` with an injected monotonic source and an injected wall
clock, with the operating-system clock moved back one hour **during run 4** — AC-21's own procedure:

```
--- 1. endedAt minus sessionLengthMs is not the run start instant ---
run  sessionLengthMs  endedAt                   derived start            true start                error
1    12000            2026-08-11T09:00:12.000Z  2026-08-11T09:00:00.000Z 2026-08-11T09:00:00.000Z  0 ms
2    41000            2026-08-11T09:00:56.000Z  2026-08-11T09:00:15.000Z 2026-08-11T09:00:15.000Z  0 ms
3    7500             2026-08-11T09:01:05.500Z  2026-08-11T09:00:58.000Z 2026-08-11T09:00:58.000Z  0 ms
4    63000            2026-08-11T08:02:12.500Z  2026-08-11T08:01:09.500Z 2026-08-11T09:01:09.500Z  -3600000 ms
5    9000             2026-08-11T08:02:23.500Z  2026-08-11T08:02:14.500Z 2026-08-11T08:02:14.500Z  0 ms
```

Run 4's `sessionLengthMs` is **correct** — 63,000 ms, exactly the real duration, which is AC-21
working as designed. Its `endedAt` moved with the system clock, which ADR-003 §2 records as
intentional. But `endedAt − sessionLengthMs`, which reads like the obvious way to recover when a run
began, is wrong by **exactly −3,600,000 ms**: the two values come from different clocks, and
subtracting a monotonic duration from a wall-clock instant yields the true start plus the skew. **A
derived `startedAt` column computed that way passes every test written on an undisturbed clock and is
wrong precisely when the clock moved** — the one circumstance in which anyone would check it. There is
no run-start instant in this dataset and none can be derived from it.

**`endedAt` is also unsound as an ordering key.** The same session, sorted on `endedAt`:

```
--- 2. endedAt as an ordering key, against the true append order ---
append order               : 1 2 3 4 5
order after sort on endedAt: 4 5 1 2 3
records out of chronological position: 5 of 5
```

**All five of five records land out of true chronological position.** The array had correct order for
free (append order is chronological, ADR-003 §3); sorting on the only temporal field in the record
destroys it. Any later store that treats `endedAt` as its sort key, its partition key or its
watermark inherits this silently.

**`endedAt` carries no local offset, irrecoverably.** ADR-003 §1 states it and this record only
confirms the analytical consequence: no time-of-day, day-of-week or timezone analysis is possible from
this field. "Do people play more in the evening" is not answerable, and cannot be made answerable by
reformatting — it needs a new field. ADR-003's open interpretation risk on the `Z` designator is
carried here as **L-04**, not settled.

### 5.3 "How many people play" is unanswerable by construction

Stated plainly, because it is the question anyone reaching for this dataset will ask first:

```
--- 5. what a full trace can and cannot count ---
records in this page session          : 5
runs countable                        : 5
distinct page sessions countable      : not derivable from records (no session field)
distinct devices countable            : not derivable from records (no device field)
distinct people countable             : not derivable from records (no identity field, AC-25)
records reachable after page unload   : 0 (no persistence path, AC-22/AC-23)
records reachable off-device          : 0 (no transport, AC-24)
```

The unit of analysis this dataset supports is **the run**, and only the run. It supports no unit above
that. Not the player: AC-25 removes every identifying field. Not the device: no device marker exists.
Not the page session: the array's existence delimits a page session, but no *record* carries a session
field, so the moment records are separated from the array that held them the session boundary is lost.
Not the install, the visit, or the day.

And the dataset is unreachable in any case. It reaches no store (AC-22/AC-23) and no destination
(AC-24), so no aggregate over more than one live page in one browser tab can be computed at all — not
approximately, not with modelling, not with any technique. There is no sampling error to characterise,
because there is no sample. **Counting the people who play Dino Dash is not a hard measurement problem
in Unit 1; it is an impossible one, and it is impossible on purpose.**

**This is a consequence of the owner's decisions, not a gap to fix.** No identity (AC-25), no network
(AC-24) and no persistence (AC-22/AC-23) are the product owner's recorded scope for this unit, listed
in the request's canonical non-goals text as *removed from scope, not deferred*. ENG-07 records the
analytical consequence and stops there. Adding an anonymous install id, a hashed device fingerprint, a
first-party counter or any other "privacy-friendly" measurement affordance would reopen a non-goal,
and reopening one is "a new product direction requiring the human `product_direction_or_priority`
gate, not a delivery detail." **This record does not propose one and must not be cited as having
identified a deficiency.** If a later unit needs an audience number, that need is an input to that
unit's own product decision, taken by the owner, not a defect in this one.

### 5.4 What this analysis is not

It is not an event schema, not a metric catalogue, not a taxonomy, not a collection design, not a
sampling plan, not a retention policy, and not a recommendation to instrument anything. It does not
decide what a later unit should measure or how. Nothing here pre-clears a non-goal.

---

## 6. Known risks and limitations

- **L-01 — the scans are static and cover `src/`, `tests/` and the tracked file list.** Zero vendor
  tokens in source is what a source-level review can establish, and combined with WS-04's network
  finding it is strong evidence that nothing is collected or transmitted. It is **not** the browser
  network panel. AC-24's stated verification is a runtime observation and belongs to WS-10 under
  `GATE-AUTOMATED-TESTS`. ENG-07 does not claim it and does not pre-empt it.
- **L-02 — a token scan cannot prove the absence of an unnamed vendor.** 34 vendor tokens, 25 signal
  tokens and 46 ML/AI tokens were checked; a snippet from a vendor named in none of the three lists
  would not be caught by name. What closes that residual gap is not this scan but the structural
  finding it sits on: **there is no transport**. WS-04 §3.2–3.5 measured zero network APIs, zero
  external module specifiers and zero cross-origin references in `src/index.html`, so a collection
  snippet would have nowhere to send to.
- **L-03 — the measurements in section 5 are driven with injected clocks, not with a moved
  operating-system clock.** `createClock` and `createScoreTrace` both take their time functions by
  injection (ADR-003 §2), which is the substitute WS-01 **B-05** anticipates if OS clock changes are
  not permitted in the execution environment. **It is disclosed as a substitute and must not be read
  as the manual AC-21 procedure.** It demonstrates the arithmetic consequence of two clocks; it does
  not discharge AC-21, which is WS-02's criterion with WS-10 producing the evidence.
- **L-04 — the `endedAt` `Z` interpretation risk is carried, not closed.** ADR-003's migration note
  raises it (AC-19 says "explicit UTC offset"; a verifier requiring numeric `±HH:MM` would find `Z`
  insufficient), WS-04 §6 and WS-06 **L-04** carry it. ENG-07 has no authority to settle it and adds
  only the analytical note in 5.2 that no reformatting recovers a local offset that was never
  captured.
- **L-05 — the 0.594% `score`/`sessionLengthMs` divergence cited in 5.1 is WS-06's measurement on
  synthetic swept values, not gameplay.** It characterises the rounding relationship between the two
  fields; it is not an observed rate in real play. Cited with its source's limitation intact.
- **L-06 — no test asserts against any analytics vendor or ML token** (3.8). Handed to WS-10 as a
  coverage observation, not a defect: nothing in `src/` uses any of them, and the existing AC-24
  transport assertion already closes the functional path.
- **L-07 — `not_applicable` is scoped to Unit 1 at this revision.** It is not a standing judgement
  that Dino Dash will never have analytics or a model. Units 2 through 5 are not contracted and
  nothing here pre-clears them. Equally, nothing here is a finding that Unit 1 *should* have had
  measurement.
- **L-08 — the privacy obligation this workspace carries open is not touched by this record.** The
  request records that no consent, retention, deletion or anonymization approach exists anywhere in
  the workspace, and that Units 3 and 4 introduce a named friend group's data. Unit 1 collects no
  personal data (section 4), which reduces nothing about that open obligation and closes none of it.
  `GATE-PRIVACY-COMPLIANCE` is ENG-09's.

---

## 7. What ENG-07 did not do

- **No analytics, no telemetry, no event, no beacon — and no hook "for later".** Not one line of
  instrumentation was added, disabled, feature-flagged or stubbed. A dormant collection path is still
  a collection path, and AC-24 forbids the transport that would make it work.
- **No model of any kind, and no inference surface.** No bundled weights, no runtime, no WebAssembly
  module, no difficulty predictor, no bot, no "adaptive" anything.
- **No data pipeline, no schema, no metric definition, no dataset, no feature store, and no
  scaffolding for any of them.** No `database/`, `migrations/`, `infrastructure/`, `services/`,
  `app/`, `apps/` or `packages/` directory was created — all are contract-allowed but explicitly "not
  to be created" per WS-01 §0, and creating one would inflate the AC-28 inventory with a system that
  does not exist.
- **Nothing was built "for Unit 3".** Section 5 analyses the shape that already exists and proposes no
  event taxonomy, no identifier scheme, no aggregation and no collection endpoint.
- **No identifier was proposed, not even an anonymous one.** No install id, no hashed device
  fingerprint, no first-party counter. Section 5.3 records that audience measurement is impossible in
  Unit 1 and records that as the owner's decision, not as a deficiency to remedy.
- **No change to any file under `src/` or `tests/`.** WS-07 is a review. The scans were read-only; the
  Node invocations imported delivered modules and executed existing test files, and wrote no artifact.
- **No verification disposition for the delivery.** WS-07 records `not_applicable` for its own run
  only. Only ENG-15 at WS-14 issues the delivery's disposition.
- **No product decision, and no reopening of a non-goal.** Scope, priority, risk acceptance and final
  user-visible acceptance belong to the human product owner.
- **No write outside the boundary.** This workstream created exactly one file,
  `docs/engineering/WS-07-data-review.md`. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in the product workspace
  `D:/os-test/dino-dash`, was created or modified.
