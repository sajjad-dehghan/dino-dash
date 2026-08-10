# ADR-002: Unit 1 rendering approach, state model, and module layout

- Status: accepted
- Request: DEVREQ-EVT-20260809-001
- Plan / workstream: ENGPLAN-EVT-20260809-001 / WS-02
- Owner: ENG-02
- Independent verifier: ENG-15
- Decided: 2026-08-10

## Context

Unit 1 is one static browser page: three states (idle, running, run-end), no backend, no storage, no
network at runtime, no identity, one default character. The contract leaves method entirely to
engineering ("This contract specifies no framework, language, build tool, rendering approach, module
layout or test framework, beyond requiring the browser entry point to live under `src/`").

WS-01 records this as hard dependency **D-01** (module layout, entry-point path, rendering approach)
and **D-04** (state machine and reset semantics) for WS-03, and assigns `GATE-ARCHITECTURE` to WS-02.

Three acceptance criteria constrain the design more than the game rules do:

- **AC-14** requires visible focus, a predictable focus order, and no focus trap wherever a focusable
  control exists in any state. A `<canvas>` cannot host focus stops or accessible names.
- **AC-16 / AC-17** require *measured* contrast ratios against the background *actually rendered*.
  Measurement must be finite and repeatable (see ADR-004).
- **AC-13 / AC-26** are properties of the state model, not of any handler: restart must reset
  everything, and exactly three states must be reachable.

## Options considered

**Rendering**

1. **All-canvas** — character, obstacles, ground, score readout and all instruction text drawn into
   one 2D context. Simplest render path. Rejected: canvas text has no accessible name, cannot take
   focus, cannot show a focus ring, and AC-16 then has to sample a text glyph's anti-aliased pixels,
   which yields a ratio that depends on the sample point. AC-14 becomes unsatisfiable.
2. **All-DOM** — character, cacti and ground as positioned elements animated per frame. Viable at
   this scale, and gives text for free. Rejected: per-frame layout of moving elements couples the
   game loop to the layout engine, and AC-17's "sample representative rendered pixels of the element
   and of the adjacent background" is awkward when the element has borders, box shadows and
   sub-pixel positioning.
3. **Hybrid: canvas play field + DOM UI layer.** Chosen.

**State model**

1. Boolean flags (`isRunning`, `isOver`). Rejected: representable illegal states, and AC-26 becomes
   an argument about which flag combinations exist rather than an enumeration.
2. A single state variable with a declared transition table. Chosen.
3. A state-pattern class hierarchy. Rejected as ceremony at this scale.

**Reset semantics (AC-13)**

1. Mutate the existing run state back to its starting values. Rejected: every field added later is a
   field someone can forget to reset. AC-13 failures of this class are silent.
2. Discard and reconstruct. Chosen.

**Module layout**

1. One file. Rejected: nothing is unit-testable without a browser, so every assertion under AC-30
   costs a browser round trip.
2. Split by technical layer with an explicit DOM-free core. Chosen.

## Decision

### 1. Rendering: canvas play field, DOM UI layer

- A single `<canvas>` renders **only** the play field: background, ground line, the character, the
  cacti. It is `aria-hidden="true"` and is never focusable — it carries no information that is not
  also available in the DOM layer or through the state signal (ADR-004).
- **Every character of player-facing text lives in the DOM**, layered over the canvas: the score
  readout, the idle start instruction, the run-end text and the restart instruction. Text is real
  text with computed styles.
- All player-facing text sits on an **opaque backing plate** — a solid, fully opaque background
  colour behind the text, from the enumerated palette (ADR-004). **No partial transparency is
  permitted anywhere behind text.** This is the mechanism that makes AC-16 finite: the background
  actually rendered behind a text element is exactly one enumerated colour, not whatever canvas
  pixel happens to be scrolling past.
- The canvas is sized in CSS pixels with an explicit device-pixel-ratio scale, so pixel sampling for
  AC-17 reads the colours the palette declares rather than a resampled blend.

### 2. State model: three states, four transitions, nothing else

States are exactly `idle`, `running`, `run-end` — the same three words the contract uses, used
verbatim as identifiers so nothing is lost in translation between contract, code, signal and
evidence.

The complete transition table:

| From | Event | To |
| --- | --- | --- |
| `idle` | start key (Space or Up Arrow) | `running` |
| `running` | character contacts a cactus | `run-end` |
| `run-end` | restart key | `running` |

Rules that make this checkable rather than aspirational:

- The state variable is written **only** by a single `transition(event)` function in
  `src/game/state-machine.js`. No other module assigns it.
- A transition not present in the table is a **no-op**, not an error and not a new state. Pressing
  the jump key in `run-end`, or any unlisted key in any state, changes nothing. This is what makes
  AC-26's exhaustive key sweep terminate at three.
- There is no pause state, no settings state, no menu, no "loading" state. The idle state is reached
  synchronously on bootstrap; there is nothing to wait for (ADR-001, zero runtime dependencies).
- Every transition emits the state signal defined in ADR-004. The signal is emitted **by**
  `transition()`, not by callers, so it cannot drift from the actual state.

### 3. Reset semantics: reconstruct, never scrub

- All per-run data lives in a single object produced by a factory, `createRunState()` in
  `src/game/run-state.js`: score, elapsed monotonic start mark, character position and velocity,
  grounded flag, the obstacle list, the spawn timer, the background variation index.
- Entering `running` — from `idle` **or** from `run-end` — **replaces** the run-state object with a
  freshly constructed one. Nothing is reset in place, so nothing can be forgotten. AC-13 reduces to
  "does `createRunState()` return starting values", which is a pure unit test.
- Exactly two things outlive a run and they are named here so that "what persists" is a closed list:
  1. the **score-trace array** (ADR-003), which is required to accumulate across restarts by AC-22;
  2. immutable configuration (palette, physics constants, layout constants), which is never written
     at runtime.
  Anything else surviving a restart is a defect.

### 4. Module layout under `src/`

Entry point: **`src/index.html`** — the single entry point AC-01 names.

```
src/
  index.html                  entry point; markup for the DOM UI layer and the canvas
  styles/game.css             layout, focus indicator, backing plates, colour custom properties
  main.js                     bootstrap: builds the graph, wires input, starts the loop,
                              installs the in-page accessor. The only module with import-time effects.
  engine/
    clock.js                  monotonic time source (ADR-003); the only reader of performance.now()
    loop.js                   requestAnimationFrame loop; injects the clock, calls update() then render()
  game/
    state-machine.js          the three states, the transition table, state-change emission
    run-state.js              createRunState(); per-run data only
    physics.js                gravity, jump impulse, grounded test
    obstacles.js              cactus spawn, advance, despawn
    collision.js              axis-aligned overlap test
    score.js                  integer, monotonically non-decreasing score accrual
  trace/
    score-trace.js            the record shape, the append-on-run-end rule, the accessor (ADR-003)
  render/
    palette.js                colours and the closed background-variation enumeration (ADR-004)
    canvas-renderer.js        draws the play field
    hud.js                    updates the DOM UI layer text
  input/
    keyboard.js               Space / Up Arrow handling and preventDefault (AC-05)
```

**The testability boundary is a rule, not a suggestion.** `src/game/**`, `src/trace/**`,
`src/engine/clock.js` and `src/render/palette.js` **must not reference `window`, `document`,
`performance` or any DOM type directly** — `clock.js` takes its time function by injection and
defaults to `performance.now`. Only `main.js`, `engine/loop.js`, `render/canvas-renderer.js`,
`render/hud.js` and `input/keyboard.js` touch the DOM. Consequence: the score, collision, state
machine, reset and trace logic are unit-testable in Node with no DOM shim, which is what makes the
zero-dependency unit tier in ADR-005 possible.

### 5. Timing and fairness

The loop is `requestAnimationFrame`-driven and **advances simulation by measured delta time**, not by
frame count, with the delta clamped to a maximum step so that a backgrounded tab does not teleport
the character through a cactus on return. Score accrual is a function of elapsed run time, not of
frames rendered, so the score sequence is non-decreasing and frame-rate independent (AC-08).

No frame-rate or input-latency budget is asserted. The contract's performance NFR is explicitly
UNKNOWN with no numeric target and WS-01 carries it open as **R-02**; ENG-02 does not invent one.

## Consequences and trade-offs

- **Two render targets to keep in sync.** The score exists in the DOM (visible, AC-08/AC-09) while
  the play field is canvas. The mitigation is directional: the DOM layer is written *from* run state
  once per frame and never read back. Run state is the single source of truth; the display cannot
  lead it.
- **The opaque-plate rule constrains visual design.** No text over a translucent scrim, no text
  directly over the moving play field. This is a real cost paid deliberately to convert AC-16 from an
  unbounded sampling problem into a finite one.
- **`aria-hidden` on the canvas means the play field is not conveyed to assistive technology.**
  Unit 1's contract requires keyboard operability and contrast (AC-12, AC-14, AC-16, AC-17); it does
  not require a non-visual representation of gameplay, and no acceptance criterion mentions screen
  readers. This is recorded as a **known limitation, not a satisfied requirement** — see
  `docs/architecture/unit-1-architecture-notes.md`.
- **Reconstruct-on-restart allocates a new object per run.** At one object per run this is not a
  performance consideration; it is bought for AC-13 correctness.
- **The module split is finer than a small game needs** if judged on the game alone. It is sized for
  AC-30: every module on the DOM-free side of the boundary is one that ENG-10 can assert against
  without a browser.

## Migration, rollback, and evidence

- **Evidence:** this ADR; the module tree at the delivery revision; the unit tier asserting the
  transition table, `createRunState()` starting values and score monotonicity; the browser tier
  asserting focus visibility and order (AC-14) and pixel-sampled contrast (AC-16/AC-17).
- **Rollback:** no runtime state, no data, no deployment. Reverting the commit reverts the design.
- **Forward compatibility:** Unit 2 adds persistence, Unit 3 a shared score table. Both attach at the
  seams already named here — the score-trace array (ADR-003) is the Unit 3 seam, and no other module
  is on that path. Nothing in Unit 1 is designed for those units beyond the trace shape, per the
  contract's non-goals text.
