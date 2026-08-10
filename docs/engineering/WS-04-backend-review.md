# WS-04 — Backend, API and Integration: recorded not-applicable determination

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` (digest `6586f10d8f0738c352008388ffb207da437c577a2579456a63807316bd43a926`) |
| Workstream | WS-04, owner role ENG-04, producer actor `actor-eng-04` |
| Plan dependency | WS-02 (complete) |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `bf5ac182c1279d380cbc7e4dbaa7a923875416fd` |
| Disposition | `not_applicable` — **verified by scan, not asserted** |
| Gate | `GATE-API-COMPATIBILITY` (ENG-04, `required: false`) — no contract, no diff, no consumer |
| Authored | 2026-08-10 |

This record exists because `not_applicable` is a disposition, not an omission: WS-09 (D-09) and WS-10
declare dependencies on it, and an absent record blocks two required-gate workstreams on nothing
(WS-01 **R-03**). It contains no server, no API surface, no integration and no scaffolding for one.

---

## 1. The determination

**Unit 1 as contracted has no backend, no API and no integration surface. WS-04 has no
implementation work, and ENG-04 built none.**

The absence is contracted, not incidental. `DEVREQ-EVT-20260809-001` states in its canonical
non-goals text that for Unit 1 "persistence of any kind, any network call, any identity, any
leaderboard or score table, and any character beyond the single default" are **non-goals — removed
from scope, not deferred**, and that reopening any of them is a product direction requiring the human
`product_direction_or_priority` gate. Three acceptance criteria then make the absence a testable
property of the delivery rather than a stylistic preference:

| AC | What it forbids | Effect on ENG-04's domain |
| --- | --- | --- |
| AC-24 | Any network request after the initial asset load; the game must remain fully playable offline | Removes every request path an API or integration could use |
| AC-22 / AC-23 | Any persistent store; reload must be indistinguishable from a first visit | Removes any client cache or offline queue a backend would sync against |
| AC-25 | Any identity surface, in the interface or in the trace | Removes authentication, authorization, tenancy and rate-limit subjects |

Read against `engineering/standards/backend-api.md`, every required consideration is vacuous at this
revision: there is no API or event contract to make explicit, no authentication or authorization
subject, no rate limit or idempotency key because no request exists, no timeout/retry/circuit-breaker
because nothing is called, and no transaction because nothing is written. The standard's closing
clause — "applicable work must record commands, environment, revision, evidence, limitations, and
remaining risk" — is what section 3 discharges for the *inapplicability* itself.

ADR-002 §3 and ADR-005 §1/§6 fix this by construction: Unit 1 has **zero runtime dependencies**, no
build step, and exactly two things that outlive a run — the in-memory score-trace array and immutable
configuration. ADR-003 §3 states the discard-on-unload property is "by construction, not by cleanup:
there is no persistence path to clear". Sections 3.2–3.8 below check that the delivered `src/` tree
actually matches those statements.

WS-01 §1 pre-classified WS-04 as `not_applicable` at sequence position 4. This document does not rely
on that classification; it re-derives it from the request and then verifies it against the code.

---

## 2. Scope of the check

Everything below is a **static, source-level** check of the delivered tree at
`bf5ac182c1279d380cbc7e4dbaa7a923875416fd`. It establishes that no network, storage or identity call
site exists to execute. It is deliberately **not** a runtime observation: the browser-tier network
panel and storage assertions AC-22/AC-23/AC-24 name in their verification text are WS-10's to produce
under `GATE-AUTOMATED-TESTS`, and are recorded as an outstanding dependency in section 6, not claimed
here. Section 3.8 runs the one existing automated check that covers this ground.

Environment: Windows 11, Git Bash (GNU grep 3.x), Node `v22.23.2`. All commands were run from the
repository root `D:/os-test/dino-dash-app` on branch `codex/evt-20260809-001`.

---

## 3. Commands run and their actual output

### 3.1 The revision under review

```
$ git rev-parse HEAD
bf5ac182c1279d380cbc7e4dbaa7a923875416fd

$ git log --oneline -3
bf5ac18 Add project README and gameplay media
ea12453 WS-03 Frontend and Accessibility for DEVREQ-EVT-20260809-001: playable Unit 1 game under src, DOM-free core, score trace, palette and unit tier
1703782 WS-02 Solution Architecture for DEVREQ-EVT-20260809-001: ADRs, system impact, AC traceability

$ node --version
v22.23.2
```

### 3.2 Every occurrence of a network or storage API in `src/`, with file and line

```
$ grep -rnoE "fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|IndexedDB|document\.cookie" src/ | sort | uniq -c
      1 src/main.js:6:WebSocket
      1 src/main.js:6:XMLHttpRequest
      1 src/main.js:6:fetch
      1 src/main.js:6:localStorage
      1 src/main.js:6:sendBeacon
      1 src/main.js:6:sessionStorage
      1 src/main.js:7:document.cookie
      1 src/main.js:7:indexedDB
      1 src/trace/score-trace.js:10:IndexedDB
      1 src/trace/score-trace.js:10:fetch
      1 src/trace/score-trace.js:10:localStorage
      1 src/trace/score-trace.js:10:sendBeacon
      1 src/trace/score-trace.js:10:sessionStorage
      1 src/trace/score-trace.js:11:WebSocket
      1 src/trace/score-trace.js:11:XMLHttpRequest
```

**Fifteen textual hits, across two files, on four lines — every one of them inside a block comment.**
`src/main.js` lines 5–7 and `src/trace/score-trace.js` lines 9–12 are the module headers, and both
name these APIs in order to state that the delivery does not use them:

```
src/main.js:5-7
 * Unit 1 has no persistence path, no network path and no identity surface. There is no
 * `fetch`, `sendBeacon`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`,
 * `indexedDB` or `document.cookie` anywhere in this delivery (AC-22, AC-23, AC-24, AC-25),

src/trace/score-trace.js:9-12
 * Page memory only. There is no persistence path in this delivery to clear — no
 * localStorage, no sessionStorage, no IndexedDB, no cookie, no fetch, no sendBeacon,
 * no XMLHttpRequest, no WebSocket. The array dies with the page's JavaScript realm,
 * so there is deliberately NO unload handler here (ADR-003 §3).
```

A raw grep therefore cannot distinguish documentation of an absence from a use. Section 3.3 strips
comments and counts again.

### 3.3 Raw versus comment-stripped counts, per token, over all 18 files under `src/`

The comment stripper is the same one `tests/unit/source-hygiene.test.mjs` uses (block comments, HTML
comments, line comments), so the two agree by construction.

```
$ node -e "
const fs=require('fs'),path=require('path');
function walk(d){return fs.readdirSync(d).flatMap(e=>{const p=path.join(d,e);return fs.statSync(p).isDirectory()?walk(p):[p];});}
function strip(s){return s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/(^|[^:])\/\/.*$/gm,'\$1');}
const tokens=['fetch','XMLHttpRequest','WebSocket','EventSource','sendBeacon','import(','localStorage','sessionStorage','indexedDB','IndexedDB','document.cookie','http://','https://','importScripts','navigator.'];
const files=walk('src');
console.log('files scanned: '+files.length);
for(const t of tokens){let raw=0,code=0;for(const f of files){const s=fs.readFileSync(f,'utf8');raw+=s.split(t).length-1;code+=strip(s).split(t).length-1;}console.log(t.padEnd(16)+' raw='+raw+'  after-comment-strip='+code);}
"
files scanned: 18
fetch            raw=2  after-comment-strip=0
XMLHttpRequest   raw=2  after-comment-strip=0
WebSocket        raw=2  after-comment-strip=0
EventSource      raw=0  after-comment-strip=0
sendBeacon       raw=2  after-comment-strip=0
import(          raw=0  after-comment-strip=0
localStorage     raw=2  after-comment-strip=0
sessionStorage   raw=2  after-comment-strip=0
indexedDB        raw=1  after-comment-strip=0
IndexedDB        raw=1  after-comment-strip=0
document.cookie  raw=1  after-comment-strip=0
http://          raw=0  after-comment-strip=0
https://         raw=0  after-comment-strip=0
importScripts    raw=0  after-comment-strip=0
navigator.       raw=0  after-comment-strip=0
```

**Executable occurrences: zero, for every token, across all 18 files.** `EventSource`, `import(`,
`importScripts`, `navigator.`, `http://` and `https://` do not appear even in comments — there is no
dynamic import at all, remote or relative, and no absolute URL anywhere in the delivered source.

A second scan for adjacent egress and background-execution surfaces, none of which the brief named
but any of which would contradict the determination:

```
$ for t in "serviceWorker" "manifest" "Worker(" "postMessage" "BroadcastChannel" "beforeunload" "unload" "Notification" "geolocation" "credentials"; do printf '%-18s %s\n' "$t" "$(grep -rFo -- "$t" src/ | wc -l)"; done
serviceWorker      0
manifest           0
Worker(            0
postMessage        0
BroadcastChannel   0
beforeunload       0
unload             1
Notification       0
geolocation        0
credentials        0
```

The single `unload` hit is `src/trace/score-trace.js:12`, the comment quoted above recording that no
unload handler exists — which is ADR-003 §3's explicit instruction, since clearing an array that has
no persistence path clears nothing and would interfere with the back/forward cache.

### 3.4 `src/index.html` references only same-origin relative assets

```
$ grep -rnoE '(src|href|action|formaction|data|poster|srcset)="[^"]*"' src/index.html
7:href="data:,"
8:href="styles/game.css"
60:src="main.js"

$ grep -rnoE '@import|url\(' src/styles/game.css
(no output)

$ grep -rnoE 'crossorigin|integrity|<iframe|<script' src/index.html
60:<script
```

Three URL-bearing attributes in the entire entry point, and that is the complete set:

1. `href="data:,"` — an inline empty-data favicon. A `data:` URI is not a fetch; it exists precisely
   so the browser does not request `/favicon.ico`.
2. `href="styles/game.css"` — relative, same-origin, delivered in this repository.
3. `src="main.js"` — relative, same-origin, `<script type="module">`, delivered in this repository.

There is no `<iframe>`, no second `<script>`, no `crossorigin` or `integrity` attribute (nothing
cross-origin exists to annotate), no `<link rel="preconnect">`, no web-font reference, and the
stylesheet contains no `@import` and no `url()` at all — so not even a background image is fetched.
`src/main.js` is the only script the page loads.

### 3.5 Every module specifier resolves relatively, inside the delivery

```
$ grep -rnoE "\bimport [^;]*from '[^']*'" src/ | grep -vE "from '\.{1,2}/"
(no output — no bare or absolute specifier exists)

$ grep -rhoE "from '[^']*'" src/ | sort | uniq -c
      1 from '../game/run-state.js'
      1 from '../game/score.js'
      2 from '../render/palette.js'
      1 from './collision.js'
      1 from './engine/clock.js'
      1 from './engine/loop.js'
      1 from './game/physics.js'
      1 from './game/run-state.js'
      1 from './game/score.js'
      1 from './game/simulation.js'
      1 from './game/state-machine.js'
      1 from './input/keyboard.js'
      1 from './obstacles.js'
      1 from './physics.js'
      1 from './render/canvas-renderer.js'
      1 from './render/hud.js'
      1 from './render/palette.js'
      3 from './run-state.js'
      1 from './score.js'
      1 from './trace/score-trace.js'
```

Twenty static import specifiers, all `./` or `../`, all naming files in the same tree. Combined with
`import( raw=0` in section 3.3, the module graph is closed: the browser resolves it entirely from the
serving origin at load time, and nothing can be pulled in afterwards. This is what makes AC-24's "no
request after the initial asset load" a structural property rather than a behavioural claim.

### 3.6 The complete event surface is two listeners, neither of them an egress path

```
$ grep -rn "addEventListener" src/
src/input/keyboard.js:49:  target.addEventListener('keydown', handleKeyDown, { passive: false });
src/main.js:112:window.addEventListener('resize', renderer.resize);
```

Nothing observes `online`/`offline`, `visibilitychange`, `pagehide`, `message` or `storage`. There is
no code path that could react to connectivity, which is the other half of AC-24: the game does not
merely avoid requesting, it has no notion of a network to lose.

### 3.7 No identity subject exists for an API to authenticate

```
$ for t in "<input" "<form" "<select" "<textarea" "nickname" "sign in" "sign-in" "login" "profile" "account" "userId" "playerId" "deviceId" "sessionId" "navigator" "userAgent"; do printf '%-14s %s\n' "$t" "$(grep -rFoi -- "$t" src/ | wc -l)"; done
<input         0
<form          0
<select        0
<textarea      0
nickname       0
sign in        0
sign-in        1
login          0
profile        0
account        0
userId         0
playerId       0
deviceId       0
sessionId      0
navigator      0
userAgent      0
```

The one `sign-in` hit is `src/index.html:12`, inside the markup comment "No sign-in, no server
dependency, no third-party asset." There is no form control of any kind in the entry point — zero
`<input>`, `<form>`, `<select>` and `<textarea>` — so AC-25's "enumerate every input field" terminates
at zero by inspection of the markup, and `navigator` is never read, so no device signal is available
to record even accidentally.

The trace record is a closed three-field set, frozen in source and matching ADR-003 §1 exactly:

```
$ grep -rn "RECORD_FIELDS\|Object.freeze" src/trace/score-trace.js
src/trace/score-trace.js:18:export const RECORD_FIELDS = Object.freeze(['endedAt', 'score', 'sessionLengthMs']);
src/trace/score-trace.js:65:  return Object.freeze({ appendRunEnd, list, size });
```

`src/main.js:94-108` installs the read-only accessor via `Object.defineProperty(window, 'dinoDash', …)`
with `writable: false, configurable: false` around a frozen object exposing `version`,
`getScoreTrace()`, `getState()` and `getBackgroundVariations()`. It is an **in-page observation
surface, not an integration surface**: it has no setter, performs no I/O, and has no remote
counterpart. ENG-04 records it as such so that a later reader does not mistake a global namespace for
an API boundary.

### 3.8 The existing automated source-hygiene tier agrees

```
$ node --test tests/unit/source-hygiene.test.mjs
ok 1 - the delivery ships the module layout ADR-002 §4 declares
ok 2 - AC-22/AC-23: no persistence API appears anywhere in src/
ok 3 - AC-24: no network API appears anywhere in src/
ok 4 - AC-12: no pointer, mouse or touch handler exists
ok 5 - AC-25: no identity surface exists in the markup
ok 6 - ADR-004: no colour literal exists outside src/render/palette.js
ok 7 - AC-16: nothing behind text is partially transparent
ok 8 - AC-14: the play area is focusable and the canvas is not
ok 9 - AC-15: every key with an effect is named in on-screen text
ok 10 - ADR-002 §4: the DOM-free core references no DOM type
# tests 10
# pass 10
# fail 0
```

Ten of ten pass. Tests 2, 3 and 5 are the ones in ENG-04's domain. This ran with **no `npm ci` and no
`node_modules`** — there is no root `package.json` at this revision (ENG-12/WS-12 has not yet
recorded a run), so the unit tier was invoked directly against Node's built-in runner. That
independence is itself evidence for the determination: the checks that prove the absence of a
backend need no installed dependency to run.

---

## 4. Finding per acceptance criterion in ENG-04's domain

ENG-04 **owns none of these criteria** — WS-01 §3 assigns AC-22 to AC-25 to WS-03, with WS-09 and
WS-10 contributing. What follows is a domain review finding, not a disposition. Only ENG-15 at WS-14
issues a verification disposition for this delivery.

| AC | Static finding at `bf5ac18` | Evidence | Still needed |
| --- | --- | --- | --- |
| AC-24 no network after initial load | **Consistent.** Zero executable occurrences of `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`; zero dynamic imports; zero absolute URLs; the closed relative module graph is resolved at load and cannot grow | 3.2, 3.3, 3.4, 3.5 | Browser-tier request count during an offline journey (WS-10) |
| AC-22 no storage, trace in page memory | **Consistent.** Zero executable occurrences of `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`; no service worker or cache API; trace is module state in `src/trace/score-trace.js` | 3.2, 3.3, 3.7 | Runtime confirmation of three records after three runs, zero after reload (WS-10) |
| AC-23 persists nothing | **Consistent.** Same scan; additionally no `beforeunload`/`unload` handler, per ADR-003 §3, because there is nothing to clear | 3.2, 3.3 | Fresh-profile comparison screenshot (WS-03/WS-10) |
| AC-25 no identity surface | **Consistent.** Zero form controls in the entry point; `navigator` never read; trace record frozen to `endedAt`, `score`, `sessionLengthMs` | 3.7 | Runtime enumeration of a live trace record (WS-10) |
| AC-01 no loading dependency on any server | **Consistent for the loaded asset set.** The page requests exactly two same-origin relative files plus a `data:` favicon | 3.4 | Console-clean load in two browser families (WS-03/WS-10, WS-01 **B-06**) |

**One boundary that must be stated separately, or a verifier will read the evidence as
self-contradictory** — this is WS-01 **B-01** and ADR-005 §4, restated here because it lands squarely
in ENG-04's domain: the *toolchain* install step (`npm ci`, registry plus a Playwright browser
download) requires the network. **AC-24 governs the running game, not the toolchain.** At the revision
reviewed, the game's runtime dependency count is zero and the game makes no request; the fact that a
future test tier will need an install is not an AC-24 finding.

---

## 5. Gate position

`GATE-API-COMPATIBILITY` (`engineering/quality/gates.json`, owner ENG-04) is `required: false` and
lists evidence "contract diff" and "consumer compatibility evidence". Neither exists nor can exist:
there is no API contract at the base revision, none at the delivery revision, therefore no diff, and
no consumer of any kind. The gate is recorded as not applicable on the same basis as the workstream.
`not_applicable` is used here because the contract's own non-goals remove the work — never to route
around a gate. No required gate is affected: WS-01 §1 verifies that every `required: true` gate lands
on a workstream with real work.

---

## 6. What this changes for later units

Stated as **requirements to be answered by a future unit's own planning cycle, not as a design.**
ENG-04 designs nothing here: no schema, no endpoint, no transport, no auth model. Doing so would
scaffold a service for uncontracted work, which WS-01 §0 and **B-03** prohibit and which the
request's non-goals text puts behind the human `product_direction_or_priority` gate.

**The single seam.** ADR-002 §5 and ADR-003's preamble both name it: the score-trace array is the
Unit 3 seam and **no other module is on that path**. Unit 1's entire contribution to any future
backend is the record shape in ADR-003 §1 — `score` (integer points), `endedAt` (ISO-8601 UTC with
literal `Z`), `sessionLengthMs` (integer milliseconds from a monotonic source) — under the evolution
rule in ADR-003 §6: the three names are frozen, types and units are frozen, later units may only add
fields, and no added field may be an identifier before the privacy obligation is cleared.

**What Unit 3 (shared score table) will need from ENG-04, as open questions:**

1. **A submission contract**, in whatever transport Unit 3's architecture chooses. Its request body
   is constrained only in that it must carry the three frozen fields with their frozen meanings.
2. **A server-side validation position.** `DEC-20260809-001` accepted client-side score authority
   **bounded to Units 1 and 2** and requires server-side validation from Unit 3, to be decided at
   Unit 3. ADR-003 §5 records what Unit 1 hands over: a stable, typed field shape to validate
   against — explicitly *not* a trustworthy value. Every field is forgeable from a browser console,
   and Unit 1 deliberately ships no checksum, signature, replay log or obfuscation. A Unit 3 design
   that assumes the client value is attested would be building on a property that was never claimed.
3. **An identity decision that does not exist yet.** A shared table needs to attribute a score to
   someone. Unit 1 has no identity of any kind (AC-25), and the request records that **no consent,
   retention, deletion or anonymization approach exists in this workspace** for Units 3 and 4. That
   is a privacy obligation to be discharged before an identifier is designed, not an API detail.
4. **`endedAt` carries no local offset.** ADR-003 §1 states this explicitly: a Unit 3 consumer that
   needs the player's local time cannot recover it from this field and must not infer it. Any
   local-time presentation in a shared table needs a separate, deliberate source.
5. **A live interpretation risk to settle before it becomes an API problem.** ADR-003's migration
   note carries it: AC-19 says "ISO-8601 string with an explicit UTC offset", and the ADR reads `Z`
   as satisfying it. A verifier requiring numeric `±HH:MM` would find `Z` insufficient. In Unit 1
   that is one formatting function; once a Unit 3 server persists the field it is a data migration.
6. **Everything the non-goals text removed stays removed** until the product owner reopens it through
   the human gate: real-time synchronous play, server-authoritative live session state, matchmaking,
   lobbies, invitations, presence, tick rate, netcode interpolation/prediction/rollback, mid-run
   reconnection, and any latency or update-cadence budget. Live competition means compare-after-the-
   fact, per `APR-870DC901FD68`. ENG-04 has not pre-cleared any of them and this document must not be
   cited as having done so.

Until such a unit is contracted, the correct backend architecture for Dino Dash is the one it has:
none.

---

## 7. Known risks and limitations

- **L-01 — This is a static check, not a runtime observation.** Zero call sites in source is strong
  evidence that zero requests occur, but AC-22, AC-23 and AC-24 are written against the browser's
  network panel and storage inspector. WS-10 owns that evidence. ENG-04 does not claim it and does
  not pre-empt it.
- **L-02 — The scan covers `src/` only.** That is the delivered artifact and the whole of what the
  browser loads (ADR-005 §1: no build step, the source is the running artifact). `tests/` and any
  dev-time tooling are outside this determination and are ENG-12's and ENG-10's; the static server
  in `tests/tools/static-server.mjs` is a test-time process, not part of the game.
- **L-03 — Comment text names the very APIs it disclaims.** Fifteen raw hits reduce to zero
  executable occurrences (3.2, 3.3). A reviewer running a naive grep will see hits and must apply the
  comment strip, or the source-hygiene tier, before concluding anything. Recorded so the discrepancy
  is not rediscovered as a finding.
- **L-04 — `window.dinoDash` widens the page's global surface deliberately.** ADR-003 §4 accepts this
  in exchange for AC-19–AC-22 being checkable by someone other than the author. It is read-only,
  side-effect free, and not keyboard-reachable, so it is not an integration point — but it *is* the
  one globally reachable name the delivery adds, and a future unit that adds a setter to it would
  convert an observation surface into an attack surface.
- **L-05 — Client-side score forgeability is accepted, bounded, and must not be re-accepted here.**
  `DEC-20260809-001` is the owner's decision covering Units 1 and 2. ENG-04 records it as inherited
  context. Re-accepting a risk the owner already accepted would create a second, weaker record of the
  same decision.
- **L-06 — `not_applicable` is scoped to Unit 1 at this revision.** It is not a standing judgement
  about the product. Units 2 through 5 are not contracted and nothing in this document pre-clears
  them.

---

## 8. What ENG-04 did not do

- **No backend, no API, no integration, and no scaffolding for one.** No `services/`, `app/`, `apps/`,
  `packages/`, `database/`, `migrations/` or `infrastructure/` directory was created — all are
  contract-allowed but explicitly "not to be created" per WS-01 §0, and creating one would inflate the
  AC-28 inventory with a system that does not exist.
- **No endpoint, schema, transport, auth model or rate-limit design "for later units."** Section 6
  states requirements as open questions and cites the existing decisions; it designs nothing.
- **No change to any file under `src/` or `tests/`.** WS-04 is a review. The scan was read-only; the
  test invocation in 3.8 executed an existing test file and wrote no output artifact.
- **No verification disposition for the delivery.** WS-04 records `not_applicable` for its own run.
  Only ENG-15 at WS-14 issues the delivery's disposition, and it is not pre-empted or anticipated here.
- **No product decision, and no reopening of a non-goal.** Scope, priority and risk acceptance belong
  to the human product owner.
- **No write outside the boundary.** This workstream created exactly one file,
  `docs/engineering/WS-04-backend-review.md`. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in the product workspace
  `D:/os-test/dino-dash`, was created or modified.
