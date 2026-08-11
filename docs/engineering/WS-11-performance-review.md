# WS-11 — SRE, Observability and Performance

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-11, owner role ENG-11, producer actor `actor-eng-11` |
| Branch / revision measured | `codex/evt-20260809-001` @ `cacfcb0` |
| Gates owned | `GATE-PERFORMANCE`, `GATE-RELIABILITY` — both `required: false` |
| Authored | 2026-08-11 |

---

## READ THIS FIRST — these are observations, not budgets

**Every number in this document is a measurement. None of them is a target, a threshold, a budget,
a service objective or an acceptance criterion, and none of them may be cited as one.**

The contract's performance requirement is explicitly unquantified. `DEVREQ-EVT-20260809-001`
carries it twice under `nonFunctionalRequirements[domain=performance]`, and both entries say the same
thing in the same words: the run loop "must sustain a stable frame rate and input responsiveness such
that jump timing is fair", and

> "The budget therefore remains UNKNOWN."

with the verification clause reading, verbatim, that RB-12 "confirms **no numeric performance target
is claimed**" and that "any budget asserted before the baseline exists **must be rejected**".
`ISS-20260809-019` records the gap, WS-01 carries it open as **R-02**, and DD-0008 declared it
**GAP 2** with no scenario designed. There is no frame-time target, no input-latency figure, no byte
budget and no device baseline in any artifact of this delivery.

**ENG-11 has not invented one, and has no authority to.** Inventing a threshold would manufacture the
exact number the record says is missing, and it would immediately become a fake acceptance criterion
that a later workstream or verifier would treat as contractual.

What ENG-11 *can* do, and has done, is **measure**. A measurement taken on a stated machine with a
stated method is evidence. A budget is a decision. The two are different acts and this document only
performs the first. Everything below is:

- taken from the **delivered `src/` at `cacfcb0`, unmodified** — WS-11 changed no file under `src/`;
- reproducible by re-running the two harnesses named in §8;
- reported with the machine it came from, because a single-machine figure means nothing without it.

**Setting a budget remains the product owner's decision.** It requires a device baseline drawn from
real target-user data, which this delivery does not have and which no engineering workstream can
supply. §9 states what the owner would need in order to choose one, and what these numbers could
reasonably be chosen *from*. It stops there.

---

## 1. The machine

Every figure in §2–§6 was produced by one execution of
`node --expose-gc tests/perf/simulation-cost.mjs` on:

| | |
| --- | --- |
| CPU | AMD Ryzen 7 4800H with Radeon Graphics, 16 logical cores |
| Memory | 15.4 GiB |
| OS | Windows, `win32` release `10.0.28000`, `x64` |
| Node | **v22.23.2**, V8 `12.4.254.21-node.56` |
| Load | interactive desktop session, not an isolated benchmark host, no CPU pinning |
| Timer | `process.hrtime.bigint()`, self-cost measured at **0.089 µs/call** in the same run |

This is a developer workstation, **not a target-user device**. It is almost certainly faster than the
low end of whatever the real audience uses. Figures from this machine are a *lower bound on cost*, not
a statement about what players will experience. That is precisely why the contract asks for a device
baseline before a budget, and why none is asserted here.

The single-run figures below carry ordinary desktop measurement noise — the p99.9 and max in §2 are
scheduler and GC artifacts of a shared machine, not properties of the game.

---

## 2. Cost of advancing one simulation frame

500,000 frames at a 60 Hz step, after 50,000 warm-up frames, driving the delivered
`advanceRun()` (`src/game/simulation.js`) with a deterministic injected random source.

| Statistic | Value |
| --- | --- |
| mean, per-frame timed (includes one timer self-cost) | **0.212 µs** |
| mean, untimed batch (timer cost excluded) | **0.114 µs** |
| p50 | 0.200 µs |
| p95 | **0.200 µs** |
| p99 | 0.400 µs |
| p99.9 | 1.100 µs |
| max | **260.9 µs** |
| min | 0.100 µs |
| obstacles on the field during the sample | mean 2.04, max 4 |

The two means differ because the per-frame figure carries one `hrtime.bigint()` call inside the
measured window. Both are reported rather than one, because reporting only the smaller would overstate
the precision and reporting only the larger would overstate the cost. **The true per-frame simulation
cost sits between roughly 0.11 and 0.21 µs on this machine.**

The `max` of 260.9 µs is a single sample out of 500,000. It is three orders of magnitude above p99.9
and is an operating-system scheduling or garbage-collection artifact on a shared interactive machine,
not a code path in the game. It is reported because it was asked for and because suppressing outliers
is how measurement turns into advocacy.

**What this does and does not cover.** `advanceRun()` is the whole simulation: score accrual, speed
ramp, obstacle traffic, gravity integration and the collision test. It is **not** the whole frame.
The render half — `src/render/canvas-renderer.js` and `src/render/hud.js` — requires a real canvas and
a real layout engine and **cannot be measured in Node**. It is unmeasured by this workstream. Anyone
reasoning about total frame cost must add a render figure that does not yet exist; ADR-005 puts
rendered-pixel work in the Playwright browser tier (WS-10), which is where such a measurement would
belong.

For scale only, and not as a comparison to any target: at a 60 Hz frame interval of 16,667 µs, the
measured simulation mean is on the order of 0.001% of the interval. That ratio is a fact about this
machine, not a headroom claim about any other.

---

## 3. How cost scales with obstacle count

The delivered spawn rule cannot produce large obstacle counts, so obstacles were seated by hand far
enough off-screen right that none despawns and none reaches the character inside the timed window —
so `characterHitsObstacle()`'s `.some()` scans the full list every frame. The timed window is broken
into 2,000 rounds of 100 frames, with the list re-seated untimed between rounds, and the count
actually observed inside every round is reported so the isolation is checkable. Speed is pinned at
`RUN.maxSpeedPxPerSecond` (720 px/s) by starting each round deep into a run.

| Obstacles | mean µs/frame | µs per obstacle | count observed in window |
| ---: | ---: | ---: | --- |
| 0 | 0.128 | — | 0 → 0 |
| 1 | 0.164 | 0.164 | 1 → 1 |
| 2 | 0.185 | 0.093 | 2 → 2 |
| 4 | 0.200 | 0.050 | 4 → 4 |
| 8 | 0.224 | 0.028 | 8 → 8 |
| 16 | 0.297 | 0.019 | 16 → 16 |
| 32 | 0.468 | 0.015 | 32 → 32 |
| 64 | 0.842 | 0.013 | 64 → 64 |
| 128 | 1.612 | 0.013 | 128 → 128 |

- **Fixed cost with an empty obstacle list: 0.128 µs/frame.**
- **Marginal cost per obstacle (0 → 128): 0.012 µs/obstacle.**

Scaling is **linear**, which is what the code shape predicts: one `for` pass and one `.filter()` in
`stepObstacles()`, plus one `.some()` in `characterHitsObstacle()` — three O(n) passes, no nesting,
no broad-phase structure and none needed.

**The count the game actually produces is 2.04 on average and 4 at peak** (§2), bounded by the
delivered spawn rule: `minSpawnGapPx` 340 / `maxSpawnGapPx` 700 over a 960 px field with a −40 px
despawn edge. The 128-obstacle row is therefore ~32× beyond anything Unit 1 can reach, and is included
only to show the growth is linear rather than quadratic, so a later unit adding obstacle density knows
the shape of the curve it is buying into.

---

## 4. Allocation over a long run

108,000 frames at a 60 Hz step — **30 simulated minutes of one uninterrupted run**, no restarts.
Heap settled with a double `gc()` before each sample (`--expose-gc`).

| Frame | Sim minutes | Score | Obstacles | Peak | heapUsed (MiB, settled) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0.0 | 0 | 0 | 0 | 4.336 |
| 27,000 | 7.5 | 4,500 | 2 | 3 | 4.358 |
| 54,000 | 15.0 | 9,000 | 2 | 3 | 4.357 |
| 81,000 | 22.5 | 13,500 | 2 | 3 | 4.337 |
| 107,999 | 30.0 | 18,000 | 1 | 3 | 4.337 |

**Heap drift first sample → last: 0.002 MiB over 108,000 frames.** Obstacles at the end: 1; peak over
the whole run: 3. The run-state object still has its original 9 own fields — `createRunState()`'s
shape is not extended at runtime.

**No allocation in the run loop grows without bound.** The two candidates and their dispositions:

1. **`runState.obstacles`** — bounded by the spawn/despawn rule at 3–4 entries. It is *reallocated*
   every frame: `stepObstacles()` does `runState.obstacles = runState.obstacles.filter(...)`, which
   produces one short-lived array per frame (~60/s). That is a steady garbage **rate**, fully
   collected, not growth. The flat settled-heap column is the evidence.
2. **`runState`** — replaced wholesale on every entry to `running` (ADR-002 §3). One object per run,
   and the old one becomes garbage immediately.

### 4b. The one structure that does grow without bound — and does so by design

The score trace (`src/trace/score-trace.js`) is module state that accumulates one record per run end.
**AC-22 requires this.** Measured directly, 200,000 appended records:

| | |
| --- | --- |
| records appended | 200,000 |
| `trace.size()` | 200,000 |
| retained heap growth (settled) | **11.12 MiB** |
| per record | **~58.3 B** |

This is unbounded in principle and bounded in practice by two facts: **one record per run end, not per
frame**, and the array dies with the JavaScript realm (AC-23, §6). A player would need on the order of
200,000 completed runs in a single uninterrupted page session to reach 11 MiB. No numeric ceiling is
asserted here — it is recorded so that Unit 3, which attaches to this array as its seam (ADR-002 §3),
inherits the figure rather than rediscovering it.

---

## 5. Frame-rate independence (ADR-002 §5, AC-08)

ADR-002 §5 claims: "Score accrual is a function of elapsed run time, not of frames rendered, so the
score sequence is non-decreasing and frame-rate independent (AC-08)." **Verified.**

Method: the identical 60,000 ms of monotonic time, advanced at three step sizes. `nowMs` is computed
absolutely rather than accumulated, so all three runs land on the identical final monotonic instant and
floating-point drift cannot enter the comparison. Collisions are observed but not acted on so that all
three cover the full duration.

| fps | step ms | frames | elapsedMs | score | distancePx | speed | obstacles |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 | 33.3333 | 1,800 | 60,000 | **600** | 37,951.1 | 720 | 2 |
| 60 | 16.6667 | 3,600 | 60,000 | **600** | 37,948.3 | 720 | 3 |
| 144 | 6.9444 | 8,640 | 60,000 | **600** | 37,946.6 | 720 | 2 |

- **Score divergence across 30 / 60 / 144 fps: 0 points.** Identical, not merely close. This is exact
  rather than approximate because `scoreForElapsedMs()` is `Math.floor(elapsedMs * 0.01)` over a
  monotonic delta from the run's start mark — the step size never enters the expression.
- **`distancePx` spread: 4.48 px out of 37,951, or 0.012%.** Distance *is* stepped
  (`distancePx += speed * stepSeconds`), so it inherits a small integration difference. Distance is
  not displayed, not scored and not in the trace; it only shifts obstacle spawn positions marginally.

### 5b. What is *not* frame-rate independent: the jump arc

One grounded jump, no obstacles, integrated by the delivered `stepCharacter()` (semi-implicit Euler):

| fps | apex height px | airtime ms | frames airborne |
| ---: | ---: | ---: | ---: |
| 30 | **134.44** | 666.67 | 20 |
| 60 | **141.67** | 666.67 | 40 |
| 144 | **145.88** | 673.61 | 97 |

**The apex differs by 11.44 px between 30 fps and 144 fps — 8.5% of the 30 fps apex.** Airtime is
within 7 ms across the three. The cause is arithmetic, not a defect: semi-implicit Euler applies
gravity for a whole step before integrating position, so a coarser step loses more of the top of the
parabola. Every fixed-step-integrated game has this property.

**This is the measurement most directly relevant to the contract's own sentence** — "input
responsiveness such that jump timing is fair". It is stated here as a measured fact and nothing more.
**Whether 11.44 px of apex variation across the plausible refresh-rate range is fair is a judgement
that requires a device baseline and belongs to the owner, not to ENG-11.** For calibration without
implying a threshold: the tallest cactus (`CACTUS_KINDS.tall`) is 82 px and the character is 66 px
tall, so the variation is a meaningful fraction of the clearance geometry, not a rounding artifact.
It is carried as risk **PERF-R-01** in §10.

---

## 6. Recovery and resilience

There is no server, no persistence and no deployment. "Recovery" here can only mean *what survives
what*, and the honest answer is short.

### 6.1 A run does not survive a reload — nothing does (AC-23)

**Stated plainly: on reload, everything is lost. The score, the run in progress, the character
position, the obstacle field and the entire accumulated score trace are gone, and the page comes up in
`idle` exactly as on a first visit.** There is no autosave, no resume, no crash recovery, no draft
state and no way for a player to get a run back. This is not a limitation to be worked around — AC-23
requires it, and the desired-outcome text makes persistence a **non-goal for Unit 1, removed from
scope rather than deferred**.

The mechanism is that no persistence path exists to clear. Verified over the delivered `src/` at
`cacfcb0`:

| API | Call sites |
| --- | --- |
| `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` | **0** (the only textual matches are in the two doc comments in `src/main.js` and `src/trace/score-trace.js` that state their absence) |
| `caches.`, `navigator.storage`, `openDatabase`, `serviceWorker`, `BroadcastChannel`, `SharedWorker` | **0** |
| `history.pushState`, `location.hash`, `URLSearchParams` | **0** |
| `fetch(`, `navigator.sendBeacon` | **0** |

The score trace is a module-scope array. It survives restarts within a page session (AC-22) and dies
with the JavaScript realm. There is deliberately **no unload handler** (ADR-003 §3) — there is nothing
to flush.

**Consequence for reliability, stated once:** because nothing is written anywhere, there is nothing to
corrupt, nothing to migrate, nothing to back up and nothing to restore. `GATE-DATABASE` is
`required: false` for the same reason (WS-06). The reliability surface of this delivery is the browser
tab, and the recovery procedure is "reload the page".

### 6.2 The delta-time clamp does prevent a teleport — confirmed

ADR-002 §5 and `PHYSICS.maxStepSeconds` (0.05 s, i.e. 50 ms) claim that a long frame gap must not
teleport the character through a cactus. **Confirmed by measurement**, at the delivered value:

| Raw gap (ms) | `clampStepSeconds(gap)` (s) | World px advanced on that one frame | Unclamped would have been |
| ---: | ---: | ---: | ---: |
| 16.67 | 0.01667 | 6.70 | 7 |
| 33.33 | 0.03333 | 13.41 | 13 |
| 50.00 | 0.05000 | 20.13 | 20 |
| 51.00 | 0.05000 | 20.13 | 21 |
| 200.00 | 0.05000 | 20.21 | 81 |
| 1,000.00 | 0.05000 | 20.65 | 413 |
| 5,000.00 | 0.05000 | 22.85 | 2,285 |
| 60,000.00 | 0.05000 | **36.00** | **43,200** |
| 3,600,000.00 | 0.05000 | **36.00** | 2,592,000 |

The clamp engages at exactly 50 ms and holds flat above it. A one-hour frame gap advances the world
by **36 px instead of 2,592,000 px** — a factor of 72,000. The residual growth from 20.13 px at 50 ms
to 36.00 px at 60 s is not clamp leakage: it is the speed ramp, which reads `elapsedMs` (unclamped, by
design) and reaches the 720 px/s cap, so the clamped 0.05 s step covers more ground. 720 × 0.05 = 36.
The clamp is on the *step*, not on the speed, and 36 px is its ceiling.

Direct behavioural check: a cactus seated at x = 410, directly in the character's path, subjected to
thirty consecutive 5,000 ms frame gaps, moves 388.3 → 363.8 → 336.5 → 306.5 → 273.8 → 238.3 → 202.3 →
166.3 → 130.3 → 94.3 → 58.3 → 22.3 → … It is stepped past the character one clamped step at a time and
is **never skipped over**. The collision test is evaluated on every one of those steps.

This corroborates the 36 px figure WS-05 §3.8 measured independently by a different method.

### 6.3 The one asymmetry, already on the record — not re-opened here

WS-05 §3.8 measured that a backgrounded tab pauses `requestAnimationFrame` while the score, being
time-derived, keeps accruing: 60 s hidden adds 600 points while the world advances 36 px and zero
collision tests are evaluated. **ENG-11 reproduced the 36 px half of that measurement (§6.2) and does
not repeat the scoring half.** WS-05 placed it correctly: it is a recorded property, correct against
AC-08/AC-20/AC-21 as written, distinct from the score-forgeability risk the owner already accepted in
`DEC-20260809-001`, and **not** an AC failure. ENG-11 has no authority to re-accept, re-scope or
re-decide it and does not. It is referenced here only because it is the single largest reliability
property of the run loop and a performance review that omitted it would be incomplete.

---

## 7. Observability — what the delivery exposes, and what it does not

### 7.1 What exists

Three affordances, all specified by ADR-004 §1, all emitted from the single `transition()` writer in
`src/game/state-machine.js` so they cannot drift from the state they report:

| Affordance | How it is read | Answers |
| --- | --- | --- |
| **`data-game-state`** attribute on `#dino-dash` | `document.querySelector("#dino-dash").dataset.gameState` | "What state is it in *right now*?" — also visible in a saved DOM snapshot and in a screenshot's DOM, and load-bearing for CSS, so a lying signal would be visibly wrong |
| **`window.dinoDash`** accessor (frozen, non-writable, non-configurable) | `.getState()`, `.getScoreTrace()`, `.getBackgroundVariations()`, `.version` | "What state, what runs have ended, what backgrounds exist?" — `getScoreTrace()` returns new objects in a new array on every call, so observing cannot corrupt |
| **`dino-dash:statechange`** `CustomEvent` | bubbling, on `#dino-dash`, `detail: { from, to }` | "What transitions happened, in order?" — catches transitions an attribute poll would miss |

All three are **read-only from outside**. Writing `data-game-state` from the console or dispatching a
forged event changes nothing; there is no setter and no listener that acts on either.

These exist to make AC-26 and AC-16/AC-17 checkable by someone who did not write the game. They are
**verification affordances, not production telemetry**, and this document does not upgrade them into
telemetry by describing them.

### 7.2 What does not exist

Verified by exhaustive search over `src/` at `cacfcb0` — every one of these has **zero** call sites:

| Absent | Count |
| --- | ---: |
| `console.*` — any log, warn, error, debug, time | **0** |
| `window.onerror`, `addEventListener("error")`, `unhandledrejection`, `reportError` | **0** |
| `try` / `catch` — anywhere in the delivery | **0** |
| `PerformanceObserver`, `performance.mark`, `performance.measure` | **0** |
| `fetch`, `navigator.sendBeacon`, `XMLHttpRequest`, `WebSocket` — any egress for a metric | **0** |
| Third-party monitoring, RUM or crash-reporting SDK | **0** |

**So, plainly: there is no logging, no error reporting, no metrics, no tracing, no crash capture, no
uptime signal, no alerting and no dashboard. An unhandled exception in the frame callback would stop
the loop with nothing recorded anywhere except the browser's own console, which no one is watching.**

The zero `console.*` count is not an oversight — AC-01 requires a clean console, and the browser
console is the only diagnostic channel a static page has. The zero `try`/`catch` count means every
error propagates rather than being silently swallowed, which is the more diagnosable of the two
failure modes for a page with no reporting.

**ENG-11 added no observability and recommends none for Unit 1.** Adding logging would put text in the
console AC-01 forbids; adding metrics would require an egress path AC-24 forbids and touch the
identity surface AC-25 forbids. The absence is a consequence of the contract, not a gap in the
implementation. It is recorded so that a later unit with a server does not assume any of it already
exists.

---

## 8. The artifact — cold-load weight and request count

WS-08 §3 reported 42,517 B over 17 requests. ENG-11 **re-derived this independently rather than citing
it**, by two methods in `tests/perf/artifact-weight.mjs`: (a) walking the static module graph from
`src/index.html` and summing bytes on disk, and (b) issuing one real HTTP GET per resource against the
delivery's own `tests/tools/static-server.mjs` and summing what came back.

| | Measured |
| --- | ---: |
| Resources in the cold-load closure | **17** |
| Bytes on disk across the closure | **42,517** |
| HTTP requests issued | **17** |
| Bytes transferred over the wire | **42,517** |
| Non-200 responses | **0** |
| Cross-origin / absolute references in the closure | **0** (the only match is `href="data:,"`, the favicon stub — an inline data URI, not a request) |

**WS-08's figures are confirmed exactly.** Disk total and wire total are identical, which is itself
evidence for ADR-005 §1: there is no build step, no minifier and no compression layer between the
reviewed source and the running artifact.

Closure composition: 1 document + 1 stylesheet + 15 ES modules.

| Bytes | Path | | Bytes | Path |
| ---: | --- | --- | ---: | --- |
| 7,049 | `render/palette.js` | | 1,714 | `game/obstacles.js` |
| 6,191 | `render/canvas-renderer.js` | | 1,323 | `game/physics.js` |
| 3,903 | `main.js` | | 1,158 | `engine/clock.js` |
| 3,442 | `styles/game.css` | | 1,065 | `game/score.js` |
| 2,477 | `index.html` | | 1,032 | `game/collision.js` |
| 2,238 | `trace/score-trace.js` | | 945 | `engine/loop.js` |
| 2,212 | `render/hud.js` | | | |
| 2,121 | `game/simulation.js` | | | |
| 1,944 | `game/run-state.js` | | | |
| 1,889 | `input/keyboard.js` | | | |
| 1,814 | `game/state-machine.js` | | | |

Two facts a later unit will want:

- **Total bytes of `src/` on disk is 42,559.** The 42 B difference from the cold-load figure is
  `src/package.json`, the only file under `src/` the browser never fetches. WS-08's two numbers are
  consistent, not contradictory.
- **The module graph rooted at `main.js` is 15 modules with a maximum dependency depth of 3** — depth 1
  `main.js`, depth 2 twelve modules, depth 3 `game/collision.js` and `game/obstacles.js`. An
  unbundled ES-module graph serialises discovery by depth, so a cold load costs at most three
  dependent round trips, not fifteen. This is stated because it is the figure a bundling decision in
  a later unit would be argued from; **no such decision is proposed here**, and ADR-005 §1's
  no-build-step choice is not reopened.

Serial GETs on loopback completed in 237.7 ms wall time. **That is a property of the measurement loop,
not a page load time**, and must not be read as one — it excludes parse, compile, layout, paint and
all browser-side work, and loopback is not a network.

---

## 9. The two gates ENG-11 owns

Both are declared in `engineering/quality/gates.json`.

### `GATE-PERFORMANCE` — `required: false` — **NOT ENGAGED**

Declared evidence: "budget and load results", "regression comparison".

**Neither can be produced, and the reason is on the record rather than in this workstream.**

- **"Budget results"** presupposes a budget. There is none. `DEVREQ-EVT-20260809-001` states the
  budget is UNKNOWN and its own verification clause requires that "any budget asserted before the
  baseline exists must be rejected". A gate cannot be passed by inventing the criterion it is
  measured against.
- **"Regression comparison"** presupposes a prior measured baseline. This is the first delivery of
  Unit 1; `cacfcb0` has no predecessor revision of the game to compare against. The numbers in §2–§5
  are the *first* such baseline, and a first baseline is not a regression comparison.
- **"Load results"** presupposes concurrent load. There is no server, no shared resource and no
  concurrency surface anywhere in Unit 1. Load is undefined for a static page each player renders
  locally.

The gate's `required: false` flag is therefore correct and is the reason this is a clean recorded gap
rather than a blocker. **This is a recorded gap, not a pass.** It stays open into later units, exactly
as WS-01 **R-02** carries it. Nothing in §2–§8 should be read as closing it.

### `GATE-RELIABILITY` — `required: false` — **NOT ENGAGED**

Declared evidence: "service objectives", "telemetry and recovery evidence".

- **"Service objectives"** presuppose a service. There is none: no server, no API, no deployment
  target, no runtime dependency, no uptime to measure, no error budget to spend and no incident
  surface. WS-04 and WS-08 recorded `not_applicable` for the same absence.
- **"Telemetry"** does not exist and must not (§7.2): AC-24 forbids the egress a telemetry pipeline
  needs, AC-01 forbids the console output a logger would produce, AC-25 forbids the identity a metric
  would carry.
- **"Recovery evidence"** is producible only in the degenerate sense §6 states: nothing persists, so
  nothing can be recovered, and reload equals a first visit (AC-23). §6.2's clamp confirmation is the
  nearest thing to positive resilience evidence in this delivery, and it is a correctness property of
  the run loop rather than a service objective.

`required: false` is correct. **Recorded gap, not a pass.**

### What ENG-11 explicitly did not do with these gates

Neither gate was waived, marked satisfied, back-filled with a synthesised threshold, nor closed by
reinterpreting its declared evidence into something this delivery happens to have. `required: false`
means the delivery is not blocked; it does not mean the gate was met. **No engineering workstream can
convert an unquantified requirement into a passed performance gate, and this one did not try.**

---

## 10. What the owner would need in order to set a budget

Stated so the gap is actionable, **not as a recommendation of any value**:

1. **A device baseline from real target-user data** — which devices, which browsers, which refresh
   rates. The contract's own verification clause makes this the precondition: "Once a device baseline
   is established from real target-user data, a reproducible rendering-headroom method … can be
   applied by RB-09 on that baseline." `DD-0003-result.json` records that every authoritative
   performance source attempted was unreachable, which is why the baseline does not exist.
2. **A decision about which quantity the budget governs.** These are different budgets and the numbers
   here inform them differently: simulation step cost (§2–§3, measured), render cost (unmeasured —
   needs the browser tier), end-to-end frame time (unmeasured), input-to-visible latency (only the
   simulation-side component measured, §6 of the harness output), cold-load weight (§8, measured), or
   jump-arc fairness across refresh rates (§5b, measured).
3. **A fairness position on §5b.** The 11.44 px apex spread across 30–144 fps is arithmetic, not a
   bug. Whether it is acceptable, or whether a later unit should move to a fixed-timestep accumulator,
   is a product judgement about what "fair" means. The measurement is supplied; the judgement is not.

### Risks carried open

- **PERF-R-01 — jump apex varies with refresh rate.** 134.44 px at 30 fps, 145.88 px at 144 fps: an
  8.5% spread, against a 66 px character and an 82 px tallest cactus. Measured, not judged. Directly
  touches the contract's "jump timing is fair" phrase. No threshold asserted; no code changed.
- **PERF-R-02 — the render half of the frame is unmeasured.** §2 covers simulation only. Any total
  frame-time budget would need a browser-tier measurement that does not yet exist. Whoever sets a
  budget must not assume §2 is the whole frame.
- **PERF-R-03 — all figures come from one developer workstation** (§1), which is not a target-user
  device and is likely faster than the low end of the real audience. Single-machine figures do not
  transfer.
- **PERF-R-04 — the score trace grows unboundedly by design** (§4b, ~58.3 B/record, one record per run
  end). Harmless at Unit 1 scale, inherited by Unit 3 at the seam ADR-002 §3 names.
- **PERF-R-05 — `GATE-PERFORMANCE` and `GATE-RELIABILITY` are recorded gaps, not passes** (§9), and
  stay open into later units alongside WS-01 **R-02**.

---

## 11. Reproducing every number in this document

Two harnesses under `tests/perf/`. **Both are measurement tools. Neither asserts a threshold, neither
has a pass/fail outcome, and neither is wired into the pass/fail unit tier** — they are deliberately
not named `*.test.mjs`, and Node's default `node --test` discovery was verified not to pick either of
them up while still discovering the unit tier.

```
node --expose-gc tests/perf/simulation-cost.mjs      # sections 2, 3, 4, 5, 6.2
node tests/perf/artifact-weight.mjs [port]           # section 8 (starts and stops the static server)
```

Both import the delivered `src/` modules through their public entry points and modify nothing. The
simulation harness uses a seeded random source so obstacle traffic is identical between executions;
timing figures will differ between machines and between runs on the same machine, which is the point
of §1.

The existing unit tier at this revision was run to confirm WS-11 broke nothing:
`node --test "tests/unit/*.test.mjs"` → **61 passed, 0 failed**.

---

## 12. What ENG-11 did not do

- **Invented no threshold.** No frame-time target, no input-latency figure, no byte budget, no device
  baseline, no SLO, no error budget, no regression tolerance. Not in this document, not in the
  harnesses, not in a test assertion, not implied by a comparison. This was the single binding
  constraint on the workstream.
- **Changed nothing under `src/`.** The delivery is sealed at WS-03. Every measurement drives the
  delivered modules unmodified through their public entry points. Not one byte of `src/` differs, and
  §8's byte totals would have changed if it did.
- **Added no observability.** No logger, no error handler, no metric, no `PerformanceObserver`, no
  telemetry, no egress. §7.2's zero counts are the state of the delivery, and they are still zero.
- **Added nothing to the pass/fail test tier.** The two harnesses assert nothing and are outside test
  discovery (§11). A performance harness that asserted would be asserting an invented number.
- **Re-decided nothing already on the record.** WS-05's background-tab scoring property is referenced
  and its physics half corroborated; it is not re-accepted, re-scoped or reclassified. The owner's
  `DEC-20260809-001` risk acceptance is untouched.
- **Issued no verification disposition.** WS-11 records `not_applicable`. Only ENG-15 at WS-14 issues
  a disposition, and nothing here anticipates it.
- **Wrote nothing outside `docs/` and `tests/`.** This file plus `tests/perf/simulation-cost.mjs` and
  `tests/perf/artifact-weight.mjs`. Nothing under `engineering/`, `.development-os/`, `DEVELOPMENT.md`,
  `development-os.config.json`, `src/`, or anywhere in `D:/os-test/dino-dash`.
