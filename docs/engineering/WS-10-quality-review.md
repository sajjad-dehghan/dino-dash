# WS-10 — Quality Engineering

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-10, owner role ENG-10, producer actor `actor-eng-10`, domain `quality_engineering` |
| Plan dependencies | WS-03, WS-04, WS-05, WS-06, WS-07, WS-08, WS-09, WS-11, WS-12 — all `completed` |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `bd43f5f81f7d641bf3b18fca20d879d09c969776` |
| Gate owned | `GATE-AUTOMATED-TESTS` (**required: true**) |
| Disposition | **Discharged for the unit tier, with one declared gap: there is no browser tier.** (§8) |
| Unit tier | **61 → 114 tests, 114 pass, 0 fail.** Six new files, 53 new tests |
| Authored | 2026-08-11 |

WS-10 is the last workstream before independent verification, and five earlier workstreams
deferred a runtime gap to it. This record does three things: it adds the tests those
workstreams named, it states AC by AC what has machine evidence and what does not, and it
records what happened when the browser tier was attempted.

**The single most important sentence in this document is in §8: the browser tier does not
exist, was attempted here, and failed. `GATE-AUTOMATED-TESTS` is therefore discharged for
what the unit tier actually covers and the remainder is declared as a gap, not absorbed
into a pass.**

---

## 1. What WS-10 added

Six test files under `tests/unit/`, all zero-install, all matching the existing
`npm test` glob, plus one measurement harness under `tests/tools/`.

| File | Tests | The gap it was written for |
| --- | ---: | --- |
| `tests/unit/state-machine-prototype.test.mjs` | 8 | **WS-09 F-01** — `transition()` accepts inherited `Object.prototype` names. No test guarded it (§2) |
| `tests/unit/keyboard-journey.test.mjs` | 12 | **WS-12 R-07** — AC-12's keyboard-only journey had no machine evidence (§3) |
| `tests/unit/absent-surface.test.mjs` | 10 | **WS-06 L-06** — 35 storage tokens checked by hand, 5 asserted; plus WS-09's injection and identity token sets (§4) |
| `tests/unit/frame-gap-accrual.test.mjs` | 8 | **WS-05 §3.8** — score accrual across a frame gap; only the physics clamp was covered (§5) |
| `tests/unit/score-format-extremes.test.mjs` | 8 | **WS-09 F-02 / L-06** — `formatScore` at extreme inputs (§6) |
| `tests/unit/trace-contract.test.mjs` | 7 | **AC-29** — the documented field contract and the delivered behaviour could drift silently |
| `tests/tools/ac-coverage.mjs` | — | the matrix in §7, as a command that fails when it is inflated |

```
$ npm test
ℹ tests 114   ℹ pass 114   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   ℹ todo 0
ℹ duration_ms 346.758

before WS-10: 61 / 61            after WS-10: 114 / 114            added: 53
tests/.results/unit-junit.xml : 114 <testcase> elements, 0 <failure>, 13890 bytes
```

Per file, at this revision:

```
10  tests/unit/absent-surface.test.mjs          *new
 8  tests/unit/collision-and-obstacles.test.mjs
 8  tests/unit/frame-gap-accrual.test.mjs       *new
12  tests/unit/keyboard-journey.test.mjs        *new
 7  tests/unit/palette.test.mjs
 8  tests/unit/physics-and-score.test.mjs
 8  tests/unit/run-loop.test.mjs
 3  tests/unit/run-state.test.mjs
 8  tests/unit/score-format-extremes.test.mjs   *new
10  tests/unit/score-trace.test.mjs
10  tests/unit/source-hygiene.test.mjs
 8  tests/unit/state-machine-prototype.test.mjs *new
 7  tests/unit/state-machine.test.mjs
 7  tests/unit/trace-contract.test.mjs          *new
```

**Environment.** Windows 11 Pro 10.0.28000, Git Bash, Node `v22.23.2` (V8
`12.4.254.21-node.56`), npm `10.9.8`, **no `node_modules`, no install step**. All commands
run from `D:/os-test/dino-dash-app` on `codex/evt-20260809-001`.

**The source seal holds.** WS-10 changed nothing under `src/`:

```
$ git rev-parse HEAD:src
0566d5d39599d0cdf374b5dee27d22afdb544c41      <- identical to WS-03's seal at ea12453
```

---

## 2. WS-09 F-01 — the highest-value test in this workstream

`src/game/state-machine.js:45`:

```js
const next = TRANSITIONS[state] ? TRANSITIONS[state][event] : undefined;
if (!next) return false;
```

The lookup consults the prototype chain. WS-09 found it, proved it is unreachable at this
revision, and recorded as **L-06** that *"no test currently guards it"*. That is the gap
this file closes. `src/` is sealed, so **the defect is not fixed here** — and a test that
asserted the fixed behaviour would fail, which is not a discharge of anything.

The file does three separate jobs instead, and the third is the one that matters:

### 2.1 Characterisation — the defect is pinned, not described

```
$ node --test tests/unit/state-machine-prototype.test.mjs
✔ F-01 (characterised, NOT fixed): inherited property names are accepted as events
✔ F-01: `constructor` leaves the state variable holding a function, not a state
✔ F-01: once off the enumeration the machine is bricked — no event is accepted again
✔ F-01: the signal fires for a transition that never should have happened
```

The alphabet is derived at runtime from `Object.getOwnPropertyNames(Object.prototype)`
rather than hard-coded, so a future engine that adds or removes a member is covered
without editing the test. Every one of them is accepted, and every one of them drives the
state off `STATE_VALUES`.

Two facts WS-09 recorded and this file now checks by machine:

- `transition('constructor')` leaves the state variable holding the `Object` **function**.
  It stringifies to `function Object() { [native code] }`, which contains no `<`, `>`,
  `"`, `&` or `'` — asserted character by character, so WS-09 §3.6.3's "this is not an XSS
  vector" is a checked claim rather than a judgement.
- One consequence WS-09 did not state: **the machine is bricked afterwards.** Once `state`
  is off the enumeration, `TRANSITIONS[state]` is `undefined` and the guard short-circuits
  for everything, including all three declared events. The escape is one-way.

When someone fixes `state-machine.js`, these assertions fail. That is the intended signal,
and the file says so in its header: the correct response is to invert them, not delete them.

### 2.2 The fix, as an executable specification

```
✔ F-01 fix spec: an own-property lookup rejects every inherited name and keeps all three edges
```

```js
Object.hasOwn(TRANSITIONS, state) && Object.hasOwn(TRANSITIONS[state], event)
  ? TRANSITIONS[state][event]
  : undefined
```

Run against the same alphabet, this rejects all twelve inherited names in all three states
and still resolves all three declared edges. **Complete, not merely safe** — and it also
closes the `state` side, so a `state` of `'constructor'` cannot reach a row either.
Whoever reopens the module has the change and its proof in one place.

### 2.3 Containment — the guard that actually protects AC-26 going forward

```
✔ F-01 containment: every argument reaching transition() in src/ is pinned
✔ F-01 containment: no external input expression appears at a transition() call site
```

The defect is unreachable today only because of what the call sites pass. That property is
now asserted rather than assumed. The test scans the delivered source and pins the exact
argument expressions:

```
transition(...)  ->  ["'collide'", "event"]
enterRun(...)    ->  ["'restart'", "'start'"]
```

One correction to WS-09 §3.6.3, which states that `transition()` has three call sites "and
every one passes a literal": `src/main.js:48` passes `event`, the parameter of
`enterRun` — a variable, not a literal. The containment property still holds, because
`enterRun`'s own two call sites (`main.js:64`, `main.js:68`) pass `'start'` and
`'restart'`, and the test pins both hops. The finding's severity is unchanged; its stated
mechanism was one step short.

The second test asserts that no `transition()` argument expression contains `event.key`,
`event.code`, `location`, `hash`, `search`, `params`, `JSON.parse`, `dataset`,
`localStorage`, `sessionStorage`, `fetch`, `message`, `postMessage` or `querySelector`.
**The moment any later unit routes a string into `transition()`, this file fails.** That is
the regression guard WS-09 L-06 asked for.

---

## 3. AC-12 — the keyboard-only journey, without a browser

WS-12 R-07 records that AC-12 has no machine evidence. `tests/unit/keyboard-journey.test.mjs`
supplies the part that does not need a browser: the **real** `src/input/keyboard.js`
attached to a **real** `EventTarget`, driven by **real** `keydown` events carrying `code`,
`key` and `repeat`, wired to the real state machine, run state, physics, simulation and
score trace, with the real `createLoop` pumped by an injected frame scheduler.

```
✔ AC-12: the whole journey — open, start, jump, collide, restart, collide — is keyboard-only
✔ AC-12: the delivery registers exactly one listener type, and it is keydown
✔ AC-02/AC-04: both documented keys start a run, and neither is a mode
✔ AC-04: alternating Space and Up Arrow within one run jumps four times
✔ AC-03: holding a key produces exactly one jump, not a repeat stream
✔ AC-05: the two handled keys always suppress the browser default, and no other key does
✔ AC-15/AC-26: no key but the two documented ones has any effect, in any state
✔ AC-10/AC-13: five consecutive keyboard restarts, each starting from zero
✔ AC-09: the run-end score equals the last score of the run that produced it
✔ AC-26: the keyboard-reachable state set is exactly three
✔ AC-02/AC-11/AC-15: each state carries an on-screen instruction naming its keys
✔ detaching removes the only listener, so the input surface has a clean lifetime
```

Four results worth naming individually:

- **The six-step journey completes.** Open, start (Space), jump (Up Arrow), collide,
  restart (Space), collide again — every step driven by a dispatched `keydown` and nothing
  else. AC-12's "record any step that could not be performed; the expected count is zero"
  has a machine answer for the logic tier: zero of six.
- **`defaultPrevented` is asserted in both directions** (AC-05). `true` for Space, Up Arrow
  and auto-repeats of both; `false` for Enter, Escape, **Tab**, ArrowDown, ArrowLeft,
  ArrowRight, PageDown and KeyA. Tab appearing in the second list matters: if the delivery
  suppressed Tab's default it would break AC-14, and now that cannot regress silently.
- **Twenty-two other keys are swept in all three states** and asserted to change neither
  state, nor score, nor jump count (AC-15, AC-26).
- **Exactly one listener type is registered**, `keydown`. Asserted by instrumenting
  `addEventListener` on the target, which is stronger than a token scan: a pointer listener
  added at runtime by any code path would fail this.

**What this is not, stated so it is not over-read.** `src/main.js` is not imported — it
touches `document` at import time. The test **re-creates** main.js's wiring over the same
modules, so a divergence between the test's wiring and main.js's would not be caught here.
Nothing is rendered: no canvas, no HUD, no focus ring, no page scroll. AC-05's *"the
document scroll position is unchanged"* and AC-11's *"the instruction is legible"* remain
browser observations and are recorded as such in §7.

---

## 4. WS-06 L-06 — the wider token set, now asserted

WS-06 §3.2 checked **35** storage tokens by hand and recorded that `source-hygiene.test.mjs`
asserts **5**. WS-09 checked 51 injection tokens and 44 identity tokens the same way. Those
were numbers in documents that no command re-derived.

`tests/unit/absent-surface.test.mjs` re-derives them, using the same comment-stripping
method so the results are comparable by construction:

```
✔ the scan covers the whole delivered tree, not a subset of it        (18 files, 15 .js)
✔ AC-22/AC-23: all 35 of WS-06 §3.2 storage tokens are absent from src/
✔ AC-22/AC-23: the nine raw storage hits are all comments, and all nine are still there
✔ AC-23: the three side-channel persistence tricks are absent
✔ no HTML-parsing or dynamic-code sink exists anywhere in src/ — 46 tokens
✔ the URL is never read, so a static page has no input channel but the keyboard
✔ AC-25: no identity or device-fingerprint read exists, except the one WS-09 recorded
✔ AC-24: no egress path of any kind exists in src/
✔ AC-27: no character catalogue, unlock state, points balance or currency exists
✔ AC-24: the shipped markup references nothing remote
```

The results reproduce WS-06 and WS-09 exactly: **35 storage tokens, 9 raw occurrences, 0
after comment stripping; 46 injection tokens, 0 raw; identity tokens, 1 hit.**

Three assertions are deliberately two-directional rather than one:

- The **nine raw hits** are asserted to still be nine. A later edit that deletes the
  comments documenting the absence changes the count and this test says so, while a later
  edit that adds a real call site fails the stronger test above it.
- **`devicePixelRatio` is pinned at exactly one occurrence in exactly one file**
  (`render/canvas-renderer.js`), with its clamping expression matched. WS-09 F-06 recorded
  it as the delivery's only device-characteristic read; a **second** one anywhere now fails
  the suite.
- **AC-27** is new coverage nobody had: 35 economy, catalogue and later-unit tokens
  (`unlock`, `balance`, `currency`, `shop`, `leaderboard`, `lobby`, `matchmaking`,
  `highScore`, …) plus a markup check for zero `<button>` elements and exactly one
  `<canvas>`. This is the non-goals statement in `DEVREQ-EVT-20260809-001` turned into an
  assertion.

---

## 5. WS-05 §3.8 — score accrual across a frame gap

WS-05 measured, by hand, what a run left in a background tab does: **+600 points per 60 s
with 36 px of world motion and zero collision tests evaluated.** `physics-and-score.test.mjs`
covers `clampStepSeconds` in isolation; nothing covered the asymmetry the clamp creates
together with time-derived scoring.

```
✔ the two constants this whole property rests on are the delivered ones
✔ AC-08/AC-20: score accrues across a frame gap at the run-time rate, not the frame rate
✔ the clamp bounds the world to one step across a gap of any length
✔ a gap with zero frames evaluates zero collision tests, so hidden time carries no risk
✔ AC-08: the score never decreases across a gap, at any gap length
✔ AC-08: the score is identical whether the same elapsed time arrives in 1 frame or 3600
✔ the character is integrated by the clamped step, so a gap cannot fling it
✔ the background variation follows the score, so a gap can skip a tier in one frame
```

WS-05's numbers reproduce exactly as assertions: 2 000 ms of foreground at 60 Hz scores
**20**; one resume frame carrying a 60 000 ms delta scores **620**; the world advances
**36 px**, which is `RUN.maxSpeedPxPerSecond × PHYSICS.maxStepSeconds`; the obstacle count
is unchanged and the resume frame reports no collision.

The strongest of the eight is the sixth: the same elapsed time delivered as **one** frame
and as **3 661** frames produces the **identical score** and a world position differing by
more than 10×. That is the documented asymmetry — score unclamped, simulation clamped —
stated as a checked property instead of a comment in `simulation.js`.

**This is a characterisation, not a defect report, and it accepts nothing.** WS-05 §3.8
establishes that the behaviour satisfies AC-08, AC-20 and AC-21 as written and that
subtracting hidden time would fail AC-20. WS-05 **L-05** records that the property is
carried and not accepted, and that `DEC-20260809-001` covers deliberate forgery and does
**not** extend to time-derived accrual while hidden. WS-10 preserves that distinction
exactly and adds no acceptance of its own. What the tests add is that the behaviour cannot
now change without someone noticing.

---

## 6. WS-09 F-02 / L-06 — `formatScore` at the extremes

```
✔ AC-08: the readout is exactly four digits until the score needs a fifth
✔ the production domain emits digits only — swept, not sampled
✔ F-02: exponent notation begins at 1e21 and not before
✔ F-02 corrected: the non-digit characters are `e`, `+` AND `.`
✔ AC-16/XSS: no output of formatScore is ever HTML-significant, at any input
✔ hostile and non-numeric inputs are discarded and replaced, never escaped
✔ a coerced-looking number is still discarded — no implicit valueOf path exists
✔ scoreForElapsedMs is the only producer, and it cannot reach the exponent range
```

The production sweep runs the whole reachable domain — `elapsedMs` from 0 to 3 600 000 in
37 ms steps, 97 298 values — through `scoreForElapsedMs` into `formatScore` and asserts
`/^[0-9]+$/`, length 4–5, and non-decreasing numeric value throughout. The observed
character set is exactly `0123456789`. An hour of play reads `36000`.

**One correction to WS-09 F-02, machine-checked.** F-02 states that the only characters
outside `[0-9]` the function can produce are `e` and `+`. There are **three**:

```
formatScore(Number.MAX_VALUE) === "1.7976931348623157e+308"
```

Swept across mantissa × 10^0…10^308, the non-digit set is `['+', '.', 'e']`. The severity
is unchanged — none of the three is HTML-significant, the sink is `textContent`, which does
not parse markup, and the whole range is unreachable in production — but the finding's
stated character set was one short, and the corrected set is now asserted.

Two further properties that make WS-09 §3.6.2's "no user-controlled string reaches the DOM"
claim structural rather than incidental: 24 hostile inputs — markup, `javascript:`, template
injection, CSS injection, arrays, functions, objects with hostile `toString` — **all
return `"0000"`**; and an argument whose `valueOf` throws also returns `"0000"`, proving
`Number.isFinite` never coerces. A hostile string is not escaped here, it is **discarded and
replaced**, and either mechanism alone would be sufficient.

---

## 7. The AC-by-AC coverage matrix

**This is the honest half of the workstream. Several criteria have no machine evidence, and
saying so is the correct result.**

The matrix is produced by a command, so it can be re-derived rather than believed:

```
$ node tests/tools/ac-coverage.mjs
repository            : D:\os-test\dino-dash-app\
revision              : bd43f5f81f7d641bf3b18fca20d879d09c969776
unit test files       : 14
unit test titles      : 113
criteria declared     : 30
...
evidence=11  partial=18  none=1
wrote tests/.results/ac-coverage.json (24722 bytes)
sha256                : 87718bb50a16838b24fd41b150ece39b9146c2b270120676b89ee0b89d3d095a
                                        exit 0
```

The harness separates what it **measures** from what ENG-10 **declares**. It scans
`tests/unit/*.test.mjs` for which test titles name which criterion — nobody maintains that
list by hand — and cross-checks it against the declared disposition, exiting non-zero on a
contradiction. Proof that the check is real rather than decorative:

```
$ # AC-14 temporarily declared 'none' while a test title still claims it
$ node tests/tools/ac-coverage.mjs
MATRIX INCONSISTENT:
  AC-14: declared none, but 1 unit test title(s) claim it
                                        exit 1
```

The edit was reverted; the committed matrix exits 0.

**Legend.** `evidence` — machine evidence reaching the substance of the criterion.
`partial` — a real machine check covers part of it and the named remainder does not exist.
`none` — no machine evidence in this delivery.

| AC | Disposition | Machine evidence that exists | What has none |
| --- | --- | --- | --- |
| AC-01 | **none** | — | The whole criterion is a browser observation: opens, reaches idle, renders, zero console errors. No command here starts a browser. The nearest evidence (zero remote references; WS-08's 17 requests / 0 cross-origin) belongs to AC-24 and is not offered as AC-01's |
| AC-02 | partial | `keyboard-journey`: both keys start a run from idle; the `#dd-idle-instruction` element names Space, Up Arrow and "start" | That the instruction is rendered and legible |
| AC-03 | **evidence** | `physics-and-score`: one grounded press is one jump, airborne presses do nothing; `keyboard-journey`: a hold produces exactly one jump across 20 repeats | — |
| AC-04 | **evidence** | `keyboard-journey`: alternating Space / Up Arrow jumps four times, both keys active all session, no toggle | — |
| AC-05 | partial | `keyboard-journey`: `defaultPrevented` true for both keys and their repeats, false for eight other keys including Tab | That the document scroll position does not move — needs a scrollable viewport in a browser |
| AC-06 | **evidence** | `run-loop`: contact ends the run and the score stops; `keyboard-journey`: the final score is unchanged after 300 further frames | — |
| AC-07 | **evidence** | `collision-and-obstacles` (5 tests); `run-loop`: jumping clears cacti and the run continues | — |
| AC-08 | **evidence** | `physics-and-score`, `run-loop`, `frame-gap-accrual`: starts at zero, integer, non-decreasing at any frame rate and across a gap of any length | — |
| AC-09 | **evidence** | `run-loop`: the trace record equals the final displayed score; `keyboard-journey`: run-end score equals the last in-run score, formatted identically | — |
| AC-10 | partial | `keyboard-journey`: five consecutive keyboard restarts, each starting at `0000` | That no page load occurred — `performance.getEntriesByType('navigation')` and the network panel are browser reads |
| AC-11 | partial | `keyboard-journey`: restart operable from a key event alone; `#dd-restart-instruction` names both keys | Legibility of the rendered instruction |
| AC-12 | partial | `keyboard-journey`: the six-step journey completes from key events alone; exactly one listener type, `keydown`; `source-hygiene` + `absent-surface`: no pointer/mouse/touch token in `src/` | The journey over `main.js` in a real page, with a physically disconnected pointer |
| AC-13 | **evidence** | `run-state`: a played-out run shares nothing with the next; `keyboard-journey`: score 0, obstacles 0, character grounded at start position on every one of five restarts | — |
| AC-14 | partial | `source-hygiene`: `tabindex="0"` exists, the canvas is `aria-hidden` and not focusable, `.dd-stage:focus` styles an `outline`; `keyboard-journey`: Tab's default is never suppressed | A **rendered** focus indicator, the Tab cycle returning to the first stop, and the absence of a focus trap. No headless check reaches any of the three |
| AC-15 | partial | `keyboard-journey`: no key but the two documented ones has any effect in any state (22 keys × 3 states); `source-hygiene`: the only handled codes are `Space` and `ArrowUp`, both named on screen | That the naming text is visibly rendered |
| AC-16 | partial | `palette`: every declared text pair clears 4.5:1; `npm run evidence:a11y` → `a11y-contrast.json` + `.sha256` | **The rendered-pixel half.** Declared-palette only. WS-12 **R-01**, still open — closing it needs the browser tier (§5 below / §8) |
| AC-17 | partial | `palette`: every declared non-text pair clears 3:1; same evidence command | **The rendered-pixel half.** WS-12 **R-01**, still open |
| AC-18 | partial | `palette`: character, cactus and ground carry three distinct saturated hues | Sampling **rendered** pixels. The judgement half is the owner's under `final_user_visible_acceptance` and is not a runnable condition (ISS-20260809-028 caveat carried) |
| AC-19 | **evidence** | `score-trace`: exactly three fields, correctly typed, real UTC instant, a zero-score run still produces a record; `trace-contract`: ADR-003's own published assertion block passes | — |
| AC-20 | partial | `run-loop`: record `score` equals the final displayed score and `sessionLengthMs` equals elapsed | The 250 ms tolerance against an **independent** stopwatch. An injected clock cannot be its own witness |
| AC-21 | **evidence** | `score-trace`: `sessionLengthMs` from the injected monotonic source; a mid-run wall-clock jump does not corrupt it | Recorded with ADR-003 §2's disclosure: the injected clock is the **declared substitute** for changing the OS clock (WS-01 **B-05**) and is reported as a substitute, not as the manual procedure |
| AC-22 | partial | `score-trace`: records accumulate across restarts, oldest first, reads return copies; `keyboard-journey`: one record per run across five runs; `absent-surface`: all 35 storage tokens absent | "Discarded when the page unloads", and an empty storage inspector for all four mechanisms |
| AC-23 | partial | `absent-surface`: 35 storage tokens and the three side-channel tricks (`window.name`, `history.pushState`, `replaceState`) absent | The reload comparison against a fresh browser profile |
| AC-24 | partial | `absent-surface`: no egress path in `src/`, markup references nothing remote, zero inline handlers; WS-08 §3: 17 same-origin requests, 0 cross-origin, 0 after load | Playing with the network disabled |
| AC-25 | **evidence** | `score-trace`: no identifying field present or accepted; `absent-surface`: no identity read except the recorded `devicePixelRatio`, zero form controls; `trace-contract`: extra fields are dropped whatever the caller passes | The criterion is an absence over a static, form-control-free delivery, and an absence is fully checkable from source |
| AC-26 | partial | `keyboard-journey`: the keyboard-reachable state set is exactly three across 400 rounds; `state-machine`: no declared event sequence reaches a fourth state | Holds for **every keyboard input**. It does **not** hold for arbitrary strings — §2's characterisation shows twelve inherited names drive the state off `STATE_VALUES`. Unreachable at this revision and now guarded, but the criterion as written is satisfied for the keyboard alphabet only |
| AC-27 | partial | `absent-surface`: 35 catalogue/economy tokens absent, zero `<button>`, one `<canvas>` | "The character rendered is identical across five runs" is a rendered-pixel comparison |
| AC-28 | partial | `git diff --name-only` inventory and `git rev-parse HEAD:src` against WS-03's seal (§9) | That the product workspace `D:/os-test/dino-dash` is byte-identical before and after cannot be self-certified by the workstream that would have broken it |
| AC-29 | **evidence** | `trace-contract`: the test **reads ADR-003** and asserts the delivered module matches the documented field set, types, units and UTC `Z` convention, so documentation and behaviour cannot drift silently | The human "predict the fields from documentation without reading the run loop" procedure is not replaced by this |
| AC-30 | partial | `npm test` → `unit-junit.xml` (114 testcases); `npm run evidence:a11y` → `a11y-contrast.json` + `.sha256`; `node tests/tools/ac-coverage.mjs` → `ac-coverage.json` + `.sha256`; WS-12 §5 clean-checkout proof | The accessibility evidence command covers **AC-16 and AC-17 only**. There is no command producing accessibility evidence for **AC-12 or AC-14**, which AC-30 names explicitly. Deposition under `.development-os/evidence/` is outside every engineering write boundary and is not done here |

**Totals: 11 `evidence`, 18 `partial`, 1 `none`.**

Read the `partial` column honestly: **eleven of the eighteen are partial for the same
reason** — AC-01, 02, 05, 10, 11, 12, 14, 16, 17, 18, 22, 23, 24, 27 all name an
observation that requires a rendered page. One missing tier accounts for most of the
matrix, and §8 is where that is dispositioned.

---

## 8. `GATE-AUTOMATED-TESTS` — disposition

```
$ node -e "…print the ENG-10 gate from engineering/quality/gates.json…"
GATE-AUTOMATED-TESTS   domain=testing  ownerRole=ENG-10  required=true
  evidence: test commands, machine-readable results
```

### 8.1 The browser tier was attempted, and this is what happened

ADR-005 §3 chose Playwright for the browser tier. WS-12 §4 probed it and found that it
**launched from warm caches** on this machine, while recording as **R-05** that no *cold*
acquisition had been observed. WS-10 attempted exactly that cold acquisition, once, in a
scratch directory **outside both repositories**, with `PLAYWRIGHT_BROWSERS_PATH` pointed at
a fresh empty directory so the machine's existing browser cache could not satisfy it.

```
$ cd <scratchpad>/ws10-pw
$ npm view @playwright/test version
1.62.1

$ npm install @playwright/test@1.62.1 --no-audit --no-fund
added 3 packages in 6s
                                        exit 0

$ export PLAYWRIGHT_BROWSERS_PATH="$PWD/pw-browsers-cold"
$ npx playwright install chromium
COLD CACHE DIR: <scratchpad>/ws10-pw/pw-browsers-cold
                                        (no output at all)
                                        TERMINATED at 600 s — exit 143

$ ls -la pw-browsers-cold
drwxr-xr-x .links
drwxr-xr-x __dirlock
$ du -sh pw-browsers-cold
1.0K

$ ls "$LOCALAPPDATA/ms-playwright"       # the pre-existing warm cache, untouched
chromium-1234  chromium_headless_shell-1234  ffmpeg-1011  winldd-1007
```

**The real result: ten minutes, zero output, zero bytes of browser downloaded.** No
`chromium-*` directory was created, no partial download appeared, and no error message was
printed — the command produced a lock directory and then nothing. The npm registry is
reachable from here (`npm view` and `npm install` both succeeded in seconds), so this is
specific to the browser-binary download, not to the network generally.

This **sharpens WS-12 R-05 into a finding**: WS-12 could only say a cold acquisition was
unobserved. WS-10 observed one, and it did not complete.

**No dependency was added, no script was added, and no browser test file exists.** A
`playwright.config.js` and a `test:browser` script pointing at a browser that cannot be
acquired would be exactly the phantom dependency WS-12 §4 refused and the broken stated
command AC-30 forbids. The scratch install lives outside the repository and is not part of
this delivery; `package.json` and `package-lock.json` are unchanged and still pin an empty
dependency set.

### 8.2 The disposition

**`GATE-AUTOMATED-TESTS` is DISCHARGED FOR THE UNIT TIER, WITH THE BROWSER TIER RECORDED AS
A DECLARED GAP.** It is not a clean pass and it is not a `not_applicable`.

| Evidence the gate names | Where it is | Disposition |
| --- | --- | --- |
| **test commands** | `npm test` (114 tests, zero-install, clean checkout — §9); `npm run evidence:a11y`; `node tests/tools/ac-coverage.mjs`. All three run from a clean checkout with no `npm ci` | **Satisfied** |
| **machine-readable results** | `tests/.results/unit-junit.xml` (114 `<testcase>`, 0 `<failure>`); `tests/.results/a11y-contrast.json` + `.sha256`; `tests/.results/ac-coverage.json` + `.sha256` `87718bb5…d3d095a` | **Satisfied** |

**What is discharged:** the unit tier covers 11 criteria fully and 18 partially, the five
gaps handed over by WS-05, WS-06, WS-09 (×2) and WS-12 are closed to the extent a headless
tier can close them, and the highest-value item — a regression guard on a real latent
defect — is in place.

**What is NOT discharged, and is declared rather than absorbed:**

1. **There is no browser tier at all.** Every criterion whose substance is a rendered page
   — AC-01 outright, and the browser half of AC-02, 05, 10, 11, 12, 14, 16, 17, 18, 22, 23,
   24, 27 — has no machine evidence in this delivery.
2. **AC-16 and AC-17's rendered-pixel half** stays open. WS-12 **R-01** is inherited
   unchanged, not closed.
3. **AC-30's accessibility-evidence command covers AC-16 and AC-17 only.** AC-30 names
   AC-12 and AC-14 as well, and no command produces evidence for either. AC-12 has a
   logic-tier substitute (§3); **AC-14 has none** — a rendered focus indicator cannot be
   observed by anything in this repository.
4. **AC-20's stopwatch tolerance and AC-21's OS-clock procedure** are satisfied by injected
   clocks, which are declared substitutes under WS-01 **B-05** and are reported as
   substitutes.

Anyone citing this gate as discharged must carry items 1 to 4 with it. A gate discharged
for the tier that exists is worth more than one inflated to cover a tier that does not.

---

## 9. Reproducibility and boundary

**Zero-install, clean checkout — re-proved at the commit that carries this work**, in the
same shape WS-12 §5 used. Cloned to a scratch directory outside both repositories:

```
$ git clone --branch codex/evt-20260809-001 D:/os-test/dino-dash-app clean10
$ cd clean10 && git rev-parse HEAD
b522eab9ffd2483d5698db2d939f50d67545d530

$ test -d node_modules && echo yes || echo no
no                                       <- no install step, none needed

$ npm test
ℹ tests 114   ℹ pass 114   ℹ fail 0                                exit 0

$ node tests/tools/ac-coverage.mjs
evidence=11  partial=18  none=1
wrote tests/.results/ac-coverage.json (24722 bytes)                exit 0

$ npm run evidence:a11y                                            exit 0
$ ls tests/.results/
a11y-contrast.json  a11y-contrast.json.sha256  ac-coverage.json
ac-coverage.json.sha256  unit-junit.xml
```

Three stated commands, three exit-0 runs, five machine-readable artifacts, and no `npm ci`
anywhere. The `ac-coverage.json` digest differs between runs because the report carries its
own `generatedAt` and `sourceRevision`; each generation is self-describing, the same
convention WS-09 §4.4 used for the SBOM. The unit-tier result is byte-stable: 114 of 114.

Every command in this record was run with no
`node_modules` present and no install step. The six new test files import only `node:test`,
`node:assert/strict`, `node:fs`, `node:path`, `node:url` and relative paths into `src/`;
`tests/tools/ac-coverage.mjs` adds `node:crypto` and `node:child_process`. **No dependency
was added, runtime or dev.** `package.json` and `package-lock.json` are untouched.

**Write boundary (AC-28).** WS-10 created exactly seven files:

| Status | Path |
| --- | --- |
| added | `tests/unit/state-machine-prototype.test.mjs` |
| added | `tests/unit/keyboard-journey.test.mjs` |
| added | `tests/unit/absent-surface.test.mjs` |
| added | `tests/unit/frame-gap-accrual.test.mjs` |
| added | `tests/unit/score-format-extremes.test.mjs` |
| added | `tests/unit/trace-contract.test.mjs` |
| added | `tests/tools/ac-coverage.mjs` |
| added | `docs/engineering/WS-10-quality-review.md` (this file) |

All lie inside `tests/` and `docs/`. Nothing under `src/`, `engineering/`,
`.development-os/`, `.github/`, `DEVELOPMENT.md`, `development-os.config.json`, or
anywhere in the product workspace `D:/os-test/dino-dash`, was created or modified.
`git rev-parse HEAD:src` is `0566d5d3…44c41`, byte-identical to WS-03's seal.
`git diff --check` is clean.

Outputs land in `tests/.results/`, which `tests/.gitignore` keeps out of the commit while
the directory survives a clean checkout — the same convention WS-12 established and WS-09
followed. The artifacts are reproducible from their commands, not carried in the tree.

**Observed during this workstream and not authored by it:** `README.md` was modified and a
new root file `BENCHMARK.md` appeared in the working tree while WS-10 was running, by some
process other than this workstream. Both are outside WS-10's write boundary, neither was
staged or committed here, and both are left exactly as found. `BENCHMARK.md` states a test
count of 61, which was correct at `bd43f5f` and is superseded by the 114 in this record.
Flagged for ENG-15 rather than acted on.

---

## 10. Known risks and limitations

- **L-01 — there is no browser tier, and this is the delivery's largest evidence gap.**
  §8.1 records the cold Playwright acquisition failing after ten minutes with zero bytes.
  Fourteen criteria are `partial` or `none` for this single reason.
- **L-02 — `keyboard-journey` re-creates `main.js`'s wiring; it does not execute
  `main.js`.** The bootstrap touches `document` at import time. A divergence between the
  test's wiring and the real bootstrap would not be caught. This is the same class of
  limitation WS-05 recorded as its **L-02** and it is not reduced here.
- **L-03 — F-01's characterisation tests fail when the defect is fixed.** That is
  deliberate and is stated in the file header, but a reader who sees them fail must
  understand the signal: invert the assertions, do not delete the file, and keep §2.3's
  containment tests either way.
- **L-04 — the containment guard in §2.3 is brittle by design.** It pins exact argument
  expressions, so a harmless refactor of `main.js` fails it. That is the intended cost: a
  guard that tolerates changes to the thing it guards is not a guard. The failure message
  names the call sites so the review is quick.
- **L-05 — a token scan cannot prove the absence of an unnamed API.** 35 storage, 46
  injection, 20 identity, 19 network and 35 catalogue tokens are asserted. An API named in
  none of the five lists would not be found. The lists are literals in the test file so a
  reader can judge the coverage rather than trust the totals. Carried unchanged from WS-09
  **L-02**.
- **L-06 — the coverage matrix's disposition column is a judgement, not a measurement.**
  The harness measures which tests name which criterion and rejects contradictions; it
  cannot decide whether an assertion reaches the *substance* of a criterion. That call is
  ENG-10's and is open to ENG-15's disagreement.
- **L-07 — the frame-gap tests characterise contracted behaviour and accept nothing.**
  WS-05 **L-05**'s distinction is preserved exactly: `DEC-20260809-001` covers deliberate
  forgery and does **not** address time-derived accrual while hidden. This record must not
  be cited as extending it.
- **L-08 — client-side score forgeability is the owner's accepted risk and is NOT
  re-accepted here.** `APR-870DC901FD68`, restated in `DEC-20260809-001`, bounded to Units
  1 and 2. WS-02 **AR-02** states no workstream may re-accept it. WS-10 does not.
- **L-09 — the cold Playwright result is one attempt on one machine.** It is what was
  observed here and it is not a claim about Playwright in general or about a CI runner.
  A verifier on a different network may see it succeed; the finding is that it did not
  succeed here, once, within ten minutes.
- **L-10 — every determination is scoped to Unit 1 at revision `bd43f5f`.** Units 2 to 5
  are not contracted and nothing here pre-clears any of them.

---

## 11. What ENG-10 did not do

- **Changed nothing under `src/`.** The tree object is byte-identical to WS-03's seal.
  WS-09's F-01 and F-02 are guarded and characterised, **not fixed** — fixing them is a
  change to a sealed module and belongs to whichever workstream reopens it.
- **Added no dependency, and left no phantom one.** No `@playwright/test`, no
  `playwright.config.js`, no `test:browser` script, no browser test file. §8.1 records why:
  the browser could not be acquired, and a stated command that does not run fails AC-30.
- **Did not claim the browser tier, in whole or in part.** No screenshot, no rendered-pixel
  measurement, no focus-ring observation, no storage-inspector reading, no network-panel
  reading appears in this record.
- **Did not inflate the gate.** §8.2 discharges the unit tier and declares four remainders.
  `not_applicable` was not used — the work was real and it was done, and so were its limits.
- **Invented no threshold.** The only numbers asserted are the delivery's own constants
  (`scorePerMs` 0.01, `maxStepSeconds` 0.05, `maxSpeedPxPerSecond` 720) and the contract's
  own values (4.5 and 3, via the existing palette tests). No coverage target, no
  performance budget, no timing bound.
- **Modified no existing test file.** `source-hygiene.test.mjs` and the rest are WS-03's;
  the new files overlap them deliberately rather than editing them, so WS-03's stated
  intent and test count survive intact.
- **Accepted no risk.** Score forgeability, hidden-tab accrual and the AC-18 judgement half
  all belong to the human product owner and are carried, not dispositioned.
- **Issued no verification disposition for the delivery.** WS-10 reports
  `not_applicable` for its own run. Only ENG-15 at WS-14 issues the delivery's.
- **Wrote nothing outside the boundary.** Eight files, all under `tests/` and `docs/`. The
  unexpected root-level changes noted in §9 were left untouched and unstaged.
