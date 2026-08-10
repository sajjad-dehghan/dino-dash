# ADR-003: The score-trace field contract

- Status: accepted
- Request: DEVREQ-EVT-20260809-001
- Plan / workstream: ENGPLAN-EVT-20260809-001 / WS-02
- Owner: ENG-02
- Independent verifier: ENG-15
- Decided: 2026-08-10

> **This is the one Unit 1 artifact a later unit consumes.** Unit 3 (shared score table) is built on
> this shape. Field names, types, units and the timezone convention below are the contract. AC-29
> requires a Unit 3 author to predict them from documentation alone, without reading the run loop —
> this document is written to be that documentation's source. ENG-03 implements it exactly; ENG-14
> documents it for the Unit 3 reader; ENG-10 asserts it. WS-01 records this as hard dependency
> **D-02**, and **D-10** for the documentation.

## Context

AC-19 to AC-22 require that every run end produces one record with at minimum `score`, `endedAt` and
`sessionLengthMs`; that `score` matches the displayed final score and `sessionLengthMs` matches
observed duration within 250 ms; that `sessionLengthMs` comes from a monotonic source that survives a
mid-run system-clock change; and that records accumulate in page memory across restarts, are
observable in-page, are discarded on unload, and reach no store and no destination.

AC-25 forbids any identifying field. AC-29 requires the contract to be documented findably and to
match observed behaviour exactly.

The owner recorded the accepted consequence in `DEC-20260809-001`:

> Unit 1 records the score together with a timestamp and session length, **even though it is
> client-side and forgeable. The forgeability is accepted, not overlooked.**

## Options considered

**Field set**

1. **Exactly the three required fields, closed set.** Chosen.
2. Three fields plus "useful extras" (run id, jump count, obstacle count, user agent). Rejected:
   AC-25 requires zero identifying fields and a user agent is a device signal; AC-29 requires a Unit 3
   author to *predict* the field set from documentation, and a set that grows by convenience is not
   predictable. Extras can be added under the evolution rule below when a unit actually needs them.
3. A nested/versioned envelope (`{schema, payload}`). Rejected as premature for a three-field record
   that no consumer reads yet; the accessor already carries a version (see below).

**`endedAt` timezone convention**

1. `Date.prototype.toISOString()` — UTC instant with the literal `Z` designator. Chosen.
2. Local time with a numeric `±HH:MM` offset. Rejected as the default: it needs hand-rolled
   formatting, and a shared table across a friend group compares instants, which UTC gives directly.
   Recorded as a live interpretation risk below.
3. Local time with no offset, or an epoch integer. Rejected: AC-19 requires an ISO-8601 string with
   an explicit offset.

**`sessionLengthMs` source**

1. `performance.now()` deltas — monotonic, immune to system-clock changes. Chosen; AC-21 effectively
   names it.
2. `Date.now()` deltas. Rejected — AC-21 forbids exactly this.
3. Accumulated frame deltas. Rejected: drifts against wall-clock duration under frame drops, and
   AC-20's tolerance is 250 ms against an independent stopwatch.

**Accessor**

1. A single frozen global namespace with getter functions returning copies. Chosen.
2. Exposing the internal array directly on `window`. Rejected: an observer can silently corrupt the
   evidence AC-22 is checking.
3. No accessor; inspect via a debugger or by reading source. Rejected: AC-19 to AC-22 would then be
   checkable only by whoever wrote the code, which is precisely the failure this decision exists to
   prevent.

## Decision

### 1. The record

Exactly three fields. No more in Unit 1.

| Field | Type | Unit / format | Definition |
| --- | --- | --- | --- |
| `score` | `number`, integer | points | The final session score of the run that just ended. **Identical** to the value the run-end state displays (AC-09, AC-20). `Number.isInteger(score) === true`. Never negative. |
| `endedAt` | `string` | ISO-8601 / RFC 3339, UTC, literal `Z` designator | The wall-clock instant of the run-end transition, read from the **client** clock via `new Date().toISOString()`. Example: `"2026-08-10T18:42:07.311Z"`. |
| `sessionLengthMs` | `number`, integer | milliseconds | Elapsed duration of the run, from the first frame of the run to the collision, measured on a **monotonic** source. `Math.round` of the delta. Never negative. |

The record is a plain object, JSON-serializable, with no prototype tricks, no getters and no nested
objects.

```js
{ score: 428, endedAt: "2026-08-10T18:42:07.311Z", sessionLengthMs: 31402 }
```

Assertions ENG-10 can write directly from this table:

```
Number.isInteger(record.score) && record.score >= 0
typeof record.endedAt === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.endedAt)
  && !Number.isNaN(Date.parse(record.endedAt))
Number.isInteger(record.sessionLengthMs) && record.sessionLengthMs >= 0
Object.keys(record).sort().join(",") === "endedAt,score,sessionLengthMs"
```

**Timezone convention, stated explicitly because it is the field most likely to be misread:**
`endedAt` is a UTC instant. `Z` is ISO-8601's explicit designator for offset `+00:00`; that is what
satisfies AC-19's "explicit UTC offset". It is **not** local time, and it carries **no** local-offset
information — a Unit 3 consumer that needs the player's local time cannot recover it from this field
and must not try to infer it.

### 2. Time sources

- **`sessionLengthMs`** — `performance.now()`, read once at the first frame of the run and once at
  the run-end transition; the difference, rounded to an integer. `performance.now()` is monotonic and
  unaffected by system-clock changes, which is what AC-21 requires. Two wall-clock readings must
  **never** be differenced for this field.
- **`endedAt`** — `Date` (wall clock). This is the one place the wall clock is read. A system-clock
  change mid-run therefore moves `endedAt` and leaves `sessionLengthMs` correct. That asymmetry is
  intended and is exactly what AC-21's procedure demonstrates.
- The clock is reached through `src/engine/clock.js`, which takes its time function by injection and
  defaults to `performance.now`. This is what lets the unit tier drive a controlled clock without
  changing the operating-system time — the substitute AC-21 evidence WS-01 anticipates under **B-05**
  if OS clock changes are not permitted in the execution environment. The substitute must be
  disclosed as a substitute, never reported as the manual procedure.

### 3. Lifecycle

- **One record per run end, appended.** The record is appended by the `running → run-end` transition
  and by nothing else. A run that ends at score 0 still produces a record. Restarting produces no
  record. Reloading produces no record.
- **Order** is chronological, oldest first. Index *n* is the *(n+1)*-th run of this page session.
- **Scope is the page session.** The array lives in module state in `src/trace/score-trace.js`. It
  survives restarts (AC-22) and does not survive a reload.
- **Discard on unload is by construction, not by cleanup.** There is no persistence path to clear:
  no `localStorage`, no `sessionStorage`, no IndexedDB, no cookie, no `fetch`, no `sendBeacon`, no
  `XMLHttpRequest`, no WebSocket anywhere in the delivery. The array dies with the page's JavaScript
  realm. **ENG-03 must not add an `unload` or `beforeunload` handler to "clear" it** — it would clear
  nothing, and it would interfere with the back/forward cache.
- **No identity.** No player id, device id, session id, nickname, user agent, IP, locale, screen
  size, or any other field that names or distinguishes a person or a device (AC-25). The three fields
  above are the whole record.

### 4. The in-page accessor

Installed by `src/main.js` during bootstrap, **synchronously, before the idle state is presented**, so
it is available to any observer from the first moment the page is interactive.

```js
window.dinoDash = Object.freeze({
  version: 1,
  getScoreTrace(),            // -> ScoreTraceRecord[]  (copy, chronological, oldest first)
  getState(),                 // -> "idle" | "running" | "run-end"          (ADR-004)
  getBackgroundVariations(),  // -> BackgroundVariation[]                    (ADR-004)
});
```

- The namespace is `window.dinoDash`, frozen, with **no setters and no writable properties**.
- `getScoreTrace()` returns a **new array of new record objects** on every call. Mutating the result
  cannot affect the game's own trace. This is not an anti-tamper measure — see below — it exists so
  that the act of observing under AC-19/AC-22 cannot corrupt what is being observed.
- `version` is the accessor's contract version, not the record's. It changes only if the accessor's
  shape changes.
- The accessor is **read-only and side-effect free**. It is not bound to any key, so it does not
  create a keyboard-reachable state and does not affect AC-15 or AC-26.

Checking AC-19 to AC-22 is then, in full:

```js
window.dinoDash.getScoreTrace().length   // 3 after three runs, 0 after a reload
window.dinoDash.getScoreTrace()[0]       // { score, endedAt, sessionLengthMs }
```

### 5. Forgeability — recorded, accepted, not designed against

Every field in this record is produced by the client and **every one of them is forgeable from a
browser console**. `score` is a number in page memory; `endedAt` moves with the system clock;
`sessionLengthMs` is a subtraction the page performs on itself. Nothing here attests to anything.

**The value of this contract is its shape, not its integrity.** The owner accepted this explicitly
(`DEC-20260809-001`: client-side score authority accepted for Units 1 and 2; server-side validation
required from Unit 3 and to be decided at Unit 3). ENG-02 therefore designs **no** anti-tamper
measure into Unit 1: no checksum, no signature, no replay log, no input recording, no obfuscation.
Any such mechanism would be security theatre on a client that also holds the verifier, and it would
enlarge Unit 1 beyond its contracted scope.

What Unit 3 inherits is a **stable field shape to validate against**, not a trustworthy value. A
Unit 3 server can range-check `score`, sanity-check `sessionLengthMs` against `score`, and reject
`endedAt` values outside an acceptable skew — because the fields exist, are typed, and mean what this
document says. That is the whole of Unit 1's contribution to Unit 3's integrity story.

### 6. Evolution rule for later units

Binding on any unit that consumes or extends this record:

1. The three field **names** are frozen. They are never renamed.
2. Their **types and units** are frozen: `score` integer points, `endedAt` UTC ISO-8601 string with
   `Z`, `sessionLengthMs` integer milliseconds from a monotonic source.
3. Later units may **add** fields. Additions must never change the meaning of the existing three.
4. No added field may be an identifier in a unit that has not cleared the privacy obligation the
   contract carries open for Units 3 and 4 (no consent, retention, deletion or anonymization
   approach exists in this workspace).
5. If field semantics must change incompatibly, that is a new record type with a new accessor
   version — the old shape is superseded, not rewritten, consistent with the governance rule on
   immutable records.

## Consequences and trade-offs

- **`endedAt` in UTC loses the player's local offset.** Deliberate: a shared table compares instants,
  and a fabricated local offset would be worse than none. Recorded as a risk below because a strict
  reading of AC-19 could demand a numeric `±HH:MM`.
- **A frozen three-field set will feel restrictive** the first time someone wants to record a jump
  count. That is the point: AC-29 asks a Unit 3 author to predict the fields from documentation, and
  only a closed set is predictable.
- **The public accessor is a deliberate, documented widening of the page's surface.** It is read-only,
  side-effect free, and not keyboard-reachable. It adds nothing an attacker did not already have on a
  client-authoritative page (see §5).
- **Copy-on-read costs an allocation per call.** Irrelevant at this scale; bought for observation
  safety.

## Migration, rollback, and evidence

- **Evidence:** this ADR; ENG-14's Unit-3-facing documentation derived from it (AC-29); the unit tier
  asserting record shape, integer-ness, the `endedAt` pattern and monotonic derivation under an
  injected clock; the browser tier asserting three records after three runs, zero after reload, and
  empty `localStorage` / `sessionStorage` / IndexedDB / cookies with zero outbound requests (AC-22,
  AC-23, AC-24).
- **Rollback:** documentation-only; no data exists to migrate, in this unit or anywhere.
- **Known interpretation risk (live):** AC-19 says "ISO-8601 string with an explicit UTC offset".
  This ADR reads that as UTC with the `Z` designator. A verifier requiring a numeric `±HH:MM` offset
  would find `Z` insufficient. The change would be one formatting function, but it would change the
  documented contract Unit 3 builds on, so it must be settled **before** ENG-03 implements — raised
  here rather than discovered at AC-19.
