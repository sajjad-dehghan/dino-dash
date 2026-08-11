# WS-06 — Database and Storage: recorded not-applicable determination

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-06, owner role ENG-06, producer actor `actor-eng-06`, domain `database_storage` |
| Plan dependency | WS-02 (complete) |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `963cf74a14813b3f8ce0e9a2fadca5eaaf471d48` |
| Disposition | `not_applicable` — **verified by scan and by driving the delivered trace module, not asserted** |
| Gate | `GATE-DATABASE` (ENG-06, `required: false`) — not engaged; see section 4 |
| Authored | 2026-08-11 |

This record exists because `not_applicable` is a disposition, not an omission. WS-09 (**D-09**) and
WS-10 declare WS-06 in their dependencies, and an absent record blocks two required-gate workstreams
on nothing (WS-01 **R-03**). It contains no schema, no migration, no storage layer, no ORM, no
backup or capacity plan, and no scaffolding for any of them.

---

## 1. The determination

**Unit 1 has no database and no persistence of any kind. That is the contract, not an oversight.
WS-06 has no implementation work, and ENG-06 built none.**

The absence is written into the request three times over, and each statement is testable rather than
stylistic:

| Source | What it says |
| --- | --- |
| `DEVREQ-EVT-20260809-001` non-goals | For Unit 1, "persistence of any kind" is a **non-goal — removed from scope, not deferred**; reopening it requires the human `product_direction_or_priority` gate |
| AC-22 | Records "accumulate in page memory for the lifetime of the page session … are discarded when the page unloads. They are written to no persistent store and transmitted to no destination" |
| AC-23 | "Unit 1 persists nothing. After playing any number of runs, reloading the page returns the game to a state indistinguishable from a first visit: no personal best, no score history, no preference, no identifier" |

ADR-003 §3 fixes the mechanism: discard on unload is "by construction, not by cleanup … there is no
persistence path to clear", and it explicitly instructs that **no** `unload`/`beforeunload` handler be
added, because clearing an array with no persistence path clears nothing and would disqualify the page
from the back/forward cache.

`roles.json` gives ENG-06 the capabilities "design schemas and migrations", "optimize queries and
indexes" and "plan backup and restore". At this revision the first has nothing to model, the second
has no query engine, and the third has no durable byte to restore. Section 3 establishes each by
measurement.

WS-01 §1 pre-classified WS-06 as `not_applicable`. This document does not rely on that
classification; it re-derives the conclusion from the request and then checks it against the
delivered tree and the running module.

One structural note: `engineering/standards/` contains eight standards (`backend-api`, `data-ai`,
`delivery`, `frontend`, `observability`, `platform-network`, `security`, `testing`) and **none of them
covers `database_storage`**. There is no domain standard for this workstream to discharge, applicable
or otherwise. Recorded so ENG-15 does not look for one.

---

## 2. Scope of the check, and environment

Sections 3.2 to 3.4 are **static, source-level** checks of the tree at
`963cf74a14813b3f8ce0e9a2fadca5eaaf471d48`. Sections 3.6 and 3.7 are **dynamic**: they import and
drive the delivered `src/trace/score-trace.js` in Node and reproduce `src/main.js`'s accessor
installation verbatim. No browser was launched — the runtime storage-inspector and network-panel
observations AC-22/AC-23 name are WS-10's to produce under `GATE-AUTOMATED-TESTS`, and are recorded
as outstanding in section 6, not claimed here.

Environment: Windows 11, Git Bash (GNU grep), Node `v22.23.2`, no `node_modules` and no root
`package.json` at this revision (WS-12 has not recorded a run). All commands were run from the
repository root `D:/os-test/dino-dash-app` on branch `codex/evt-20260809-001`. Every command is
read-only except `node --test`, which executes existing test files and writes no artifact; the two
harnesses import delivered modules and write nothing.

---

## 3. Commands run and their actual output

### 3.1 The revision under review

```
$ git rev-parse HEAD
963cf74a14813b3f8ce0e9a2fadca5eaaf471d48

$ node --version
v22.23.2

$ find src -type f | wc -l
18

$ git ls-files | wc -l
77
```

### 3.2 Storage API call sites in `src/`: raw versus comment-stripped, 35 tokens, 18 files

The comment stripper is the same one `tests/unit/source-hygiene.test.mjs` uses (block comments, HTML
comments, line comments), so the two agree by construction.

```
$ node <scratch>/storage-scan.cjs        # walks src/, counts each token raw and after strip
files scanned: 18
localStorage        raw= 2  after-comment-strip=0
sessionStorage      raw= 2  after-comment-strip=0
indexedDB           raw= 1  after-comment-strip=0
IndexedDB           raw= 1  after-comment-strip=0
openDatabase        raw= 0  after-comment-strip=0
document.cookie     raw= 1  after-comment-strip=0
cookie              raw= 2  after-comment-strip=0
caches              raw= 0  after-comment-strip=0
CacheStorage        raw= 0  after-comment-strip=0
cacheStorage        raw= 0  after-comment-strip=0
navigator.storage   raw= 0  after-comment-strip=0
StorageManager      raw= 0  after-comment-strip=0
showSaveFilePicker  raw= 0  after-comment-strip=0
showOpenFilePicker  raw= 0  after-comment-strip=0
showDirectoryPicker raw= 0  after-comment-strip=0
getDirectory        raw= 0  after-comment-strip=0
FileSystemHandle    raw= 0  after-comment-strip=0
createWritable      raw= 0  after-comment-strip=0
OPFS                raw= 0  after-comment-strip=0
requestFileSystem   raw= 0  after-comment-strip=0
webkitStorageInfo   raw= 0  after-comment-strip=0
localforage         raw= 0  after-comment-strip=0
Dexie               raw= 0  after-comment-strip=0
PouchDB             raw= 0  after-comment-strip=0
sqlite              raw= 0  after-comment-strip=0
WebSQL              raw= 0  after-comment-strip=0
FileReader          raw= 0  after-comment-strip=0
createObjectURL     raw= 0  after-comment-strip=0
Blob                raw= 0  after-comment-strip=0
serviceWorker       raw= 0  after-comment-strip=0
CacheAPI            raw= 0  after-comment-strip=0
window.name         raw= 0  after-comment-strip=0
history.pushState   raw= 0  after-comment-strip=0
replaceState        raw= 0  after-comment-strip=0
storage             raw= 0  after-comment-strip=0
TOTAL               raw= 9  after-comment-strip=0
```

**Zero storage API call sites in `src/` after stripping comments — nine raw hits, all nine inside
comments, across 35 tokens and all 18 delivered files.** Twenty-six of the thirty-five tokens do not
appear even in a comment: no Cache Storage, no `navigator.storage`, no File System Access API, no
OPFS, no legacy WebSQL, no `FileReader`/`Blob`/object URL, no service worker, and none of the four
common client-storage libraries. The three side-channel persistence tricks that a naive scan misses —
`window.name`, `history.pushState`, `history.replaceState` — are also at zero.

### 3.3 Where the nine raw hits are

```
$ grep -rnoE "localStorage|sessionStorage|indexedDB|IndexedDB|document\.cookie|cookie" src/ | sort
src/main.js:6:localStorage
src/main.js:6:sessionStorage
src/main.js:7:document.cookie
src/main.js:7:indexedDB
src/trace/score-trace.js:10:IndexedDB
src/trace/score-trace.js:10:cookie
src/trace/score-trace.js:10:localStorage
src/trace/score-trace.js:10:sessionStorage
```

Two files, three lines, and both blocks name these APIs **in order to state that the delivery does not
use them** — `src/main.js:5-7` and `src/trace/score-trace.js:9-12`. A raw grep therefore cannot tell
documentation of an absence from a use; 3.2 is the count that answers the question. (WS-04 §3.3
recorded the same discrepancy for the network tokens; it is the same two comment blocks.)

### 3.4 Repository level: no database artifact, and no directory to hold one

```
$ git ls-files | grep -inE "\.sql$|\.db$|\.sqlite|\.ddl$|schema|migration|seed|dump|backup|prisma|knex|sequelize|typeorm|drizzle|flyway|liquibase|alembic"
33:engineering/schemas/development-os-config.schema.json
34:engineering/schemas/development-request.schema.json
35:engineering/schemas/development-sync-receipt.schema.json
36:engineering/schemas/engineering-plan.schema.json
37:engineering/schemas/engineering-result.schema.json
38:engineering/schemas/engineering-workstream-run.schema.json

$ ls -d database migrations infrastructure services app apps packages
ls: cannot access 'database': No such file or directory
ls: cannot access 'migrations': No such file or directory
ls: cannot access 'infrastructure': No such file or directory
ls: cannot access 'services': No such file or directory
ls: cannot access 'app': No such file or directory
ls: cannot access 'apps': No such file or directory
ls: cannot access 'packages': No such file or directory
```

**Six matches across 77 tracked files, and all six are JSON Schema files for the development-OS
records — not data schemas.** Zero `.sql`, `.ddl`, `.db`, `.sqlite`, zero seed or dump file, zero
migration directory, and zero ORM or migration-tool config (`prisma`, `knex`, `sequelize`, `typeorm`,
`drizzle`, `flyway`, `liquibase`, `alembic`). None of the seven contract-allowed-but-not-to-be-created
top-level directories exists (WS-01 §0, **B-03**), and this workstream created none.

### 3.5 The actual in-memory lifetime of the trace, read from source

`src/trace/score-trace.js` is 69 lines and contains the whole storage story of Unit 1.

| Question | Answer, with line reference |
| --- | --- |
| **Where does the array live?** | `const records = []` at **line 36**, a `const` local to the `createScoreTrace` factory. It is a closure variable — never a property, never returned, never assigned to `this`, `window`, `globalThis` or any module-level binding |
| **When is it created?** | At the first call to `createScoreTrace()`. For the game that is **line 69**, `export const scoreTrace = createScoreTrace()`, evaluated once when the module is first imported — i.e. during `src/main.js`'s import phase, synchronously at page bootstrap, before the idle state is presented |
| **How does it grow?** | Only via `records.push(record)` at **line 48**, reached only from `appendRunEnd`, which `src/main.js:56` calls only inside `endRun` and only when `machine.transition('collide')` returns true. One record per `running → run-end` transition, and nothing else appends |
| **What destroys it?** | **Nothing in the delivery.** There is no `delete`, no `splice`, no `length = 0`, no `pop`, no `shift`, and no clear function anywhere. The array is unreachable garbage the moment the page's JavaScript realm is torn down — a reload, a navigation, or a tab close — and that is the entire discard mechanism (ADR-003 §3). Deliberately **no** unload handler exists to "clear" it |
| **What can reach it?** | Exactly three functions, returned frozen at **line 65**: `appendRunEnd`, `list`, `size`. `list()` (**lines 53-59**) rebuilds a new array of new plain objects field by field, so no reference to `records` or to any element ever escapes the closure |

The only references to the trace anywhere in `src/`:

```
$ grep -rn "scoreTrace\|createScoreTrace" src/
src/main.js:18:import { scoreTrace } from './trace/score-trace.js';
src/main.js:56:    scoreTrace.appendRunEnd({ score: finalScore, sessionLengthMs: runState.elapsedMs });
src/main.js:97:      return scoreTrace.list();
src/trace/score-trace.js:29:export function createScoreTrace(options = {}) {
src/trace/score-trace.js:69:export const scoreTrace = createScoreTrace();
```

**One write site, one read site, one construction site.** That is the complete storage surface of
Unit 1: a JavaScript array in module scope, whose lifetime is exactly the lifetime of the page's
JavaScript realm.

### 3.6 Driving it: append, copy-on-read, and unreachability through `window.dinoDash`

The harness imports the delivered module, appends four records to the module-singleton trace, then
installs the accessor **exactly as `src/main.js:93-109` does** (`Object.defineProperty` with
`writable: false, configurable: false` around an `Object.freeze`d object) and attacks it.

```
$ node <scratch>/trace-harness.mjs
size at import                       : 0
after append #1                     : 1
after append #2                     : 2
after append #3                     : 3
after append #4                     : 4
RECORD_FIELDS                        : endedAt,score,sessionLengthMs
keys of record[2]                    : endedAt,score,sessionLengthMs
record[2]                            : {"score":428,"endedAt":"2026-08-11T08:03:10.992Z","sessionLengthMs":42871}

getScoreTrace() length               : 4
a === b (same array identity?)       : false
a[0] === b[0] (same object identity?): false
a[0] deep-equals b[0]                : true

after push/edit/truncate on the copy:
  copy length                        : 0
  trace size (unchanged?)            : 4
  trace[0].score (unchanged?)        : 0

tamper attempts on window.dinoDash:
  assign  : threw TypeError
  delete  : threw TypeError
  redefine: threw TypeError
  patch   : threw TypeError
  accessor frozen                    : true
  accessor own keys                  : version,getScoreTrace,getState,getBackgroundVariations
  property descriptor                : {"writable":false,"configurable":false,"enumerable":true}
  trace object own props             : appendRunEnd,list,size
  trace object frozen                : true
  any own prop exposing the array?   : false
  trace size after all attempts      : 4

a freshly created trace size         : 0
module re-evaluated (new realm)      : 0
same-module re-import (cached)       : 4
```

Reading the three claims off that output:

- **Per-page-session.** The trace is empty at module evaluation (`size at import: 0`) and holds
  whatever this session appended (`4`). Re-evaluating the module under a fresh specifier — the
  closest Node analogue to a page reload building a new realm — yields a **new array at size 0**,
  while re-importing the *same* specifier returns the cached module still holding 4. That is exactly
  the AC-22/AC-23 shape: records survive restarts within one realm, and a new realm starts at zero
  with nothing to load from. (This is an analogue, not a browser observation — see **L-01**.)
- **Copy-on-read.** Two consecutive `getScoreTrace()` calls return arrays that are **not identical**
  (`a === b : false`) containing elements that are **not identical** (`a[0] === b[0] : false`) but
  are field-for-field equal. Pushing a forged record onto the copy, editing `copy[0].score` to `-1`
  and then truncating the copy to length 0 left the trace at **size 4** with `trace[0].score`
  still `0`. Observing cannot corrupt what is being observed (ADR-003 §4).
- **Not reachable for mutation through `window.dinoDash`.** Assigning to the property, deleting it,
  redefining it and monkey-patching `getScoreTrace` **all four threw `TypeError`**; the descriptor is
  `{writable: false, configurable: false, enumerable: true}` and the object is frozen. The trace
  object itself is frozen with exactly three own properties — `appendRunEnd`, `list`, `size` — and
  **no own property of it is an array**, so there is no path from the accessor to `records`. The
  accessor is a read-only window onto a copy; it is not a handle on the store.

Note on strictness: the harness is an ES module, so the failed writes throw. In a browser console
(sloppy mode) the same four operations **fail silently** rather than throwing — the outcome is
identical, the diagnostics are not. Recorded as **L-03** so a later reader running these lines in
DevTools does not read "no error" as "it worked".

### 3.7 The existing unit tier agrees, at this revision

```
$ node --test tests/unit/score-trace.test.mjs
1..10
# tests 10
# pass 10
# fail 0
# duration_ms 118.6633
```

Ten of ten pass, including "the module-level page-session trace starts empty and is frozen". The
storage assertion lives one file over:

```
$ grep -rn "localStorage\|sessionStorage\|indexedDB\|cookie" tests/
tests/unit/source-hygiene.test.mjs:72:  const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'IndexedDB', 'document.cookie'];
```

**The only occurrence of a storage token anywhere under `tests/` is the forbidden-list of the test
that asserts their absence** (`AC-22/AC-23: no persistence API appears anywhere in src/`, green in
WS-04 §3.8). ENG-06 notes for WS-10 that this list covers five tokens; section 3.2 covers
thirty-five, and Cache Storage, OPFS/File System Access, `navigator.storage` and the
`window.name` / `history.replaceState` side channels are not currently asserted against by any test.
That is a coverage observation, not a defect — nothing in `src/` uses them today.

### 3.8 Two measurements section 5 relies on

A sweep of `elapsedMs` through the delivered `scoreForElapsedMs` and the delivered `appendRunEnd`,
checking whether `score` can be re-derived from the stored `sessionLengthMs`, and sizing one record:

```
$ node --input-type=module -e "…sweep elapsedMs 0→120000 in 0.4 ms steps through
  scoreForElapsedMs + appendRunEnd; compare floor(sessionLengthMs*0.01) against the
  stored score; print divergence count, largest signed divergence and record byte size…"
records appended and checked          : 300001
floor(sessionLengthMs*0.01) !== score : 1782 (0.594%)
largest signed divergence             : 1 point
worst example                         : {"elapsedMs":99.60000000000034,"stored":{"score":0,"endedAt":"2026-08-11T00:00:00.000Z","sessionLengthMs":100},"derived":1}
trace size after the sweep            : 300001
JSON bytes of one record              : 68
```

Two facts fall out, both used in section 5: a real record is **68 JSON bytes**, and the apparent
`score = floor(sessionLengthMs / 100)` relationship holds for 99.4% of records and is off by exactly
one point for the rest. The trace also accepted 300,001 appends in one process without any clearing
path being needed — the array simply grows for as long as the realm lives (3.5).

---

## 4. `GATE-DATABASE` — plainly, whether it is engaged

**`GATE-DATABASE` is owned by ENG-06 and is `required: false`. It is not engaged, because none of the
three evidence artifacts it names can exist.**

```
$ node -e "const g=require('./engineering/quality/gates.json');
  console.log(JSON.stringify(g.gates.find(x=>x.id==='GATE-DATABASE'),null,1));
  console.log('gates owned by ENG-06:', g.gates.filter(x=>x.ownerRole==='ENG-06').map(x=>x.id+' required='+x.required).join(', '));
  console.log('required:true gates:', g.gates.filter(x=>x.required).map(x=>x.id+'->'+x.ownerRole).join(', '));"
{
 "id": "GATE-DATABASE",
 "domain": "database",
 "ownerRole": "ENG-06",
 "required": false,
 "evidence": [
  "migration plan",
  "backup and rollback proof",
  "query or index evidence"
 ]
}
gates owned by ENG-06: GATE-DATABASE required=false
required:true gates: GATE-ARCHITECTURE->ENG-02, GATE-CODE-REVIEW->ENG-01, GATE-AUTOMATED-TESTS->ENG-10, GATE-SECURITY->ENG-09, GATE-SUPPLY-CHAIN->ENG-09, GATE-DOCUMENTATION->ENG-14, GATE-INDEPENDENT-VERIFICATION->ENG-15
```

**One gate is owned by ENG-06, it is the only one, and it is `required: false`.**

| Evidence the gate asks for | Position at `963cf74` | Why |
| --- | --- | --- |
| migration plan | **Cannot exist** | There is no schema at the base revision and none at the delivery revision, so there is no diff to migrate. ADR-003's own migration note says it outright: "documentation-only; no data exists to migrate, in this unit or anywhere" |
| backup and rollback proof | **Cannot exist** | Nothing durable is written. The only state that outlives a run is an array in the page's JavaScript realm (3.5); there is no byte to back up and no store to roll back |
| query or index evidence | **Cannot exist** | There is no query engine, no query, and no index. The trace's whole read API is `list()` — a full copy, chronological, oldest first — over an array whose realistic length is the number of runs in one sitting |

The gate is recorded not applicable on the same basis as the workstream. **`not_applicable` is used
because the contract's own non-goals remove the work — never to route around a gate.** No required
gate is affected: WS-01 §1 independently verifies that every `required: true` gate
(ARCHITECTURE, CODE-REVIEW, AUTOMATED-TESTS, SECURITY, SUPPLY-CHAIN, DOCUMENTATION,
INDEPENDENT-VERIFICATION) lands on a workstream with real work, and none of them is ENG-06's.

WS-06 differs from WS-05, which had no gate at all to record, and matches WS-04's position: a
`required: false` gate that exists, is owned, and is recorded as inapplicable rather than skipped.

ENG-06 **owns no acceptance criterion** — WS-01 §3 assigns all 30 elsewhere, with AC-22 and AC-23
owned by WS-03 and contributed to by WS-09 and WS-10. Nothing in this document is a disposition for
the delivery; only ENG-15 at WS-14 issues one.

---

## 5. Analysis: the record as a future persistence subject

**This section designs nothing.** It records properties of the shape that already exists, because
ADR-003's preamble names this record as "the one Unit 1 artifact a later unit consumes": Unit 2 will
persist it locally and Unit 3 will store it shared. Proposing a schema, a key, a table, a store or a
serialization format here would scaffold uncontracted work, which WS-01 §0 and **B-03** prohibit and
which the request's non-goals text puts behind the human `product_direction_or_priority` gate. What
follows is analysis a future planning cycle can read; it is not a design and must not be cited as one.

The subject is `{ score, endedAt, sessionLengthMs }` — ADR-003 §1, frozen names, types and units under
the §6 evolution rule.

### 5.1 What makes this shape easy to persist later

- **It is already a storable value, not an object graph.** Flat, three fields, no nesting, no arrays,
  no prototype tricks, no getters (ADR-003 §1 states this and `list()` at lines 53-59 enforces it by
  rebuilding each record field by field). Two integers and one string. It round-trips through
  `JSON.stringify` losslessly and needs no serializer, no normalization pass and no join.
- **Its bytes are trivial.** `Buffer.byteLength(JSON.stringify(record))` measured **68 bytes** on a
  real record. A thousand runs is well under 100 KB. No storage sizing question exists at any
  plausible scale of this game.
- **Type validity is guaranteed at the write, not at the read.** `toNonNegativeInteger`
  (lines 20-23) rounds and floors both numeric fields on the way in: `NaN`, `Infinity` and every
  negative collapse to `0`. A persisted record therefore can never carry a non-finite, fractional or
  negative number, so a storage boundary needs no coercion, no nullable numeric column and no
  defensive parse for those cases.
- **The key set is closed and asserted.** `RECORD_FIELDS` is frozen at line 18 and
  `Object.keys(record).sort().join(",") === "endedAt,score,sessionLengthMs"` is an assertion ADR-003
  §1 already writes out. A reader can validate a stored row against a fixed set rather than a
  tolerant one.
- **The write pattern is append-only and chronological.** One record per `running → run-end`
  transition and nothing else (3.5); index *n* is the *(n+1)*-th run of the session. There is no
  update path and no delete path to model, which removes the two operations that generate most of a
  storage layer's concurrency and integrity work.

### 5.2 What makes it hard, and these are the parts worth carrying forward

- **It carries no identifier — none at all.** Not a run id, not a row id, not a natural key. The
  three fields are the whole record (AC-25; ADR-003 §3 "No identity"). Consequences that land
  squarely on whoever persists it: there is no idempotency key, so a retried or replayed write cannot
  be deduplicated; there is no stable handle, so a stored row cannot be referenced, corrected or
  deleted individually; and there is no uniqueness guarantee, since two records with identical field
  values are indistinguishable and legal. Any store must **invent** a key. ADR-003 §6 rule 4 then
  constrains what kind: no added field may be an identifier "in a unit that has not cleared the
  privacy obligation the contract carries open for Units 3 and 4" — and the request records that no
  consent, retention, deletion or anonymization approach exists in this workspace. So the missing key
  is not a gap an engineer fills; a *row* key and an *owner* key are different problems, and the
  second is gated on a privacy obligation that is still open.
- **It carries no schema version.** `window.dinoDash.version === 1` (`src/main.js:95`) is the
  **accessor's** contract version, and ADR-003 §4 says so explicitly — "not the record's". Nothing
  inside the record says which contract produced it. In page memory that costs nothing, because every
  record in the array was produced by the code currently running. The moment records are written to a
  durable store, rows outlive the code that wrote them: after ADR-003 §6 rule 3 permits a later unit
  to add a field, a reader facing a stored row can only infer its vintage from **which keys are
  present**. Presence-inference is the only versioning this shape offers, and it is only sound while
  additions are strictly additive — which is precisely what rule 3 and rule 5 already require, and
  what a durable store makes load-bearing rather than tidy.
- **It carries no device marker.** No device id, no user agent, no locale, no screen size — AC-25
  forbids all of them and `navigator` is never read (WS-04 §3.7). The consequence for a local store
  (Unit 2) and a shared store (Unit 3) is the same and is not obvious: records produced on two
  devices are **unmergeable**. There is no field on which to partition, attribute, deduplicate or
  order them relative to each other except `endedAt`, and `endedAt` is a client wall-clock reading
  (next point). Two sets of local history cannot be reconciled into one; they can only be
  concatenated and sorted on a field that is not trustworthy for the purpose.
- **`endedAt` uses the `Z` designator, and ADR-003 flags that as a live open interpretation risk.**
  ADR-003's migration note carries it verbatim: AC-19 requires "an ISO-8601 string with an explicit
  UTC offset"; the ADR reads UTC-with-`Z` as satisfying that; **a verifier requiring a numeric
  `±HH:MM` offset would find `Z` insufficient**, and the ADR asks for it to be settled *before* ENG-03
  implements, precisely so it is not discovered at AC-19. It was not settled — it is open at this
  revision. In Unit 1 the fix is one formatting function on a value that lives in page memory for
  minutes. **Once a server stores it, it stops being a formatting change and becomes a data
  migration**: rows already written in `Z` form have to be rewritten in place, or read through a
  dual-format reader forever, and any index, comparison or partition built on the string form has to
  be rebuilt with them. That is the single highest-cost item this analysis has to hand over, and its
  cost is a function of *when* it is settled, not of how hard it is.
- **`Z` also discards the player's local offset, irrecoverably.** ADR-003 §1 states it: a consumer
  that needs local time "cannot recover it from this field and must not try to infer it". A later
  "your run was at 7:42 pm" feature is therefore a **new field**, not a reformat of this one.
- **`endedAt` is the only wall-clock field, and it is the only one a clock change can corrupt.**
  ADR-003 §2 makes the asymmetry deliberate: `sessionLengthMs` comes from `performance.now()` and
  survives a system-clock change (AC-21), while `endedAt` moves with it. Two non-obvious consequences
  for a store. First, **`endedAt` is unsound as an ordering key**: within a single session a mid-run
  clock change can make record *n+1* carry an earlier instant than record *n*, so sorting stored rows
  on `endedAt` can silently lose the chronological order the array had for free. Second,
  **`endedAt − sessionLengthMs` is not the run's start instant.** The two values come from different
  clocks; subtracting them mixes a wall-clock instant with a monotonic duration, and the result is
  wrong by exactly the skew. A derived `startedAt` column computed that way would look correct in
  every test and be wrong exactly when the clock moved.
- **`score` and `sessionLengthMs` are not independent — they are one fact stored twice, but not
  exactly twice.** `src/game/score.js:12-15` is `Math.floor(elapsedMs * RUN.scorePerMs)` with
  `scorePerMs: 0.01`, and `src/main.js:52-56` computes both fields from the same `runState.elapsedMs`,
  so a genuine record satisfies `score ≈ floor(sessionLengthMs / 100)`. That is tempting as a
  validation invariant — Unit 3 could use it to sanity-check a submitted score — but it does **not**
  hold exactly, because `score` is floored from the raw fractional `elapsedMs` while
  `sessionLengthMs` is `Math.round`ed of the same value. Measured over 300,001 synthetic records
  spanning 0–120 s at 0.4 ms steps: **1,782 records (0.594%) diverge, always by exactly 1 point**,
  first at `elapsedMs = 99.6` → stored `{score: 0, sessionLengthMs: 100}` where the derived value is
  `1`. A validator written as strict equality would reject roughly one legitimate record in 168. This
  is recorded so the invariant is used with its real tolerance, or not used.

### 5.3 What this analysis is not

It is not a schema, not a key design, not a storage-engine choice, not a migration plan, and not a
retention or deletion policy. It does not decide whether Unit 2 should use `localStorage`,
IndexedDB or anything else — that is a Unit 2 architecture decision, taken in Unit 2's own planning
cycle, against Unit 2's own contract. Nothing here pre-clears a non-goal, and this document must not
be cited as having done so.

---

## 6. Known risks and limitations

- **L-01 — the reload evidence in 3.6 is an analogue, not a browser observation.** Re-evaluating the
  module under a fresh specifier in Node produces a new realm with a new array, which is the same
  mechanism a page reload uses, but it is not a page reload. AC-22's and AC-23's stated verification
  is a browser one — three records after three runs, zero after reload, and empty
  `localStorage`/`sessionStorage`/IndexedDB/cookies in the storage inspector. That evidence is WS-10's
  under `GATE-AUTOMATED-TESTS`. ENG-06 does not claim it and does not pre-empt it.
- **L-02 — the scan is static and covers `src/`.** Zero call sites in source is strong evidence that
  zero storage writes occur, and it is what a source-level review can establish; it is not the storage
  inspector. `tests/` is outside the determination (it is ENG-10's and ENG-12's), and 3.7 records its
  one storage-token occurrence for completeness.
- **L-03 — the tamper results in 3.6 are strict-mode results.** Four `TypeError`s in an ES module
  become four silent no-ops in a browser console, which is sloppy mode. Same outcome, different
  diagnostics. A reader who pastes those lines into DevTools and sees no exception has not found a
  regression.
- **L-04 — the `endedAt` `Z` interpretation risk is carried, not closed.** ENG-06 has no authority to
  settle it. ADR-003 raises it, WS-04 §6 item 5 carries it, and section 5.2 states what it costs once
  a server stores the field. It remains open at this revision.
- **L-05 — the score/`sessionLengthMs` divergence in 5.2 is measured on synthetic values.** The
  harness feeds a swept `elapsedMs` through the delivered `scoreForElapsedMs` and the delivered
  `appendRunEnd`, which is the same arithmetic the game performs, but it is not gameplay. The
  0.594% figure characterises the rounding relationship, not an observed rate in real play.
- **L-06 — no test currently asserts the wider token set.** `source-hygiene.test.mjs` forbids five
  tokens; 3.2 checked thirty-five. Cache Storage, OPFS/File System Access, `navigator.storage` and
  the `window.name`/`history.replaceState` side channels are unasserted. Handed to WS-10 as a coverage
  observation, not filed as a defect — nothing in `src/` uses them.
- **L-07 — client-side score forgeability is the owner's accepted risk and is not re-accepted here.**
  `DEC-20260809-001` covers it, bounded to Units 1 and 2, with server-side validation required from
  Unit 3. ENG-06 records it as inherited context; a second, weaker record of the same decision would
  be worse than none.
- **L-08 — `not_applicable` is scoped to Unit 1 at this revision.** It is not a standing judgement
  that Dino Dash will never have a database. Units 2 through 5 are not contracted and nothing here
  pre-clears them.

---

## 7. What ENG-06 did not do

- **No schema, no migration, no storage layer, and no scaffolding for any of them.** No `database/`,
  `migrations/`, `infrastructure/`, `services/`, `app/`, `apps/` or `packages/` directory was created
  — all are contract-allowed but explicitly "not to be created" per WS-01 §0, and creating one would
  inflate the AC-28 inventory with a system that does not exist.
- **Nothing was built "for Unit 2".** No local-store adapter, no serializer, no key scheme, no
  versioning envelope, no retention policy. Section 5 analyses the shape that exists; it proposes
  nothing.
- **No persistence call site was added, and no `unload` handler.** Adding one would break AC-22/AC-23
  outright, and ADR-003 §3 forbids the unload handler specifically — it would clear nothing and would
  disqualify the page from the back/forward cache.
- **No change to any file under `src/` or `tests/`.** WS-06 is a review. The scans were read-only; the
  three Node invocations imported delivered modules and executed an existing test file, and wrote no
  artifact.
- **No verification disposition for the delivery.** WS-06 records `not_applicable` for its own run
  only. Only ENG-15 at WS-14 issues the delivery's disposition.
- **No product decision, and no reopening of a non-goal.** Scope, priority, risk acceptance and final
  user-visible acceptance belong to the human product owner.
- **No write outside the boundary.** This workstream created exactly one file,
  `docs/engineering/WS-06-storage-review.md`. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in the product workspace
  `D:/os-test/dino-dash`, was created or modified.
