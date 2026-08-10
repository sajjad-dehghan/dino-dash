# ADR-004: Observability affordances — the state signal and the background-variation enumeration

- Status: accepted
- Request: DEVREQ-EVT-20260809-001
- Plan / workstream: ENGPLAN-EVT-20260809-001 / WS-02
- Owner: ENG-02
- Independent verifier: ENG-15
- Decided: 2026-08-10

## Context

Two acceptance criteria are, as written, uncheckable by anyone who did not write the game — and both
are cheap to make checkable now and expensive to retrofit after ENG-03 has finished.

**AC-26** requires that the complete set of states reachable by any keyboard input is *exactly*
three. Its verification presses every key in every state and records "every distinct state entered".
With no machine-readable notion of state, "distinct state entered" is the tester's opinion about what
they saw on screen, and the criterion is not reproducible.

**AC-16 / AC-17** require contrast ratios "in every state and against **every background variation**"
and, for AC-17, screenshots "covering **every** background variation the game produces". A
completeness claim over an unenumerated set is not a claim anyone can verify. If the renderer varies
its background continuously — a gradient over time, a randomized hue, a tween between two looks — the
set is infinite and the criterion cannot be closed at all.

These are architecture problems, not testing problems: they are properties of what the renderer is
allowed to do and of what the page exposes.

## Options considered

**State signal**

1. **No signal** — testers infer state from screenshots. Rejected: AC-26 becomes tester opinion,
   which is what this ADR exists to prevent.
2. **Accessor function only** (`window.dinoDash.getState()`). Checkable, but requires polling and
   misses transitions between polls.
3. **DOM attribute only** — `data-game-state` on the game root. Observable by CSS, by selector, by
   screenshot tooling, and it is visible in a saved DOM snapshot. Misses transitions between reads.
4. **Event only** — a `CustomEvent` per transition. Catches every transition, but an observer that
   attaches late sees nothing and cannot ask "what state is it in now".
5. **All three of 2, 3, 4, emitted from one place.** Chosen — they answer three different questions
   and cost one function.

**Background variations**

1. **Continuous variation** (time-based gradient, per-run randomized hue). Most visually interesting,
   and it makes AC-16/AC-17 completeness formally unprovable. Rejected.
2. **A closed enumeration, swapped discretely.** Chosen.
3. **A single fixed background.** Trivially checkable, and in tension with the owner's "modern and
   colourful, not black-and-white" (`DEC-20260809-001`) and with AC-16's own verification, which asks
   for "at least two different background conditions during a run". Rejected.

## Decision

### 1. The state signal — one emission point, three observation modes

`transition()` in `src/game/state-machine.js` is the only writer of state (ADR-002). On every
transition it emits, in this order:

1. **DOM attribute.** `data-game-state` on the game root element `#dino-dash`, set to exactly one of
   `idle`, `running`, `run-end`. Present from bootstrap, before the idle state is presented. Read as
   `document.querySelector("#dino-dash").dataset.gameState`.
2. **Accessor.** `window.dinoDash.getState()` returns the same string (ADR-003 §4).
3. **Event.** A `CustomEvent` named `dino-dash:statechange`, dispatched on `#dino-dash`, bubbling,
   with `detail: { from, to }` where both are values from the same three-word set.

Rules:

- **The value set is closed at three**: `idle`, `running`, `run-end`. These are the contract's own
  words, used verbatim as identifiers. No fourth value, ever, in Unit 1 — not `loading`, not
  `paused`, not `transitioning`.
- The signal is emitted **by** the transition function, never by callers, so it cannot drift out of
  sync with the state it reports.
- The signal is **read-only from outside**: writing `data-game-state` from the console or dispatching
  a forged event changes nothing about the game. There is no setter and no listener that acts on it.
- CSS may key off `data-game-state` for showing and hiding the per-state UI. That is a deliberate
  second benefit: the attribute becomes load-bearing for what is on screen, so a signal that lied
  would be visibly wrong rather than quietly wrong.

**What this makes checkable.** AC-26's exhaustive key sweep becomes: press every key in every state,
collect the observed set of `data-game-state` values plus every `dino-dash:statechange` `detail.to`,
and assert the union equals `{idle, running, run-end}`.

**What it does not prove, stated plainly.** The signal is a claim by the implementation, not
independent proof. A hypothetical fourth view that never updated the attribute would not appear in
it. AC-26's evidence must therefore pair the signal with a DOM/visual assertion that no leaderboard,
score table, catalogue, settings, profile, lobby or presence view exists in the document at all. The
signal makes the criterion reproducible; it does not make it self-certifying.

### 2. The background-variation enumeration

- **`src/render/palette.js` is the single source of truth** for every colour the game renders —
  play-field colours, character, cacti, ground line, text colours and text backing plates. The
  renderer, the stylesheet's custom properties and the tests all derive from it. No colour literal
  may appear anywhere else in the delivery.
- The background variations are a **closed, ordered, exported enumeration**. Each entry:

  ```js
  { id: "dawn", label: "Dawn", sky: "#...", ground: "#...", groundLine: "#...",
    character: "#...", cactus: "#...", textOn: "#...", plate: "#..." }
  ```

- **Recommended size: three or four.** Enough for "modern and colourful" and for AC-16's "at least
  two different background conditions during a run"; small enough that the AC-16/AC-17 measurement
  matrix stays reviewable. ENG-03 chooses the exact number and the colours; the enumeration being
  closed and exported is not ENG-03's to change.
- **Selection is deterministic**: the active variation is a pure function of the run's score
  thresholds (`variationForScore(score)`), so the same run reaches the same variations in the same
  order. Not random, not wall-clock-driven.
- **Transitions are discrete swaps, not tweens.** Interpolating between two variations would render
  colours that are in no enumeration entry, and every such intermediate colour is an unmeasured
  background. If a visual softening is wanted, it must be a change that does not alter the sampled
  colours — never a colour tween behind text or behind a game element.
- **No per-frame randomization, no gradients behind text, no alpha behind text.** Text backing plates
  are fully opaque (ADR-002), so the background actually rendered behind any text is exactly one
  enumerated `plate` colour.
- **Exposure for evidence.** `window.dinoDash.getBackgroundVariations()` returns a copy of the full
  enumeration (ADR-003 §4). ENG-10 iterates it rather than guessing what exists.

**What this makes checkable.** The AC-16 matrix is `{4 text elements} × {3 states} × {enumerated
plate colours}` — finite, enumerable, and complete by construction. The AC-17 matrix is
`{character, cactus, ground line} × {enumerated variations}`. Both are computable from
`palette.js` alone, which means ENG-10 can also assert the thresholds **statically** in the unit tier
(compute the WCAG ratio for every pair in the enumeration and assert ≥ 4.5:1 and ≥ 3:1) and use the
rendered-pixel sampling in the browser tier to confirm that what is drawn matches what the palette
declares. A palette that cannot pass the static check fails before a screenshot is ever taken.

### 3. What is deliberately not exposed

- **No test-only mutation of game state.** No function forces a state, sets a score, spawns an
  obstacle or ends a run. Everything the accessor exposes is read-only (ADR-003 §4), so no observation
  affordance can create a fourth reachable state or an unnamed key effect (AC-15, AC-26).
- **No debug overlay, no console logging in normal operation.** AC-01 requires zero console errors;
  ENG-02 additionally requires zero console output of any kind at runtime, so that "the console is
  clean" is a single unambiguous observation rather than a judgement about which messages are benign.
- **No query-string or hash-driven modes.** A `?debug=1` branch would be a second entry configuration
  outside AC-01's single entry point and a candidate fourth state.

## Consequences and trade-offs

- **The renderer is constrained in a way a game normally is not**: no continuous colour variation, no
  colour tweening. This is a real expressive cost, paid to make AC-16 and AC-17 closable. Motion,
  parallax, shape and timing are all unconstrained — the constraint is on *colour*, and only on
  sampled surfaces.
- **`data-game-state` is a public detail of the page.** It is read-only and reveals nothing that is
  not already on screen.
- **A three-value closed set means Unit 2+ cannot add a state without amending this ADR.** Intended:
  AC-26 is a Unit 1 property, and a later unit adding a state must do so as a recorded decision.
- **The palette-as-single-source rule will be violated the first time someone hard-codes a hex value
  in CSS.** Mitigation is a review item for ENG-01 and an assertion ENG-10 can automate: no colour
  literal outside `src/render/palette.js` and the custom-property block it feeds.

## Migration, rollback, and evidence

- **Evidence:** this ADR; the exported enumeration at the delivery revision; the unit tier's static
  WCAG computation over every palette pair; the browser tier's key sweep collecting
  `data-game-state` and `dino-dash:statechange`; the AC-16/AC-17 screenshots and sampled pixel values
  keyed by variation `id`.
- **Rollback:** documentation-only; no runtime state.
- **Handoff:** ENG-03 implements the signal and the enumeration; ENG-10 consumes both as its
  enumeration source for AC-16/AC-17 completeness and AC-26 state collection. WS-01 flags **R-01**
  (contrast measured twice by two methods); the palette-as-single-source rule is the resolution —
  one declared set of colour pairs, statically computed once, confirmed against rendered pixels.
