# WS-05 — Client Applications: recorded not-applicable determination

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-05, owner role ENG-05, producer actor `actor-eng-05`, domain `mobile_desktop_clients` |
| Plan dependency | WS-02 (complete) |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `290f45c907082b9985521ec851febb187978c2d5` |
| Disposition | `not_applicable` — **verified by scan and by driving the delivered core, not asserted** |
| Gate | none. No gate in `engineering/quality/gates.json` is owned by ENG-05 |
| Authored | 2026-08-10 |

This record exists because `not_applicable` is a disposition, not an omission. WS-09, WS-10, WS-13 and
WS-14 all declare `WS-05` in their plan dependencies, so an absent record blocks four workstreams —
two of them required-gate owners — on nothing (WS-01 **R-03**). It contains no client, no packaging,
no wrapper, no manifest and no scaffolding for any of them.

---

## 1. The determination

**Unit 1 is a browser-only delivery. There is no mobile app, no desktop app, no packaged or
installable client, no store surface and no application-lifecycle surface. WS-05 has no
implementation work, and ENG-05 built none.**

`roles.json` gives ENG-05 three capabilities: "implement mobile and desktop clients", "manage client
lifecycle", "verify offline and upgrade behavior". At this revision the first has no target, the
second has no host to be managed by, and the third has no installed artifact to go offline or to
upgrade. Section 3 establishes each of those by measurement rather than by restating WS-01's
pre-classification.

The absence is contracted. Section 3.2 counts the request's own vocabulary: across the whole of
`DEVREQ-EVT-20260809-001`, the words *mobile*, *iOS*, *Android*, *app store*, *installer*, *PWA*,
*native*, *packaged*, *tablet* and *phone* occur **zero** times each, while *browser* occurs 10 times
and *keyboard* 11. AC-01 names the target once and exactly: "a current **desktop browser** … from a
single entry point under `src/`". ADR-001 §4 then fixes the runtime as native ES modules served over
a local static HTTP origin, and ADR-005 §1 removes the build step entirely, so the delivered source
*is* the running artifact. There is nothing between the repository and the browser for a client
workstream to own.

WS-01 §1 pre-classified WS-05 as `not_applicable` on the reasoning that "delivery target is a desktop
browser page, which is ENG-03's domain". This document does not rely on that classification; it
re-derives the conclusion from the request and then checks it against the delivered tree.

---

## 2. Scope of the check, and environment

Everything in section 3 is a **static, source-level** check of the tree at
`290f45c907082b9985521ec851febb187978c2d5`, plus one **dynamic** check (3.8) that drives the delivered
DOM-free modules in Node under an injected frame schedule. No browser was launched: the runtime
observations AC-01, AC-22–AC-24 name are WS-10's to produce under `GATE-AUTOMATED-TESTS`, and one
platform behaviour this document reasons about is explicitly flagged as unmeasured in **L-01**.

Environment: Windows 11, Git Bash (GNU grep), Node `v22.23.2`, no `node_modules` and no root
`package.json` at this revision (WS-12 has not yet recorded a run). All commands were run from the
repository root `D:/os-test/dino-dash-app` on branch `codex/evt-20260809-001`. Every command below is
read-only except `node --test`, which executes existing test files and writes no artifact.

---

## 3. Commands run and their actual output

### 3.1 The revision under review

```
$ git rev-parse HEAD
290f45c907082b9985521ec851febb187978c2d5

$ git log --oneline -3
290f45c WS-04 Backend, API and Integration for DEVREQ-EVT-20260809-001: recorded not-applicable determination with source-level absence evidence
bf5ac18 Add project README and gameplay media
ea12453 WS-03 Frontend and Accessibility for DEVREQ-EVT-20260809-001: playable Unit 1 game under src, DOM-free core, score trace, palette and unit tier

$ node --version
v22.23.2
```

### 3.2 What the request itself asks for — word-boundary term counts over the whole contract

```
$ node --input-type=module -e "
import fs from 'node:fs';
const s = fs.readFileSync('.development-os/inbox/DEVREQ-EVT-20260809-001.json','utf8');
const terms = ['mobile','ios','android','app store','installer','PWA','native','packaged','electron','capacitor','tauri','cordova','tablet','phone','touch','desktop','browser','keyboard','pointer'];
for (const t of terms) {
  const re = new RegExp(String.raw\`\b\` + t.replace(/ /g,String.raw\`\s+\`) + String.raw\`\b\`, 'gi');
  const m = s.match(re);
  console.log(t.padEnd(12), m ? m.length : 0);
}
"
mobile       0
ios          0
android      0
app store    0
installer    0
PWA          0
native       0
packaged     0
electron     0
capacitor    0
tauri        0
cordova      0
tablet       0
phone        0
touch        1
desktop      1
browser      10
keyboard     11
pointer      2
```

Nine platform terms at zero. The one `desktop` hit is AC-01's "a current desktop browser". The one
`touch` hit is AC-12's "No function in Unit 1 requires a mouse, trackpad, touch or any pointing
device" — a prohibition, not a target. Both `pointer` hits are likewise negative (AC-02 "no pointer
input at any point", AC-12). The contract names a browser and a keyboard, and names no client
platform at all.

### 3.3 Absence of packaged-client tooling — file names, over the whole repository

```
$ git ls-files | grep -inE "electron|capacitor|tauri|cordova|nativescript|expo|manifest\.(json|webmanifest)|webmanifest|service-?worker|sw\.js|\.icns$|\.ico$|\.plist$|AndroidManifest|build\.gradle|Podfile|\.xcodeproj|forge\.config|electron-builder|config\.xml|\.spec$|\.dmg$|\.msi$|\.apk$|\.appx$"
(no output, exit status 1)

$ git ls-files | wc -l
76

$ find . -path ./.git -prune -o -type f -print | grep -inE "electron|capacitor|tauri|cordova|nativescript|expo|manifest\.(json|webmanifest)|webmanifest|service-?worker|/sw\.js|\.icns|\.ico|\.plist|AndroidManifest|build\.gradle|Podfile|xcodeproj|forge\.config|electron-builder|config\.xml|\.dmg|\.msi|\.apk|\.appx|\.exe|\.deb|\.rpm|\.snap"
(no output, exit status 1)

$ find . -path ./.git -prune -o -type f -print | wc -l
88

$ ls -d node_modules
ls: cannot access 'node_modules': No such file or directory

$ ls -l package.json package-lock.json
ls: cannot access 'package.json': No such file or directory
ls: cannot access 'package-lock.json': No such file or directory
```

**Zero matches across 76 tracked files and zero across all 88 files in the working tree.** No
`manifest.json`, no `.webmanifest`, no service worker, no `.icns`, no `.ico` (the entry point's
favicon is an inline `data:` URI, section 3.5), no `Info.plist`, no `AndroidManifest.xml`, no
`build.gradle`, no `Podfile`, no Xcode project, no `electron-builder` or `forge.config`, no
`capacitor.config`, no `tauri.conf.json`, no Cordova `config.xml`, and no built installer of any
format. There is no root `package.json` at this revision, so there is not even a place where a
packaging dependency could currently be declared.

### 3.4 Absence of packaged-client tooling — source tokens, over all 18 files under `src/`

Word-boundary matching, because `expo` is a substring of `export` and would otherwise report 45 false
hits:

```
$ for t in electron capacitor tauri cordova nativescript expo serviceWorker manifest webmanifest standalone BrowserWindow ipcRenderer; do printf '%-16s %s\n' "$t" "$(grep -rnowiE -- "$t" src/ | wc -l)"; done
electron         0
capacitor        0
tauri            0
cordova          0
nativescript     0
expo             0
serviceWorker    0
manifest         0
webmanifest      0
standalone       0
BrowserWindow    0
ipcRenderer      0
```

Zero for every token. `serviceWorker` and `manifest` occur twice each elsewhere in the repository;
both occurrences are inside WS-04's own record of the same scan
(`docs/engineering/WS-04-backend-review.md`, `.development-os/runs/…-WS-04-result.json`), not in any
delivered file. There is no `navigator.serviceWorker`, no `beforeinstallprompt`, no
`display-mode: standalone`, and no `window.electron` / `__TAURI__` bridge.

### 3.5 What the delivery actually is

```
$ find src -type f | wc -l
18

$ du -sb src | cut -f1
42559

$ grep -noE '(src|href)="[^"]*"' src/index.html
7:href="data:,"
8:href="styles/game.css"
60:src="main.js"

$ grep -c "<script" src/index.html
1

$ grep -rhoE "from '[^']*'" src/ | grep -cvE "from '\.{1,2}/"
0
```

**Eighteen files, 42,559 bytes, no build step, no dependency.** The entry point asks the browser for
exactly three things: an inline empty-data favicon (`data:,` — which exists so the browser does not
request `/favicon.ico`, and which is the whole of the delivery's icon story), one relative stylesheet,
and one relative `<script type="module">`. There is exactly one `<script>` tag. Every module specifier
in the tree is relative (`./` or `../`) — zero bare or absolute specifiers — so the module graph is
closed and resolved by the browser at load, from the serving origin, with no packager involved.

That is the delivery in full: `src/index.html` plus native ES modules, served statically. ADR-005 §1
states it as a decision ("the delivered source **is** the running artifact"); the counts above confirm
the delivered tree matches the decision.

### 3.6 The complete event surface is two listeners

```
$ grep -rn "addEventListener" src/
src/input/keyboard.js:49:  target.addEventListener('keydown', handleKeyDown, { passive: false });
src/main.js:112:window.addEventListener('resize', renderer.resize);
```

**Two listeners, and that is the entire event surface of the delivery.**

- `keydown` (`src/input/keyboard.js:49`) — the whole input path.
- `resize` (`src/main.js:112`) — and this one is worth reading before it is mistaken for a lifecycle
  or responsive handler. `createCanvasRenderer.resize()` (`src/render/canvas-renderer.js:128-133`)
  reads `globalThis.devicePixelRatio`, clamps it to `[1, 3]`, and re-sizes the canvas **backing
  store** while `LAYOUT.width`/`LAYOUT.height` stay fixed at 960×320. It never reads the element's
  laid-out size. It is a rendering-fidelity handler for a DPR change — moving the window to a
  different-density monitor, or a browser zoom step — not a layout handler and not an
  app-lifecycle handler.

### 3.7 The app-lifecycle listeners that do not exist

```
$ for t in visibilitychange visibilityState pagehide pageshow beforeunload unload freeze resume online offline appinstalled deviceready backbutton orientationchange blur focusout; do printf '%-20s %s\n' "$t" "$(grep -rnowE -- "$t" src/ | wc -l)"; done
visibilitychange     0
visibilityState      0
pagehide             0
pageshow             0
beforeunload         0
unload               1
freeze               41
resume               0
online               0
offline              0
appinstalled         0
deviceready          0
backbutton           0
orientationchange    0
blur                 0
focusout             0

$ grep -rn "document\.hidden\|document\.visibilityState\|requestIdleCallback\|setTimeout\|setInterval" src/
(no output)

$ grep -rn "freeze" src/ | grep -v "Object\.freeze" | wc -l
0
```

Two hits need disambiguating, and both dissolve:

- **`freeze` 41/41 are `Object.freeze`.** Filtering the lines rather than the matched words leaves
  zero. There is no Page Lifecycle `freeze` handler.
- **`unload` 1** is `src/trace/score-trace.js:12`, a comment recording that no unload handler exists,
  per ADR-003 §3.

So: **`visibilitychange`, `pagehide`, `pageshow`, `beforeunload`, `freeze` and `resume` are all
absent, as are `online`/`offline` and every Cordova-era lifecycle event.** `document.hidden` and
`document.visibilityState` are never read. There is no `setTimeout`, `setInterval` or
`requestIdleCallback` anywhere — the only scheduler in the delivery is `requestAnimationFrame`:

```
$ grep -rn "requestAnimationFrame\|performance.now" src/
src/engine/clock.js:4: * The time function is injected; it defaults to `performance.now`, reached through
src/engine/clock.js:10:  return globalThis.performance.now();
src/engine/loop.js:2: * requestAnimationFrame loop (ADR-002 §5).
src/engine/loop.js:14:      : (callback) => globalThis.requestAnimationFrame(callback);
```

**Two of these absences are deliberate and correct, and must not be read as gaps.** ADR-003 §3
instructs that no `unload`/`beforeunload` handler be added: the score trace is a page-memory array
with no persistence path, so there is nothing to clear, and registering an unload handler would
disqualify the page from the back/forward cache for no benefit. The remaining absence —
`visibilitychange` — is the one with a consequence, and 3.8 measures it.

### 3.8 The consequence: a backgrounded tab pauses `requestAnimationFrame`, and the score is time-derived

The two facts that meet here are both in the delivered source:

1. **The score is a pure function of elapsed run time**, not of frames. `src/game/simulation.js:34-35`
   sets `runState.elapsedMs = Math.max(0, nowMs - runState.startedAtMs)` then
   `runState.score = scoreForElapsedMs(runState.elapsedMs)`, and `src/game/score.js:12-15` is
   `Math.floor(elapsedMs * RUN.scorePerMs)` with `scorePerMs: 0.01` — ten points per second of run
   time. Both readings come from `performance.now()` (3.7), a monotonic source.
2. **The physics step is clamped and the score is not.** `PHYSICS.maxStepSeconds: 0.05`
   (`src/game/run-state.js:29-30`) carries the comment "Delta-time clamp: a backgrounded tab must not
   teleport the character", and `src/game/simulation.js:23-24` states the asymmetry outright:
   "Elapsed time (and therefore the score) is the raw monotonic delta from the run's start mark, so
   the score tracks real time; only the physics step is clamped."

The asymmetry is therefore documented and intentional. What follows is its measured consequence, not
a newly discovered bug.

Driving the delivered DOM-free core with the frame schedule a hidden tab produces — normal 60 Hz
frames, then a stretch with **no frames at all**, then one resume frame:

```
$ node --input-type=module -e "
const { createRunState } = await import('./src/game/run-state.js');
const { advanceRun, markRunStart } = await import('./src/game/simulation.js');
const FRAME = 1000/60, FOREGROUND = 2000, GAP = 60000, random = () => 0.5;
const run = createRunState(0);
let t = 1000, prev = 1000, frames = 0, hitFg = false;
markRunStart(run, t);
while (t - 1000 < FOREGROUND) { t += FRAME; hitFg = advanceRun(run, t, t - prev, random) || hitFg; prev = t; frames++; }
const b = { frames, elapsedMs: Math.round(run.elapsedMs), score: run.score, distancePx: Math.round(run.distancePx), speed: Math.round(run.speedPxPerSecond), obstacles: run.obstacles.length, variationId: run.variationId };
t += GAP;
const hitResume = advanceRun(run, t, t - prev, random); frames++;
const a = { frames, elapsedMs: Math.round(run.elapsedMs), score: run.score, distancePx: Math.round(run.distancePx), speed: Math.round(run.speedPxPerSecond), obstacles: run.obstacles.length, variationId: run.variationId };
console.log('frames delivered during 2000 ms of foreground :', b.frames);
console.log('frames delivered during 60000 ms of gap       : 0');
console.log('collision during foreground                   :', hitFg);
console.log('');
console.log('field'.padEnd(14) + 'before-gap'.padStart(12) + 'after-1-resume-frame'.padStart(22) + 'delta'.padStart(10));
for (const k of ['elapsedMs','score','distancePx','speed','obstacles']) console.log(k.padEnd(14) + String(b[k]).padStart(12) + String(a[k]).padStart(22) + String(a[k]-b[k]).padStart(10));
console.log('variationId'.padEnd(14) + b.variationId.padStart(12) + a.variationId.padStart(22));
console.log('');
console.log('collision reported on the resume frame        :', hitResume);
console.log('score points gained per second of gap         :', (a.score - b.score) / (GAP/1000));
console.log('world pixels advanced across the gap          :', a.distancePx - b.distancePx);
console.log('world ms simulated across the 60000 ms gap    :', Math.round((a.distancePx - b.distancePx) / a.speed * 1000));
"
frames delivered during 2000 ms of foreground : 121
frames delivered during 60000 ms of gap       : 0
collision during foreground                   : false

field           before-gap  after-1-resume-frame     delta
elapsedMs             2017                 62017     60000
score                   20                   620       600
distancePx             789                   825        36
speed                  402                   720       318
obstacles                1                     1         0
variationId           dawn                  dusk

collision reported on the resume frame        : false
score points gained per second of gap         : 10
world pixels advanced across the gap          : 36
world ms simulated across the 60000 ms gap    : 50
```

**Read that as a run left in a background tab.** The player actually played for two seconds and
earned 20 points. Sixty seconds of not-playing added **600 points** — thirty times the score they
earned by playing — while the world advanced **36 pixels**, which is 50 ms of simulated motion out of
60,000 ms of real time. The single obstacle on screen did not reach the character, no collision was
evaluated during the gap (the collision test lives inside `advanceRun`, which is only reached from the
rAF callback, so with zero frames there is zero risk), and the run's difficulty jumped straight to the
speed cap (402 → 720 px/s, the `RUN.maxSpeedPxPerSecond` ceiling) with the background tier stepping
`dawn` → `dusk` in one frame.

**So: is the monotonic clock making this correct, or not? Both, and the split is the point.**

- **Against the contract as written, it is correct, and "fixing" it would break AC-20.** AC-21
  requires `sessionLengthMs` to come from a monotonic source that survives a wall-clock change; it
  does. AC-20 requires `sessionLengthMs` to be within 250 ms of the run's externally observed
  duration — and the background time genuinely *is* part of that duration, because the run never
  ended. Subtracting hidden time (the obvious `visibilitychange` "fix") would make `sessionLengthMs`
  diverge from observed duration by exactly the amount hidden, and would fail AC-20 as written. AC-08
  is likewise satisfied: the score starts at zero, is an integer, and the jump is an increase, never a
  decrease. No Unit 1 acceptance criterion asserts that the score measures *play*.
- **As a measure of play, it is not correct, and that is a real property to carry forward.** The
  score measures wall-clock time since the run started. Time spent hidden is risk-free time, and it
  is banked at the full rate. The mechanism needs no console, no tooling and no intent to exploit —
  Ctrl+Tab reaches it.

This is **distinct from the client-side score-forgeability risk the owner already accepted** in
`DEC-20260809-001` (bounded to Units 1 and 2, requiring server-side validation from Unit 3). That risk
is about a player deliberately editing a value. This is about the value being defined as something
other than play in the first place. ENG-05 records it as an observation and does **not** re-accept,
re-scope or re-decide the owner's risk acceptance, and does **not** record it as an AC failure —
sections 4 and 6 place it.

Two smaller consequences of the same absence, stated for completeness:

- **A bfcache restore behaves identically.** With no `pageshow`/`pagehide` handling, navigating away
  and back restores the page and the loop resumes with one large monotonic delta — the same shape as
  the table above.
- **A tab that Chromium freezes and then discards takes the run and the whole session trace with it.**
  With no `freeze`/`resume` handler there is no warning and no record; the page reloads on return.
  That outcome is AC-23-consistent ("reload is indistinguishable from a first visit") and AC-22
  ("discarded on unload") — it is correct behaviour, simply not *announced* behaviour.

### 3.9 Keyboard-only, touch and responsiveness

```
$ for t in "onclick" "click" "mousedown" "mouseup" "mousemove" "touchstart" "touchend" "touchmove" "pointerdown" "pointerup" "pointermove" "gesturestart" "tap" "swipe" "<button" "role=\"button\""; do printf '%-16s %s\n' "$t" "$(grep -rFoi -- "$t" src/ | wc -l)"; done
onclick          0
click            0
mousedown        0
mouseup          0
mousemove        0
touchstart       0
touchend         0
touchmove        0
pointerdown      0
pointerup        0
pointermove      0
gesturestart     0
tap              0
swipe            0
<button          0
role="button"    0

$ grep -rn "ACTION_KEY_CODES\|ACTION_KEY_VALUES" src/input/keyboard.js
19:export const ACTION_KEY_CODES = Object.freeze(['Space', 'ArrowUp']);
26:export const ACTION_KEY_VALUES = Object.freeze([' ', 'Spacebar', 'ArrowUp']);
29:  return ACTION_KEY_CODES.includes(event.code) || ACTION_KEY_VALUES.includes(event.key);

$ grep -n "@media" src/styles/game.css
169:@media (prefers-reduced-motion: reduce) {
```

**Stated plainly: the game is not playable without a keyboard.** The entire input surface is Space and
Up Arrow, by `KeyboardEvent.code` (so layout-independent), with a `KeyboardEvent.key` fallback naming
the same two keys and no third. There is no pointer, mouse, touch or gesture handler of any kind, and
no `<button>` or `role="button"` a pointer could reach. On a touch device with no physical keyboard,
the page loads and renders but the run cannot be started.

**This is contract-consistent, not a defect.** AC-12 requires the complete journey to be completable
"using the keyboard alone. No function in Unit 1 requires a mouse, trackpad, touch or any pointing
device"; AC-02 requires the run to start "using the keyboard alone, with no pointer input at any
point"; AC-01 names the target as a desktop browser. Keyboard-only is the specification, and a touch
handler would be uncontracted scope, not a fix. `src/input/keyboard.js:8-9` states the same position
in source: "keyboard is not an alternative path, it is the only path (AC-12)."

**The layout is fluid; the input is not.** `src/index.html` carries
`<meta name="viewport" content="width=device-width, initial-scale=1">`, and `game.css` sizes the
shell with `max-width: 960px` + `width: 100%`, the stage with `width: 100%; aspect-ratio: 3 / 1`, the
canvas with `width: 100%; height: 100%`, and the type with `clamp()`. So the page *reflows* to a
narrow viewport perfectly well. There is exactly one media query in the whole stylesheet and it is
`prefers-reduced-motion`, not a breakpoint — none is needed, because the layout is intrinsically
fluid. The result: on a phone the game **looks** right and **cannot be played**. That combination is
worth stating explicitly so that a later reader does not infer mobile support from the responsive
layout, and does not file the missing touch path as a rendering bug.

### 3.10 The existing unit tier runs and passes at this revision

```
$ node --test tests/unit/*.test.mjs
(61 per-subtest TAP blocks elided; the summary is reproduced verbatim)
1..61
# tests 61
# suites 0
# pass 61
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 203.2315
```

**61 of 61 pass**, with no `npm ci` and no `node_modules`, because the game and its unit tier have
zero dependencies. One test in the suite is directly in this section's territory —
`tests/unit/physics-and-score.test.mjs:54`, "the simulation step is clamped so a backgrounded tab
cannot teleport", asserting `clampStepSeconds(5000) === PHYSICS.maxStepSeconds`. **It covers the
physics half of the background case and not the scoring half**; no test in the suite asserts anything
about score accrual across a frame gap. That is the coverage observation this workstream hands to
WS-10, in section 6.

Note that `node --test tests/unit/` (directory form) fails with `MODULE_NOT_FOUND` at this revision;
the explicit glob above is the form that runs. Recorded so the next reader does not mistake it for a
broken suite.

---

## 4. Findings in ENG-05's domain

ENG-05 **owns no acceptance criterion.** WS-01 §3 assigns all 30 elsewhere. What follows are domain
review findings, not dispositions. Only ENG-15 at WS-14 issues a verification disposition for this
delivery, and nothing here anticipates it.

| Domain capability from `roles.json` | Finding at `290f45c` | Evidence |
| --- | --- | --- |
| "implement mobile and desktop clients" | **No target exists.** Contract names no client platform (nine platform terms at zero); zero packaging tooling in 76 tracked / 88 working-tree files; zero framework tokens in 18 source files | 3.2, 3.3, 3.4 |
| "manage client lifecycle" | **No lifecycle surface exists.** Two listeners total — `keydown` and a DPR-driven `resize`. `visibilitychange`, `pagehide`, `pageshow`, `beforeunload`, `freeze`, `resume`, `online`, `offline` are all absent; `document.hidden`/`visibilityState` never read. Two of those absences (`unload`/`beforeunload`) are ADR-003 §3 decisions and are correct | 3.6, 3.7 |
| "verify offline and upgrade behavior" — offline | **Offline is a property of the loaded page, not of an installation.** AC-24 requires the loaded game to keep working with the network off, which it does by construction (WS-04 established zero executable network call sites). But with no service worker and no cache manifest, a *cold* load still requires the static origin. "Playable offline" here means "keeps working once loaded", not "available without the server" — a distinction that matters the moment anyone reads AC-24 as an installability claim | 3.3, 3.4, 3.5 |
| "verify offline and upgrade behavior" — upgrade | **No upgrade surface exists.** No version channel, no update check, no cached older copy to supersede. `window.dinoDash.version === 1` (`src/main.js:95`) is a page-local constant on a read-only observation accessor, not an application version. Every reload fetches current source from the origin | 3.5, 3.7 |
| Keyboard-only playability | **Confirmed and contract-consistent.** Space and Up Arrow only; zero pointer/touch/mouse handlers; not playable without a keyboard; AC-01/AC-02/AC-12 specify exactly that | 3.9 |
| Backgrounded-run behaviour | **Correct against AC-08/AC-20/AC-21; not a measure of play.** 60 s hidden = +600 points, 36 px of world motion, zero collision tests evaluated. Recorded as a property to carry forward, not as an AC failure and not as a re-acceptance of `DEC-20260809-001` | 3.8 |

---

## 5. Gate position

**No gate in `engineering/quality/gates.json` is owned by ENG-05.** The fifteen gates map to ENG-02,
ENG-01, ENG-10, ENG-09 (×3, counting `GATE-PRIVACY-COMPLIANCE`), ENG-06, ENG-04, ENG-08, ENG-03,
ENG-11 (×2), ENG-13, ENG-14 and ENG-15. WS-05 therefore differs from WS-04, which at least had a
`required: false` gate to record as not applicable: here there is no gate to record at all, and no
required gate is affected. `not_applicable` is used because the contract's own target removes the
work — never to route around a gate. WS-01 §1 independently verifies that every `required: true` gate
lands on a workstream with real work.

---

## 6. What a later unit would need

Stated as **open questions for a future unit's own planning cycle, not as a design.** ENG-05 designs
nothing here: no client architecture, no packaging strategy, no lifecycle model, no touch input
scheme. Doing so would scaffold a platform for uncontracted work, which WS-01 §0 and **B-03**
prohibit and which the request's non-goals text puts behind the human
`product_direction_or_priority` gate.

1. **A decision on what the score is supposed to measure — play, or wall time.** Section 3.8 shows it
   currently measures wall time, and that background time accrues at the full rate with zero risk.
   This must be settled *before* Unit 3 puts these numbers in a shared table, because it feeds the
   same field as the forgeability risk the owner already accepted, and the two are different problems
   with different fixes. It is a product question about what a score means, not an engineering
   detail.
2. **If the answer is "play", the mechanism collides with a frozen contract.** Pausing a run on
   `visibilitychange` would change the meaning of `sessionLengthMs` from "wall-clock duration of the
   run" to "active play time". ADR-003 §6 freezes the three field names, their types and their units,
   and permits *adding* fields only. So the change would need either a new field (e.g. an active-time
   field alongside the existing one) or a contract amendment — and it would have to be re-checked
   against AC-20's 250 ms tolerance, which is written against externally observed duration.
3. **No test covers score accrual across a frame gap.** The suite covers the physics half
   (`clampStepSeconds(5000)`) and not the scoring half (3.10). Whatever a later unit decides in (1),
   WS-10 or its successor needs a unit-tier test that drives `advanceRun` across a gap — the harness
   shape in 3.8 works and needs no browser.
4. **If a later unit targets touch, keyboard must survive it.** AC-12's "no function requires a
   pointing device" is not satisfied by a touch path that replaces the keyboard path; adding touch is
   additive to `src/input/`, and the two-key surface in `keyboard.js` must remain complete on its own.
   AC-15 would additionally require the new affordance to be named on screen where it applies.
5. **If a later unit wants an installable or packaged client, nothing exists to build on, and one
   obvious route conflicts with Unit 1's own criteria.** There is no manifest, no icon asset of any
   size (the favicon is `data:,`), no offline caching strategy, no store identity, no signing
   material, no update channel. A PWA route specifically means a service worker, which is a
   persistent cache — and AC-22/AC-23 forbid persistence of any kind and require a reload to be
   indistinguishable from a first visit. That is a product-direction question, not an engineering
   choice a workstream can make.
6. **`window.dinoDash` is an in-page observation accessor, not a client API.** It is frozen,
   non-configurable, read-only and performs no I/O (`src/main.js:93-109`). A later unit that adds a
   setter or an I/O path to it converts an observation surface into an attack surface, as WS-04
   **L-04** already records.

Until such a unit is contracted, the correct client architecture for Dino Dash is the one it has:
a page.

---

## 7. Known risks and limitations

- **L-01 — one platform behaviour in 3.8 is reasoned, not measured.** That Chromium suspends or
  heavily throttles `requestAnimationFrame` for a hidden tab while `performance.now()` keeps
  advancing is documented platform behaviour, and it is the premise of the frame schedule in 3.8. It
  was **not** observed in a browser here. What *was* measured is the delivered code's response to
  that schedule, which is exactly the part that belongs to this review. Browser-side confirmation of
  the premise is WS-10's, and is not claimed here.
- **L-02 — 3.8 is a harness, not the game.** It drives `advanceRun`/`markRunStart` directly with an
  injected deterministic `random`. It does not run `main.js`, the state machine, the renderer or the
  HUD. That is sufficient for the claim made — score and elapsed time are computed entirely inside
  those two functions — but it is not a substitute for a browser-tier observation of the HUD after a
  real tab switch.
- **L-03 — word-boundary matching matters in these scans and silently changes the answer.** A plain
  substring scan reports `expo` 45 times in `src/` (inside `export`) and `freeze` 41 times as though
  a Page Lifecycle handler existed (all `Object.freeze`). Both were disambiguated in 3.4 and 3.7.
  Recorded so the discrepancy is not rediscovered as a finding by the next reader running a naive
  grep.
- **L-04 — the scan covers the repository, and `node_modules` does not exist yet.** WS-12 has not
  recorded a run, so there is no root `package.json` and no installed dependency tree at this
  revision. The determination that no packaging tooling is present is therefore true of the
  repository as it stands; if ENG-12 later adds dev dependencies, the SBOM view of that is WS-09's,
  not this document's.
- **L-05 — the background-time scoring property is recorded, not accepted.** ENG-05 has no authority
  to accept a product risk and does not do so. `DEC-20260809-001` covers deliberate client-side score
  forgery for Units 1 and 2; it does not address time-derived accrual while hidden, and this document
  must not be cited as having extended it. Nor is this recorded as an AC failure — section 3.8 shows
  it satisfies AC-08, AC-20 and AC-21 as written.
- **L-06 — `not_applicable` is scoped to Unit 1 at this revision.** It is not a standing judgement
  that Dino Dash will never have a client. Units 2 through 5 are not contracted and nothing here
  pre-clears them.

---

## 8. What ENG-05 did not do

- **No client of any kind, and no scaffolding for one.** No Electron, no Capacitor, no Tauri, no
  Cordova, no React Native, no PWA manifest, no service worker, no icon set, no installer config, no
  store metadata. No `app/`, `apps/`, `packages/`, `services/`, `database/`, `migrations/` or
  `infrastructure/` directory was created — all are contract-allowed but explicitly "not to be
  created" per WS-01 §0.
- **No lifecycle handler was added.** Not `visibilitychange`, not `pagehide`, not `beforeunload`, not
  `freeze`/`resume`. Adding one would change delivered behaviour, and two of them would break
  documented decisions (ADR-003 §3 on unload handlers; AC-20's tolerance on hidden-time subtraction).
  Section 6 raises the question; it does not answer it.
- **No touch or pointer input path.** AC-12 and AC-02 forbid depending on one, and adding an optional
  one is uncontracted scope.
- **No change to any file under `src/` or `tests/`.** WS-05 is a review. Every scan was read-only; the
  two Node invocations imported delivered modules and executed existing test files, and wrote no
  artifact.
- **No verification disposition for the delivery.** WS-05 records `not_applicable` for its own run
  only. Only ENG-15 at WS-14 issues the delivery's disposition.
- **No product decision, and no reopening of a non-goal.** Scope, priority, risk acceptance and final
  user-visible acceptance belong to the human product owner.
- **No write outside the boundary.** This workstream created exactly one file,
  `docs/engineering/WS-05-client-review.md`. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in the product workspace
  `D:/os-test/dino-dash`, was created or modified.
