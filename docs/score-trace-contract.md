# The score-trace field contract

**If you are building Unit 3 (the shared score table), this is the document you need. You can read it
alone. You do not need to open any file under `src/`.**

| | |
| --- | --- |
| Request | `DEVREQ-EVT-20260809-001` |
| Plan / workstream | `ENGPLAN-EVT-20260809-001` / WS-13, owner role ENG-14 |
| Acceptance criterion | **AC-29** (this document is its deliverable) |
| Normative source | `docs/architecture/decisions/ADR-003-score-trace-field-contract.md` |
| Delivery revision documented | `src` tree `0566d5d39599d0cdf374b5dee27d22afdb544c41` (WS-03's seal, unchanged since) |
| Status | The three field **names, types and units are frozen** (ADR-003 §6) |

ADR-003 is the decision. This document is the **contract as a consumer needs it** — same facts,
arranged so a Unit 3 author can predict the record before ever seeing one.

---

## 1. The record — the whole of it

Every run end produces **exactly one** record with **exactly three** fields. There are no optional
fields, no conditional fields and no fourth field in Unit 1.

| Field | Type | Unit / format | Meaning |
| --- | --- | --- | --- |
| `score` | `number`, **integer** | points | The final session score of the run that just ended. Identical to the number the run-end screen displays. Never negative. `Number.isInteger(score) === true`. |
| `endedAt` | `string` | ISO-8601 / RFC 3339, **UTC**, literal `Z` designator, millisecond precision — `YYYY-MM-DDTHH:MM:SS.mmmZ` | The wall-clock instant of the `running → run-end` transition, read from the **client** clock. |
| `sessionLengthMs` | `number`, **integer** | **milliseconds** | Elapsed duration of the run, first frame to collision, from a **monotonic** source, rounded to an integer. Never negative. |

A plain object. JSON-serializable. `Object.prototype` prototype, no getters, no nested objects, no
symbols.

```json
{ "score": 428, "endedAt": "2026-08-10T18:42:07.311Z", "sessionLengthMs": 31402 }
```

The key set is closed, and this is the assertion to write against it:

```js
Object.keys(record).sort().join(",") === "endedAt,score,sessionLengthMs"
```

### 1.1 The three predictions, stated as a checklist

If you have read only this section, you can already state, without looking at a record:

1. the field names are `score`, `endedAt`, `sessionLengthMs` — and nothing else;
2. their types are `number` (integer), `string`, `number` (integer);
3. `sessionLengthMs` is in **milliseconds**, `score` is in **points**, and `endedAt` is a **UTC**
   instant carrying the literal `Z`.

That is the whole of AC-29's prediction. §7 records the comparison of exactly this prediction against
records produced by running the delivered code.

---

## 2. The timezone convention — read this before you build a table

`endedAt` is a **UTC instant**. The trailing `Z` is ISO-8601's explicit designator for offset
`+00:00`; that is what satisfies AC-19's requirement of "an explicit UTC offset".

Three consequences, each of which has bitten someone building a leaderboard:

- **It is not local time.** Do not render it to a player without converting.
- **It carries no local-offset information.** The player's timezone is **not recoverable** from this
  field. A shared table that wants "yesterday, 9pm your time" must obtain the offset from somewhere
  else — it is not in the record, and it must not be guessed from the value.
- **It is the client's clock.** Nothing validates it. See §5.

**Open interpretation risk, carried forward from ADR-003 and not closed.** AC-19 says "ISO-8601 string
with an explicit UTC offset". ADR-003 reads that as UTC with the `Z` designator, and that is what the
delivery emits. **A verifier who requires a numeric `±HH:MM` offset would find `Z` insufficient.** The
implementation change would be one formatting function, but it would change the documented contract
Unit 3 builds on. ADR-003 records this as a *live* risk. If you are writing a Unit 3 parser today,
accept `Z`; if the interpretation is later settled the other way, expect a contract amendment rather
than a silent format change.

---

## 3. How to read the trace: `window.dinoDash.getScoreTrace()`

The delivery installs one frozen global namespace during bootstrap, **synchronously, before the idle
state is presented** — so it is available from the first moment the page is interactive.

```js
window.dinoDash.getScoreTrace()      // -> record[]  (chronological, oldest first)
window.dinoDash.getScoreTrace()[0]   // -> { score, endedAt, sessionLengthMs }
window.dinoDash.getScoreTrace().length
```

The namespace also carries `version` (currently `1`), `getState()` and `getBackgroundVariations()`
— see `docs/operating-overview.md` §5 and ADR-004. Those are unrelated to the record.

**Semantics you can rely on:**

- **Copy on read.** Every call returns a **new array containing new record objects**. Mutating what
  you got back cannot affect the game's own trace, and two consecutive calls return objects that are
  `!==` each other. This is not an anti-tamper measure (§5) — it exists so that observing the trace
  under AC-19/AC-22 cannot corrupt what is being observed.
- **Order is chronological, oldest first.** Index *n* is the *(n+1)*-th completed run of this page
  session.
- **The namespace is frozen**, non-writable, non-configurable. There is no setter, and no function
  that forces a state, sets a score or appends a record from outside.
- **Read-only and side-effect free.** Calling it changes nothing and is not bound to any key, so it
  creates no keyboard-reachable state.

`version` is the **accessor's** contract version, not the record's. It changes only if the accessor's
shape changes. **The record itself carries no version field** — see §5.

### 3.1 If you are consuming the module directly in Node rather than in a page

The trace module `src/trace/score-trace.js` exports a factory and a module singleton. The instance
API is `appendRunEnd({ score, sessionLengthMs })`, `list()` and `size()`; `list()` has the same
copy-on-read semantics as `getScoreTrace()`. The module also exports `RECORD_FIELDS`, which at this
revision is `["endedAt","score","sessionLengthMs"]` — the same closed set as §1.

**`window.dinoDash.getScoreTrace()` is the supported surface.** The module API is stated here because
the unit tier and any Node-side Unit 3 prototype will use it, not because it is a second contract.

---

## 4. Lifetime — what survives what

| Event | Does the trace survive? |
| --- | --- |
| Run ends (collision) | One record is **appended**. A run that ends at score 0 still produces a record. |
| Restart (a new run from run-end) | **Yes.** Records accumulate across restarts within the page session (AC-22). |
| Reload | **No.** Zero records. Indistinguishable from a first visit (AC-23). |
| Tab/window close, navigation away | **No.** The array dies with the page's JavaScript realm. |

- **Scope is the page session.** The array is module state. It is never written to `localStorage`,
  `sessionStorage`, IndexedDB, a cookie, `window.name` or history state, and it is never transmitted
  — there is no `fetch`, `sendBeacon`, `XMLHttpRequest` or WebSocket anywhere in the delivery.
- **Discard on unload is by construction, not by cleanup.** There is nothing to clear, so there is
  deliberately **no `unload` or `beforeunload` handler**. Do not add one: it would clear nothing and
  it would disqualify the page from the back/forward cache.
- **One record per run end, appended by the `running → run-end` transition and by nothing else.**
  Restarting produces no record. Reloading produces no record.
- **It grows without bound by design.** WS-11 §4b measured **~58.3 bytes per record**; 200,000
  records retained 11.12 MiB. One record per *run end*, not per frame. No ceiling is asserted. Unit 3
  inherits this figure rather than rediscovering it.

---

## 5. What this record is **not**

Stated plainly, because every item here is something a Unit 3 author could otherwise assume.

- **It is not evidence, and it attests to nothing.** It is a client-side observation with no witness.
- **Every field is forgeable from a browser console.** `score` is a number in page memory; `endedAt`
  moves with the system clock; `sessionLengthMs` is a subtraction the page performs on itself. The
  owner accepted this explicitly in `DEC-20260809-001`: Unit 1 records the score "even though it is
  client-side and forgeable. The forgeability is accepted, not overlooked." Server-side validation is
  required from Unit 3 and is to be decided at Unit 3.
- **There is deliberately no anti-tamper mechanism.** No checksum, no signature, no replay log, no
  input recording, no obfuscation. Copy-on-read (§3) protects the *observer*, not the *value*.
- **There is no identifier of any kind.** No player id, device id, session id, run id, nickname, user
  agent, IP, locale or screen size (AC-25). The three fields are the whole record. Unit 1 has no
  identity surface at all — no sign-in, no profile, no form control.
- **There is no schema version on the record.** `window.dinoDash.version` versions the *accessor*.
  If you need to distinguish record generations, you must carry that yourself or amend the contract
  under §6.
- **There is no device or environment marker.** Nothing in the record tells you which browser,
  screen, refresh rate or machine produced it. (The delivery reads `devicePixelRatio` once, in the
  canvas renderer, for scaling only; it never reaches the record.)
- **`sessionLengthMs` is not "time the player was looking at the screen".** It is monotonic elapsed
  run time. A backgrounded tab pauses `requestAnimationFrame` but the score and the elapsed clock keep
  running: WS-05 §3.8 and WS-10 §5 measured **+600 points per 60 s hidden**, with 36 px of world
  motion and zero collision tests evaluated. This is contracted behaviour against AC-08/AC-20/AC-21 as
  written, it is **not** covered by the owner's forgery acceptance, and Unit 3 should expect it when
  sanity-checking `score` against `sessionLengthMs`.

**What Unit 3 actually inherits is a stable field shape to validate against, not a trustworthy value.**
A Unit 3 server can range-check `score`, sanity-check `sessionLengthMs` against `score`, and reject
`endedAt` outside an acceptable clock skew — because the fields exist, are typed, and mean what this
document says. That is the whole of Unit 1's contribution to Unit 3's integrity story.

---

## 6. Evolution rule — binding on any unit that consumes or extends this record

1. The three field **names** are frozen. They are never renamed.
2. Their **types and units** are frozen: `score` integer points, `endedAt` UTC ISO-8601 string with
   `Z`, `sessionLengthMs` integer milliseconds from a monotonic source.
3. Later units may **add** fields. Additions must never change the meaning of the existing three.
4. **No added field may be an identifier** in a unit that has not cleared the privacy obligation the
   contract carries open for Units 3 and 4 — no consent, retention, deletion or anonymization
   approach exists in this workspace.
5. If semantics must change incompatibly, that is a **new record type with a new accessor version**.
   The old shape is superseded, not rewritten.

---

## 7. AC-29 self-test — the prediction, and what a real record actually was

AC-29's verification is: *locate the documentation without reading the run-loop source, predict the
three field names, their types and their units from the documentation alone, then compare against an
actual record.* ENG-14 performed exactly that, in that order.

**Step 1 — prediction, written before opening `src/trace/score-trace.js` or any run-loop module**,
from ADR-003 and §1–§3 above:

```
score            number, integer, points, >= 0
endedAt          string, ISO-8601 UTC, literal "Z", YYYY-MM-DDTHH:MM:SS.mmmZ
sessionLengthMs  number, integer, milliseconds, monotonic-derived, >= 0
keys             exactly "endedAt,score,sessionLengthMs"
absent           no id, no schema version, no device marker, no nesting
```

**Step 2 — three real runs** played over the delivered `src/game/*` and `src/trace/score-trace.js`
modules at `src` tree `0566d5d3…44c41`, recorded through the trace's own append-on-run-end path:

```
{"score":35,"endedAt":"2026-08-11T14:04:36.171Z","sessionLengthMs":3600}
{"score":35,"endedAt":"2026-08-11T14:04:36.172Z","sessionLengthMs":3600}
{"score":35,"endedAt":"2026-08-11T14:04:36.173Z","sessionLengthMs":3600}

keys           : endedAt,score,sessionLengthMs
score          : number   integer=true
endedAt        : string   matches /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/   Date.parse ok
sessionLengthMs: number   integer=true
prototype      : Object.prototype
copy-on-read   : two calls return a different array AND different record objects
record count   : 3 after three runs
```

**Step 3 — comparison: zero discrepancies.** All three names, all three types, both units and the
`Z` convention were predicted correctly from the documentation alone. The key set is closed at three
as documented, the record is a plain `Object.prototype` object as documented, and copy-on-read holds
as documented.

*(The three scores are identical because the harness played deterministic seeded runs from the same
start conditions; the runs are real, the sameness is the seed, not the contract.)*

**Continuous protection against drift.** `tests/unit/trace-contract.test.mjs` (7 tests) **reads
ADR-003 itself** and asserts the delivered module matches the documented field set, types, units and
UTC `Z` convention — so documentation and behaviour cannot diverge silently. It runs under `npm test`.
It does **not** replace the human prediction procedure above; AC-29 asks for both.

---

## 8. Related documents

- `docs/architecture/decisions/ADR-003-score-trace-field-contract.md` — the decision, its options and
  its consequences. Normative.
- `docs/architecture/decisions/ADR-002-…md` §3 — why the trace is one of only two things that outlive
  a run, and why it is the Unit 3 seam.
- `docs/architecture/decisions/ADR-004-…md` §1 — the other two accessor functions.
- `docs/operating-overview.md` — the delivery in one read.
- `docs/runbook.md` — how to run the game and reproduce every command.
