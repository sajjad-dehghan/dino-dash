# Dino Dash Unit 1 — operating and architecture overview

**For someone joining cold.** Read this, then `docs/runbook.md` to run it, then
`docs/score-trace-contract.md` if you are building Unit 3.

| | |
| --- | --- |
| Request / plan | `DEVREQ-EVT-20260809-001` / `ENGPLAN-EVT-20260809-001`, WS-13 (ENG-14) |
| Normative sources | ADR-001 … ADR-005 under `docs/architecture/decisions/` |
| `src` tree documented | `0566d5d39599d0cdf374b5dee27d22afdb544c41` — sealed at WS-03, unchanged since |

---

## 1. What it is, in one paragraph

One static browser page. A side-scrolling jump-over-the-cactus game with three states, one default
character, keyboard-only input, and a score. **No backend, no build step, no runtime dependency, no
storage, no network at runtime, no identity, no accounts, no persistence.** Open `src/index.html`
through any static server and it runs. `src/` is 15 ES modules plus a document and a stylesheet —
42,517 bytes over 17 requests, and the bytes on disk equal the bytes on the wire because nothing sits
between the reviewed source and the running artifact.

## 2. The three states — and there are exactly three

`idle`, `running`, `run-end`. The contract's own three words, used verbatim as identifiers so nothing
is lost in translation between contract, code, signal and evidence.

| From | Event | To |
| --- | --- | --- |
| `idle` | start key (`Space` or `Up Arrow`) | `running` |
| `running` | character contacts a cactus | `run-end` |
| `run-end` | restart key | `running` |

- The state variable is written **only** by `transition(event)` in `src/game/state-machine.js`. No
  other module assigns it.
- **A transition not in the table is a silent no-op** — not an error, not a new state. Pressing jump
  in `run-end`, or any unlisted key in any state, changes nothing. This is what makes an exhaustive
  key sweep terminate at three.
- **There is no pause, settings, menu or loading state.** `idle` is reached synchronously at
  bootstrap; there is nothing to wait for.
- **Restart reconstructs, it never scrubs.** Entering `running` — from `idle` *or* from `run-end` —
  **replaces** the run-state object with a freshly built one from `createRunState()`. Nothing is reset
  in place, so nothing can be forgotten. "Does restart reset everything" reduces to "does the factory
  return starting values", which is a pure unit test.
- **Exactly two things outlive a run**, and this is a closed list: the score-trace array
  (`docs/score-trace-contract.md`) and immutable configuration (palette, physics and layout
  constants, never written at runtime). Anything else surviving a restart is a defect.

## 3. Rendering: canvas play field, DOM text layer

A hybrid, chosen so accessibility is achievable rather than argued about.

- **One `<canvas>` renders only the play field** — background, ground line, character, cacti. It is
  `aria-hidden="true"` and is **never focusable**.
- **Every character of player-facing text lives in the DOM**, layered over the canvas: score readout,
  idle start instruction, run-end text, restart instruction. Real text with computed styles.
- **All player-facing text sits on a fully opaque backing plate.** No partial transparency anywhere
  behind text. This is the mechanism that makes contrast measurement *finite*: the background actually
  rendered behind a text element is exactly one enumerated colour, not whatever canvas pixel happens
  to be scrolling past.
- **The DOM layer is written *from* run state once per frame and never read back.** Run state is the
  single source of truth; the display cannot lead it.
- Exactly one focusable element exists in the page: `#dd-stage`, `tabindex="0"`.

## 4. The DOM-free core — the rule that makes everything testable

**`src/game/**`, `src/trace/**`, `src/engine/clock.js` and `src/render/palette.js` must not reference
`window`, `document`, `performance` or any DOM type.** `clock.js` takes its time function by injection
and defaults to `performance.now`.

Only `main.js`, `engine/loop.js`, `render/canvas-renderer.js`, `render/hud.js` and `input/keyboard.js`
touch the DOM.

```
src/
  index.html                entry point; DOM UI layer markup + the canvas
  styles/game.css           layout, focus indicator, backing plates, colour custom properties
  main.js                   bootstrap — the only module with import-time effects
  engine/clock.js           monotonic time; the only reader of performance.now
  engine/loop.js            requestAnimationFrame loop; update() then render()
  game/state-machine.js     three states, the transition table, the state signal
  game/run-state.js         createRunState(); per-run data only
  game/physics.js           gravity, jump impulse, grounded test
  game/obstacles.js         cactus spawn, advance, despawn
  game/collision.js         axis-aligned overlap test
  game/score.js             integer, non-decreasing score accrual
  game/simulation.js        advanceRun() — the whole per-frame simulation
  trace/score-trace.js      the record shape and the append-on-run-end rule
  render/palette.js         colours + the closed background-variation enumeration
  render/canvas-renderer.js draws the play field
  render/hud.js             writes the DOM text layer
  input/keyboard.js         Space / Up Arrow, preventDefault
```

**Consequence:** score, collision, state machine, reset and trace logic are unit-testable in Node with
no DOM shim and no dependency. That is why a 114-test tier runs with zero install.

The module split is finer than a game this size needs *if judged on the game alone*. It is sized so
every module on the DOM-free side is one that can be asserted against without a browser.

## 5. The palette is the single source of colour

**`src/render/palette.js` is the only place a colour may exist in this delivery.** The renderer, the
stylesheet's custom properties and the tests all derive from it. `tests/unit/source-hygiene.test.mjs`
asserts that no colour literal appears anywhere else under `src/`.

- **Background variations are a closed, ordered, exported enumeration** — three of them at this
  revision (`dawn`, `noon`, `dusk`), each carrying `sky`, `ground`, `groundLine`, `character`,
  `cactus`, `textOn` and `plate`.
- **Selection is deterministic**: a pure function of the run's score thresholds. Not random, not
  wall-clock-driven — the same run reaches the same variations in the same order.
- **Transitions are discrete swaps, never tweens.** Interpolating would render colours that are in no
  enumeration entry, and every such intermediate colour is an unmeasured background. No per-frame
  randomization, no gradients behind text, no alpha behind text.
- **Why it matters:** it converts "contrast in *every* background variation" from an unprovable claim
  over an infinite set into a finite 33-row matrix (3 variations × 11 declared pairs) that a command
  computes — `npm run evidence:a11y`. Motion, parallax, shape and timing are unconstrained; the
  constraint is on *colour*, and only on sampled surfaces.

## 6. Observability affordances — three, all read-only

All emitted from the single `transition()` writer, so they cannot drift from the state they report.

| Affordance | Read as | Answers |
| --- | --- | --- |
| `data-game-state` attribute on `#dino-dash` | `document.querySelector("#dino-dash").dataset.gameState` | "What state is it in *right now*?" — also visible in a DOM snapshot, and load-bearing for CSS, so a lying signal would be visibly wrong |
| `window.dinoDash` (frozen) | `.getState()`, `.getScoreTrace()`, `.getBackgroundVariations()`, `.version` | "What state, what runs have ended, what backgrounds exist?" |
| `dino-dash:statechange` `CustomEvent` | bubbling on `#dino-dash`, `detail: { from, to }` | "What transitions happened, in order?" |

Writing `data-game-state` from the console or dispatching a forged event changes nothing. There is no
setter and no listener that acts on either.

**These are verification affordances, not production telemetry.** Nothing in this document upgrades
them into telemetry by describing them.

## 7. Timing

- The loop is `requestAnimationFrame`-driven and **advances the simulation by measured delta time**,
  not by frame count, with the delta **clamped at 50 ms** so a backgrounded tab cannot teleport the
  character through a cactus on return. Measured: a 60-second frame gap advances the world 36 px
  instead of 2,592,000 px.
- **Score accrual is a function of elapsed run time, not frames rendered.** Measured: 30 / 60 / 144
  fps over the same 60,000 ms produce **the identical score, 600 — zero divergence**.
- **The jump arc is not frame-rate independent.** Apex is 134.44 px at 30 fps and 145.88 px at
  144 fps — an 8.5 % spread, against a 66 px character and an 82 px tallest cactus. This is
  semi-implicit Euler arithmetic, not a defect, and every fixed-step-integrated game has it. It is
  measured and **not judged**: whether it is "fair" is a product decision (§9, PERF-R-01).
- `sessionLengthMs` comes from a monotonic source; `endedAt` is the one place the wall clock is read.
  A mid-run system-clock change therefore moves `endedAt` and leaves `sessionLengthMs` correct. That
  asymmetry is intended.

## 8. What is deliberately absent

Not missing. Removed from scope, and in most cases required to be absent.

| Absent | Count / status |
| --- | --- |
| `localStorage`, `sessionStorage`, IndexedDB, cookies | **0 call sites.** The only textual matches in `src/` are two comments stating the absence |
| `window.name`, `history.pushState`/`replaceState` side channels | **0** |
| `fetch`, `sendBeacon`, `XMLHttpRequest`, WebSocket — any egress | **0** |
| `console.*` — any log, warn, error, debug | **0**. A clean console must be a single unambiguous observation |
| `try` / `catch` | **0** anywhere. Errors propagate rather than being silently swallowed |
| `window.onerror`, `unhandledrejection`, `PerformanceObserver`, RUM/crash SDK | **0** |
| Pointer, mouse or touch handler | **0**. Exactly one listener type is registered: `keydown` |
| Identity surface — sign-in, profile, nickname, any form control | **0**. Zero `<button>` elements, one `<canvas>` |
| Catalogue / economy — unlock, balance, currency, shop, leaderboard, lobby | **0** (35 tokens asserted absent) |
| Query-string or hash-driven modes (`?debug=1`) | **0**. One entry point, no second configuration |
| Test-only mutation of game state | **0**. Nothing forces a state, sets a score, spawns an obstacle or ends a run |
| Build step, bundler, minifier, runtime dependency, dev dependency | **0** |
| Unload / `beforeunload` handler | **0**, deliberately. There is no persistence path to flush, and one would disqualify the page from the back/forward cache |

**Plainly: there is no logging, no error reporting, no metrics, no tracing, no crash capture, no
alerting and no dashboard.** An unhandled exception in the frame callback would stop the loop with
nothing recorded anywhere except the browser's own console. This is a consequence of the contract, not
a gap in the implementation — logging would put text in a console that must be clean, metrics would
need an egress path that is forbidden, and a metric would touch an identity surface that must not
exist. **A later unit with a server must not assume any of it already exists.**

**Recovery, stated once:** on reload everything is lost — the score, the run, the character position,
the obstacle field and the entire accumulated score trace — and the page comes up in `idle` exactly as
on a first visit. There is no autosave, no resume, no crash recovery. Because nothing is written
anywhere, there is nothing to corrupt, migrate, back up or restore. The recovery procedure is "reload
the page".

## 9. Known gaps you inherit

Full list with evidence in `docs/runbook.md` §6. The headlines:

1. **There is no browser tier.** A cold Playwright acquisition was attempted and produced zero bytes
   in ten minutes. Fourteen acceptance criteria have partial or no machine evidence for this single
   reason.
2. **The rendered-pixel half of AC-16 / AC-17 is unmeasured.** The contrast command measures the
   declared palette. A failing row proves the palette cannot pass; a passing row does not close the
   criterion.
3. **The performance budget is unset and must not be invented.** The request states it is UNKNOWN and
   that any budget asserted before a device baseline exists must be rejected. `GATE-PERFORMANCE` and
   `GATE-RELIABILITY` are recorded gaps, not passes. **PERF-R-01**: the jump-apex spread in §7 is the
   measurement most directly relevant to the contract's "jump timing is fair" phrase, and the fairness
   judgement is the owner's.
4. **WS-09 finding F-01 is guarded, not fixed.** `transition()` resolves through the prototype chain;
   inherited `Object.prototype` names are accepted as events, drive the state off the declared
   enumeration and brick the machine. Unreachable at this revision because every call site passes a
   pinned literal, now characterised and containment-tested, **and not fixed** — `src/` is sealed.
5. **`endedAt`'s `Z` designator is an open interpretation risk** against AC-19's "explicit UTC offset".
   See `docs/score-trace-contract.md` §2.
6. **Client-side score forgeability is the owner's accepted risk** (`DEC-20260809-001`), bounded to
   Units 1 and 2. No engineering workstream may re-accept or extend it, and none has. It does **not**
   extend to the time-derived score accrual in a hidden tab described in
   `docs/score-trace-contract.md` §5.
7. **The score trace grows without bound by design** — ~58.3 B per record, one record per run end.
   Harmless at Unit 1 scale; inherited by Unit 3 at the seam.
8. **The play field is not conveyed to assistive technology.** The canvas is `aria-hidden`. Unit 1's
   contract requires keyboard operability and contrast, not a non-visual representation of gameplay,
   and no acceptance criterion mentions screen readers. Recorded as a **known limitation, not a
   satisfied requirement**.
