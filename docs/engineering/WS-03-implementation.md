# WS-03 — Frontend and Accessibility implementation notes

| Field | Value |
| --- | --- |
| Plan / workstream | `ENGPLAN-EVT-20260809-001` / WS-03, owner role ENG-03 |
| Request | `DEVREQ-EVT-20260809-001` (Unit 1) |
| Depends on | WS-02 (ADR-001 … ADR-005), complete |
| Branch | `codex/evt-20260809-001` |
| Authored | 2026-08-10 |

This is the workstream that builds the game. It implements the WS-02 decisions; it does not
re-decide them. Where this document and an ADR disagree, the ADR is right and this is a defect.

**Contract amendment applied.** The exported AC-01 text asks for Chromium *and* Gecko. That text is
superseded by `DEC-20260809-001` (`human-product-owner`, 2026-08-09) and by ADR-001: **one browser,
Chromium.** Gecko is an open item, not a Unit 1 criterion, and nothing here claims Gecko support.

---

## 1. What was built

A playable browser game at a single entry point, `src/index.html`. No sign-in, no server dependency,
no build step, no runtime dependency, no persistence, no network after the initial asset load.

Three states, and only three: `idle → running → run-end → (restart) running`.

| Key | Effect | Where it is named on screen |
| --- | --- | --- |
| `Space` | start / jump / restart | idle instruction, run-end instruction, key legend |
| `Up Arrow` | identical to Space, all session, no mode or rebinding | same three places |
| `Tab` | moves focus to the play area (browser default) | key legend |

Nothing else has an effect. The legend says so explicitly.

## 2. Module layout (ADR-002 §4)

```
src/
  index.html                  entry point: DOM UI layer + the canvas
  package.json                {"type":"module"} — see §7, note 1
  styles/game.css             layout, focus indicator, backing plates; NO colour literal
  main.js                     bootstrap: graph, input wiring, loop, in-page accessor
  engine/clock.js             injected monotonic + wall-clock sources
  engine/loop.js              requestAnimationFrame loop
  game/state-machine.js       three states, the transition table, signal emission
  game/run-state.js           createRunState() and the immutable configuration
  game/physics.js             gravity, jump impulse, grounded test, delta clamp
  game/obstacles.js           cactus spawn / advance / despawn (injected random)
  game/collision.js           axis-aligned overlap test
  game/score.js               integer, non-decreasing, time-derived score
  game/simulation.js          one frame of a run — see §7, note 2
  trace/score-trace.js        the record shape, append-on-run-end, the array
  render/palette.js           every colour; the closed background enumeration
  render/canvas-renderer.js   draws the play field
  render/hud.js               writes the DOM text layer and the CSS custom properties
  input/keyboard.js           Space / Up Arrow, preventDefault, repeat suppression
```

`src/game/**`, `src/trace/**`, `src/engine/clock.js` and `src/render/palette.js` reference no
`window`, `document` or DOM type — asserted by `tests/unit/source-hygiene.test.mjs`. `clock.js`
reaches its default time source as `globalThis.performance.now()`, which is the one indirection
ADR-002 §4 sanctions, and is what lets the whole simulation run under Node with an injected clock.

## 3. The state model and the signal

The state variable is written only by `transition()` in `state-machine.js`. Unlisted transitions are
no-ops. Every transition emits, in order: `data-game-state` on `#dino-dash`,
`window.dinoDash.getState()`, and a bubbling `dino-dash:statechange` `CustomEvent` carrying
`{from, to}`. CSS keys off `data-game-state`, so a signal that lied would be visibly wrong.

Entering `running` — from `idle` or from `run-end` — **replaces** the run-state object with a fresh
`createRunState()`. Nothing is scrubbed in place. Exactly two things outlive a run: the score-trace
array and the immutable configuration.

## 4. The score trace (ADR-003, verbatim)

```js
{ score: 428, endedAt: "2026-08-10T18:42:07.311Z", sessionLengthMs: 31402 }
```

Three fields, no more. `score` is the integer the run-end state displays. `endedAt` is
`new Date().toISOString()` — a UTC instant with the literal `Z` designator. `sessionLengthMs` is the
rounded difference of two `performance.now()` readings, taken on the run's first frame and at the
run-end transition; two wall-clock readings are never differenced. One record per run end, appended
by the `running → run-end` transition and by nothing else, chronological, oldest first.

Page memory only. There is no `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`,
`fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket` or `EventSource` anywhere in `src/` — asserted
by test, not by inspection — so discard-on-unload is by construction and there is deliberately no
unload handler.

Accessor, installed synchronously during bootstrap before the idle state is presented:

```js
window.dinoDash = Object.freeze({ version: 1, getScoreTrace(), getState(), getBackgroundVariations() })
```

`getScoreTrace()` returns a new array of new objects on every call, so observing cannot corrupt what
is being observed. Everything on the accessor is read-only and side-effect free; nothing is bound to
a key, so it creates no reachable state.

**The forgeability is accepted, not overlooked** (ADR-003 §5): every field is client-produced. No
anti-tamper measure was designed into Unit 1, deliberately.

## 5. Colour, contrast and the background enumeration

`src/render/palette.js` is the only file in the delivery containing a colour literal — asserted by
test, over `src/**` with comments stripped. The stylesheet consumes custom properties written from
the palette at runtime by `hud.js`.

Three closed, ordered background variations, selected deterministically by score:
`dawn` (0–99), `noon` (100–199), `dusk` (200+). Swaps are discrete; nothing tweens, nothing is
randomised, so no unenumerated colour is ever drawn. All player-facing text sits on a fully opaque
backing plate, so the background actually rendered behind any text is exactly one enumerated colour.

### Measured contrast (computed by `measureContrast()`; 33 pairs, 0 failures)

| Pair | dawn | noon | dusk | Threshold |
| --- | --- | --- | --- | --- |
| text on plate | 14.04 | 11.91 | 15.80 | 4.5 (AC-16) |
| heading on app shell | 13.64 | 11.91 | 15.80 | 4.5 (AC-16) |
| character vs sky | 11.12 | 11.95 | 11.62 | 3 (AC-17) |
| character vs ground line | 3.30 | 3.49 | 3.55 | 3 (AC-17) |
| character accent vs character | 7.19 | 9.89 | 8.91 | 3 |
| cactus vs sky | 10.34 | 10.90 | 11.00 | 3 (AC-17) |
| cactus vs ground line | 3.07 | 3.18 | 3.36 | 3 (AC-17) |
| cactus accent vs cactus | 8.64 | 9.41 | 8.39 | 3 |
| ground line vs sky | 3.37 | 3.43 | 3.28 | 3 (AC-17) |
| ground line vs ground | 4.05 | 3.48 | 4.82 | 3 (AC-17) |
| focus ring vs app shell | 11.39 | 10.28 | 12.05 | 3 (AC-14) |

The listed pairs are every place one surface is actually drawn against another: the character and
the cacti stand on the ground line and are otherwise surrounded by sky; the ground line borders the
sky above it and the ground band below it; accents are drawn strictly inside their parent shape;
text is on plates. Character-versus-ground-band and cactus-versus-ground-band are **not** listed
because nothing is ever drawn over the ground band except the ground line and its dashes.

Colour is carried by three distinct saturated hues per variation (character / cactus / ground line):
dawn 216° / 162° / 34°, noon 271° / 156° / 21°, dusk 340° / 162° / 42°, each with HSV saturation
above 0.25 — the machine-checkable half of AC-18. **The "modern and colourful" judgement half is the
product owner's under `final_user_visible_acceptance` and is not claimed here.**

## 6. Stated commands

Run from a clean checkout at the repository root. Node 20 LTS or newer (verified on Node v22.23.2).

```
node --test "tests/unit/*.test.mjs"                      unit + whole-run integration tier
node --test-reporter=junit --test-reporter-destination=tests/.results/unit.xml --test "tests/unit/*.test.mjs"
                                                          the same tier, machine-readable
node tests/tools/static-server.mjs 4173                   serve src/ at http://127.0.0.1:4173/
```

The delivery has **zero runtime dependencies** and the commands above need none: the test tier is
`node:test` / `node:assert`, and the static server is a ~50-line zero-dependency script. ES modules
do not load over `file://` in Chromium (ADR-001 §4), so the game must be served.

**WS-12 (ENG-12) owns `package.json`, the lockfile, the pinned dev-dependency server, the Playwright
browser tier and the npm scripts** that ADR-005 §4 specifies (`npm ci`, `npm start`, `npm test`,
`npm run a11y`). None of those files exist at this revision, so the commands above are what runs
today; WS-12 may supersede both the server script and the invocation form. The install step touches
the network; the game never does.

## 7. Deviations and judgement calls, stated

1. **`src/package.json` containing `{"type":"module"}`.** Without a `package.json`, Node resolves
   `src/**/*.js` as CommonJS and the unit tier cannot import the delivery at all. The root
   `package.json` belongs to WS-12 and does not exist yet. This file is inside the WS-03 write
   boundary, is ignored by browsers, and becomes redundant (harmlessly) if WS-12 sets `"type":
   "module"` at the root.
2. **`src/game/simulation.js` is an addition to the ADR-002 §4 module list.** It holds the per-frame
   advance that would otherwise live inside `main.js`, and it is on the DOM-free side of the
   boundary, so the whole run — score accrual, obstacle traffic, gravity, collision — is drivable in
   Node with an injected clock and an injected random source. The boundary rule is unchanged; only
   the file count is. This is what `tests/unit/run-loop.test.mjs` exercises.
3. **`input/keyboard.js` matches `KeyboardEvent.code` first and falls back to `KeyboardEvent.key`.**
   Physical presses always carry `code`; the fallback exists because some automation harnesses
   dispatch key events with `key` only. It recognises the same two keys and names no third one.
4. **A focusable play area.** AC-14 governs focus "wherever a focusable control exists". A page with
   no focus stop at all would satisfy it vacuously; instead `#dd-stage` is a single labelled focus
   stop with a 5px palette-coloured outline at 4px offset. Key handling is bound to `window`, so the
   game is fully operable whether or not that element holds focus, and focus can never be trapped.
5. **`tests/tools/static-server.mjs`** exists because the delivery must be runnable at this revision.
   It serves `src/` only, binds to `127.0.0.1`, and is not part of the game.

## 8. Known limitations, stated rather than hidden

- **The canvas is `aria-hidden`.** Gameplay is not conveyed to assistive technology. This is
  ADR-002's recorded known limitation, not a satisfied requirement; no acceptance criterion in Unit 1
  requires a non-visual representation of gameplay.
- **No frame-rate or input-latency budget is asserted.** None exists in any artifact (WS-01 **R-02**).
- **AC-18's judgement half and AC-30's clean-checkout run are not closable by WS-03.** The first is
  the owner's; the second needs WS-12's commands and WS-10's browser tier.
- **`endedAt` uses the `Z` designator** for AC-19's "explicit UTC offset", per ADR-003. A verifier
  requiring a numeric `±HH:MM` would read it differently; that interpretation risk is ADR-003's and
  is unchanged here.
