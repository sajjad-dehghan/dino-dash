# Unit 1 — acceptance-criterion traceability to architecture

| Field | Value |
| --- | --- |
| Plan / workstream | `ENGPLAN-EVT-20260809-001` / WS-02, owner role ENG-02 |
| Request | `DEVREQ-EVT-20260809-001` (30 acceptance criteria) |
| Authored | 2026-08-10 |

**This is not a re-mapping of WS-01's AC-to-workstream table.** That table
(`docs/engineering/WS-01-coordination.md` §3) stands unchanged: it says *who* is accountable for each
criterion. This table says *which architectural decision makes each criterion satisfiable, and by
what mechanism*. Where a criterion needs no architectural decision, that is stated rather than
padded.

Column meanings — **ADR**: the decision the criterion rests on. **Mechanism**: the specific thing in
the design that makes it hold. **Checkable by**: the tier that can assert it (ADR-005 §3).

| AC | ADR | Mechanism | Checkable by |
| --- | --- | --- | --- |
| AC-01 | ADR-001, ADR-005 | Single entry point `src/index.html`; served over a localhost origin because ES modules do not load over `file://`; zero runtime dependencies so no cross-origin request exists; zero console output at runtime. **Chromium only — AC-01's two-browser text is superseded by `DEC-20260809-001`.** | Browser |
| AC-02 | ADR-002 | Idle-state instruction is DOM text shown by `data-game-state="idle"`; `idle → running` fires on Space or Up Arrow. | Browser |
| AC-03 | ADR-002 | `physics.js` grounded test; jump impulse applied only on the keydown edge while grounded — `keydown` auto-repeat is ignored, so holding produces one jump. | Unit + browser |
| AC-04 | ADR-002 | Both `Space` and `ArrowUp` map to the same jump event in `input/keyboard.js`. No mode, no setting, no rebinding — one mapping, two keys. | Unit + browser |
| AC-05 | ADR-002 | `preventDefault()` on the handled keys in the input adapter, which is the only module bound to key events. | Browser |
| AC-06 | ADR-002 | Collision drives `running → run-end`; score accrual is a function of run state, which stops advancing outside `running`. | Unit + browser |
| AC-07 | ADR-002 | Collision is the **only** event in the transition table that leaves `running`. No timer, threshold, key or idle period appears in it. | Unit (table) + browser |
| AC-08 | ADR-002 | Score is integer, derived from elapsed run time, non-decreasing by construction; the DOM readout is written from run state each frame and never read back. | Unit + browser |
| AC-09 | ADR-002, ADR-003 | The run-end display and the trace record read the **same** final score value from run state. One source, two readers. | Browser |
| AC-10 | ADR-002 | `run-end → running` replaces the run-state object; no navigation occurs because nothing reloads. | Browser |
| AC-11 | ADR-002 | Run-end instruction is DOM text shown by `data-game-state="run-end"`; restart is a key handled by the same input adapter. | Browser |
| AC-12 | ADR-002 | No pointer handler exists anywhere in the delivery — keyboard-only is the only input path there is, not a supported alternative. | Browser |
| AC-13 | ADR-002 §3 | **Reconstruct, never scrub**: entering `running` replaces run state with a freshly built object, so no field can be forgotten. Exactly two things outlive a run: the trace array and immutable config. | Unit + browser |
| AC-14 | ADR-002 | All text and every focusable control live in the DOM; the canvas is `aria-hidden` and never focusable, so focus order is the document order and a visible focus indicator is a CSS property of real elements. | Browser |
| AC-15 | ADR-004 §3 | The only keys with an effect are the ones the transition table names. No debug key, no hidden key, no query-string mode. | Browser (key sweep) |
| AC-16 | ADR-002, ADR-004 | Text is DOM text on a **fully opaque backing plate** from the closed palette, so the background actually rendered behind text is exactly one enumerated colour. The matrix is finite and the ratios are computable statically from `palette.js`. | Unit (static ratios) + browser (rendered pixels) |
| AC-17 | ADR-004 | Character, cactus and ground-line colours and every background variation come from one closed exported enumeration; discrete swaps only, no tweening, no randomization, so no unenumerated colour is ever drawn. | Unit (static ratios) + browser (rendered pixels) |
| AC-18 | ADR-004 | Palette declares distinct saturated hues for character, obstacle and ground/background — the machine-checkable half. **The judgement half is the product owner's under `final_user_visible_acceptance` and no engineering workstream can close it** (WS-01 **B-04**). | Browser (objective half only) |
| AC-19 | **ADR-003** | The record is exactly `{score, endedAt, sessionLengthMs}`, appended once per `running → run-end` transition. Types, units and format are fixed in ADR-003 §1. | Unit + browser |
| AC-20 | **ADR-003** | `score` is the same value the run-end state displays; `sessionLengthMs` is a monotonic delta rounded to an integer, so it tracks real elapsed duration. | Browser |
| AC-21 | **ADR-003 §2** | `performance.now()` only, reached through `engine/clock.js` with the time function injected. Two wall-clock readings are never differenced. The injected clock is also the inspectable substitute for the OS-clock procedure if the environment forbids changing system time (WS-01 **B-05**) — and must be disclosed as a substitute. | Unit (injected clock) + implementation reference |
| AC-22 | **ADR-003 §3, §4** | Trace array lives in module state, outlives restarts, dies with the realm. No storage or network API appears anywhere in the delivery, so discard-on-unload is by construction. Observable through `window.dinoDash.getScoreTrace()`, which returns copies. | Browser |
| AC-23 | ADR-001, ADR-003 | No persistence path exists to leave a trace in. A reload starts a new realm with an empty array. | Browser |
| AC-24 | ADR-001 §5, ADR-005 §6 | Zero runtime dependencies; every asset generated in code; no `fetch`, `sendBeacon`, `XMLHttpRequest` or WebSocket anywhere. Install-time network use is the toolchain's, stated separately (WS-01 **B-01**). | Browser |
| AC-25 | ADR-003 §1, §6 | The record is a closed three-field set with no identifier, and the evolution rule forbids adding one under an uncleared privacy obligation. No input field, no nickname, no profile exists in any state. | Unit + browser |
| AC-26 | ADR-002 §2, ADR-004 §1 | Closed three-value state set; unlisted transitions are no-ops, not new states; every transition emits `data-game-state`, `getState()` and `dino-dash:statechange`, so the key sweep collects a machine-readable set instead of a tester's impression. **The signal is a claim, not proof** — evidence must pair it with a DOM assertion that no other view exists. | Browser (key sweep) |
| AC-27 | — | No architectural decision needed. One character, no catalogue, no balance — an absence, enforced by review. | Browser |
| AC-28 | — | WS-01-owned. WS-02's own compliance is recorded in `docs/architecture/unit-1-system-impact.md` §4. | Inventory |
| AC-29 | **ADR-003** | ADR-003 is the source document ENG-14 (WS-13) turns into the Unit-3-facing contract. The three field names, types and units are stated in one table, with assertion snippets, so they can be predicted without reading the run loop. | Documentation review |
| AC-30 | ADR-005 | Two tiers with machine-readable reporters, four separately-stated commands, clean-checkout reproducibility, and boundary-safe file placement for config and results. ENG-12 implements, ENG-10 populates. | Clean-checkout run |

## Criteria this architecture cannot close, restated

- **AC-18's judgement half** — the product owner's under `final_user_visible_acceptance`. No
  workstream may record AC-18 as passed in full.
- **AC-01's second engine** — withdrawn by `DEC-20260809-001`. Gecko is an open item; no run may be
  blocked or failed for missing Gecko evidence, and no workstream may claim Gecko support it did not
  test.
- **The performance requirement** — no numeric budget exists in any artifact and none is invented
  here. Carried open (WS-01 **R-02**).
- **AC-19's `endedAt` offset reading** — ADR-003 reads "explicit UTC offset" as the `Z` designator. If
  a verifier requires a numeric `±HH:MM`, that must be settled before ENG-03 implements, because it
  changes the contract Unit 3 inherits.
