# WS-09 — Security, Privacy and Compliance

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-09, owner role ENG-09, producer actor `actor-eng-09`, domain `security_privacy_compliance` |
| Plan dependencies | WS-02, WS-03, WS-04, WS-05, WS-06, WS-07, WS-08, WS-11, WS-12 — **all nine `completed`** (§2.1) |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `d5b71ddf0cb1f0dd887662b9fc37b1107f84272f` |
| Gates owned | `GATE-SECURITY` (**required**), `GATE-SUPPLY-CHAIN` (**required**), `GATE-PRIVACY-COMPLIANCE` (`required: false`) |
| Dispositions | GATE-SECURITY **discharged with findings** · GATE-SUPPLY-CHAIN **discharged** · GATE-PRIVACY-COMPLIANCE **discharged for Unit 1 only, and it closes nothing for Units 3 and 4** (§8) |
| Authored | 2026-08-11 |

WS-09 is the only workstream holding **two of the seven `required: true` gates**. WS-01 §5 classifies
it "Real, thin": the attack surface is one static page, but a small surface stated with evidence is
the correct outcome, and an unevidenced claim of a small surface is not. Every count below was
produced by a command in this document at this revision. Nothing is inherited without attribution and
nothing is asserted without a number behind it.

**Three things this record deliberately does not do.** It does not re-accept the client-side score
forgeability risk — the owner accepted it and WS-02 **AR-02** states that no workstream may re-accept
it (§6). It does not design an anti-tamper measure. And it changes no file under `src/`, which is
sealed at WS-03 (§2.3), so the two findings that touch source are recorded for disposition, not
patched.

---

## 1. The determination

**Unit 1 is a static browser bundle of 18 files and 42,559 bytes with zero dependencies, zero network
use after load, zero persistence, zero identity and no server. Its real attack surface is three
things: the `window.dinoDash` global, the client-authoritative score trace, and whatever origin
someone chooses to host the bundle on. Everything else that a web security review normally examines
is absent, and the absence is measured, not asserted.**

Two required gates are discharged on that basis, with six findings recorded (§7), none of which is
exploitable at this revision and two of which are latent defects that become reachable in a later
unit. The privacy position is that Unit 1 collects, stores and transmits nothing about any person —
and that this closes **nothing** for Units 3 and 4, where the workspace's consent, retention and
deletion obligation remains entirely unmet (§6.3).

---

## 2. Scope, inputs and environment

### 2.1 Dependency check — the nine runs WS-09 waits on

`engineering/taskboard/workstreams.csv` line 10 gives WS-09 the dependency list
`WS-02|WS-03|WS-04|WS-05|WS-06|WS-07|WS-08|WS-11|WS-12`. WS-01 **D-09** records why this matters:
`not_applicable` runs still have to exist as records, or WS-09 is formally blocked on nothing.

```
$ for w in 02 03 04 05 06 07 08 11 12; do node -e "…print status, revision, completedAt…"; done
WS-02  status=completed  rev=1703782 completedAt=2026-08-10T15:49:55Z
WS-03  status=completed  rev=ea12453 completedAt=2026-08-10T18:03:51Z
WS-04  status=completed  rev=290f45c completedAt=2026-08-10T18:45:00Z
WS-05  status=completed  rev=963cf74 completedAt=2026-08-10T19:29:12Z
WS-06  status=completed  rev=ae8895e completedAt=2026-08-11T08:10:07Z
WS-07  status=completed  rev=b35af29 completedAt=2026-08-11T08:47:36Z
WS-08  status=completed  rev=cacfcb0 completedAt=2026-08-11T09:11:15Z
WS-11  status=completed  rev=e8a2959 completedAt=2026-08-11T09:34:41Z
WS-12  status=completed  rev=d5b71dd completedAt=2026-08-11T12:31:06.368Z
```

**Nine of nine `completed`.** WS-01 **R-03** is not triggered and WS-09 is not blocked.

WS-01 **D-08** additionally makes WS-09 depend on WS-12 for the pinned dependency set, because no
SBOM or audit is possible before dependencies are pinned. WS-12 pinned them at `c85a5ac` and this
review runs against `d5b71dd`, the head of that work.

### 2.2 What is cited rather than repeated

These scans were run by other roles and are **not** re-run here. Where §3 to §6 need them, they are
cited by section:

| Source | What it established | Cited for |
| --- | --- | --- |
| WS-04 §3.2 | 15 network/storage tokens, 18 files: **8 raw network hits, 0 after comment stripping** | AC-24 network absence |
| WS-06 §3.2, §3.5 | 35 storage tokens, **0 after stripping**; one write site, one read site, one construction site for the trace | AC-22/AC-23 persistence absence |
| WS-07 §3.2–3.4 | 34 vendor + 25 telemetry-signal + 46 ML/AI tokens, **0 after stripping** | no analytics, no exfiltration path |
| WS-08 §3 | **17 HTTP requests** for a cold load, **0 cross-origin**, 0 after load; a static origin is required and `file://` will not work | the static-origin threat |
| WS-05 §3.8 | a run left in a hidden tab accrues **+600 points per 60 s** with 36 px of world motion and zero collision tests evaluated | abuse case T-07 |
| WS-11 | measured simulation cost, allocation and 17-request artifact weight | denial-of-service reasoning |
| WS-12 §1, §4, §5 | `npm test` runs from a clean checkout with **no install step and no `node_modules`** | supply-chain reproducibility |

§4 re-derives the dependency facts independently anyway, because GATE-SUPPLY-CHAIN's evidence is
ENG-09's to produce and not to borrow.

### 2.3 Environment, and the source seal

Windows 11 Pro 10.0.28000, Git Bash, Node `v22.23.2`, npm `10.9.8`, no `node_modules`. All commands
were run from `D:/os-test/dino-dash-app` on branch `codex/evt-20260809-001`.

```
$ git rev-parse HEAD
d5b71ddf0cb1f0dd887662b9fc37b1107f84272f

$ git diff --stat ea12453 HEAD -- src/
                                        (no output)

$ git rev-parse HEAD:src ; git rev-parse ea12453:src
0566d5d39599d0cdf374b5dee27d22afdb544c41
0566d5d39599d0cdf374b5dee27d22afdb544c41

$ git diff --check
                                        (clean; exit 0)
```

**The `src/` tree object is byte-identical to the one WS-03 sealed at `ea12453`.** Nothing since
WS-03 — including this workstream — has touched the game. `git diff --check` is the request's own
`validation.commands` entry and it passes.

### 2.4 The three commands this record adds

WS-09 adds three zero-dependency harnesses under `tests/security/`. They are **measurement harnesses,
not tests**: they assert nothing and have no pass/fail outcome, in the same spirit as `tests/perf/*`
(WS-11 §11). Inventing a pass threshold for "is this secure" would manufacture a judgement nobody
recorded, and a failing assertion added to the unit tier would break `GATE-AUTOMATED-TESTS` for
someone else. They match no glob in the `npm test` script (`tests/unit/*.test.mjs`), so the 61-test
unit tier is unaffected — re-run at this revision, `tests 61 / pass 61 / fail 0`.

```
node tests/security/surface-scan.mjs     -> stdout + tests/.results/security-surface.json
node tests/security/secret-scan.mjs      -> stdout + tests/.results/secret-scan.json
node tests/security/sbom.mjs             -> stdout + tests/.results/sbom.cdx.json (+ .sha256)
```

All three outputs land in `tests/.results/`, which `tests/.gitignore` keeps out of the commit while
the directory itself stays present in a clean checkout (WS-12, AC-30). The artifacts are therefore
**reproducible from the command, not carried in the tree** — same convention as
`a11y-contrast.json`. No `package.json` script entry was added: `package.json` is outside WS-09's
write boundary, and a raw `node` invocation is equally reproducible.

---

## 3. Threat model for what Unit 1 actually is

`engineering/security/threat-model.md` is an empty template of five headings. This section fills them
for this delivery. It is a threat model of **this** artifact, not of a game in general.

### 3.1 Scope and trust boundaries

There is exactly **one** trust boundary in Unit 1, and it is the browser origin that serves the
bundle.

```
   [ author / repository ]        [ static origin ]        [ the player's browser tab ]
            |                            |                            |
            |  git push, no build step   |   17 GETs, cold load       |
            +--------------------------->+--------------------------->+
                                         |                            |
                                    (WS-08 §3)                  everything else
                                                                      |
                                            +-------------------------+------------------------+
                                            |  one JS realm: 15 ES modules, one canvas, one    |
                                            |  DOM subtree, one frozen `window.dinoDash`,      |
                                            |  one in-memory array. No second principal.       |
                                            +--------------------------------------------------+
```

Everything inside the tab is **one principal**. There is no server, no second user, no session, no
privilege level, no authentication, no authorization and no cross-origin communication. This is the
single most important structural fact in the model: with one principal there is no confused deputy,
no privilege escalation and no spoofing of one party to another, because there is no second party.

What is explicitly **out of scope**, and why:

- **The hosting origin's configuration.** WS-08 recorded that Unit 1 has no deployed environment at
  all — no IaC, no Dockerfile, no DNS, no TLS config. Transport security, response headers and origin
  isolation are properties of a deployment that does not exist yet (F-03).
- **The browser and the operating system.** Unit 1 runs whatever the player's browser gives it.
- **Units 2 to 5.** Not contracted. Nothing here pre-clears them, and §6.3 states plainly what stays
  open.

### 3.2 Assets and data classification

| Asset | Where it lives | Classification | Confidentiality | Integrity | Availability |
| --- | --- | --- | --- | --- | --- |
| Session score (`runState.score`) | page memory, one number | **non-personal, non-sensitive, ephemeral** | none — it is on screen | **none — client-authoritative, see §3.5** | tab lifetime |
| Score trace array | module closure in `src/trace/score-trace.js` | **non-personal, non-sensitive, ephemeral** | none — readable by design via the accessor | none | tab lifetime |
| The 18 bundle files | static origin | public | none | origin's responsibility | origin's responsibility |
| Player identity | **does not exist** | — | — | — | — |
| Credentials / secrets | **do not exist** (§5) | — | — | — | — |
| Personal data | **does not exist** (§6) | — | — | — | — |

**There is no asset in Unit 1 whose confidentiality is worth anything to an attacker, because there
is no asset an attacker does not already own.** Every byte the game holds was produced on the
player's own machine, is displayed on the player's own screen, and dies when the player closes the
tab. This is not a claim of good design; it is a consequence of the contracted non-goals.

### 3.3 Identities, privileges and abuse cases

`DEVREQ-EVT-20260809-001` names identity a Unit 1 non-goal — "removed from scope, not deferred" — and
AC-25 makes it testable. The measured result:

```
$ node tests/security/surface-scan.mjs        # identity/device/PII scan, 44 tokens, 18 files
navigator.       raw= 0  after-comment-strip= 0
userAgent        raw= 0  after-comment-strip= 0
geolocation      raw= 0  after-comment-strip= 0
crypto.randomUUID raw= 0 after-comment-strip= 0
toDataURL        raw= 0  after-comment-strip= 0        <- no canvas fingerprinting
AudioContext     raw= 0  after-comment-strip= 0
Intl.            raw= 0  after-comment-strip= 0        <- no locale or timezone read
nickname/username/playerId/deviceId/sessionId/uuid/fingerprint/email
                 raw= 0  after-comment-strip= 0 (each)
sign in / signin / login / account / profile
                 raw= 0  after-comment-strip= 0 (each)
devicePixelRatio raw= 1  after-comment-strip= 1   [render/canvas-renderer.jsx1]
TOTAL (44 tokens) raw= 1  after-comment-strip= 1
```

**One hit in 44 tokens, and it is not an identity read.** `src/render/canvas-renderer.js:129` is
`Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1))`, used on the next three lines to size the
canvas backing store. It is read, clamped to 1–3, used for a `setTransform`, and never stored, never
placed in the DOM as text, never added to the trace and never transmitted — there is nowhere for it
to go (§3.6, §4.3). It is the delivery's only device-characteristic read and is recorded as F-06 so
ENG-15 does not have to discover it.

The markup side agrees:

```
  form controls (<form|input|select|textarea|button))  : 0
  inline on* event handlers                            : 0
```

**Zero form controls of any kind.** There is no field for a player to type a name into, so the classic
"user-controlled string" of a web application does not exist in Unit 1 (§3.6 proves this end to end).

Abuse cases, given a single principal:

| Abuse case | Reachable in Unit 1? | Why |
| --- | --- | --- |
| Impersonate another player | **No** | No identity exists to impersonate (AC-25) |
| Read another player's data | **No** | No other player's data exists anywhere |
| Escalate privilege | **No** | One principal, no privilege levels |
| Forge your own score | **Yes, trivially — and accepted** | §3.5, `DEC-20260809-001` |
| Farm score without playing | **Yes** | WS-05 §3.8: 60 s in a hidden tab is +600 points at zero risk. Recorded, not re-accepted (§7 F-07) |
| Exfiltrate anything | **No** | No egress path exists (§3.7) |
| Persist a tracker | **No** | No storage path exists (WS-06 §3.2) |

### 3.4 Threats, STRIDE-shaped, with disposition

| # | Category | Threat | Disposition at `d5b71dd` | Evidence |
| --- | --- | --- | --- | --- |
| T-01 | Spoofing | An attacker impersonates a player or a server | **Not applicable.** No identity, no server, no session, no credential | §3.3 scan; WS-04 §1 |
| T-02 | Tampering (score) | The player forges score, `endedAt` or `sessionLengthMs` | **Present, trivially exploitable, and ACCEPTED by the product owner** | §3.5 |
| T-03 | Tampering (DOM/XSS) | Injected markup or script executes in the page | **No sink exists.** 51 injection tokens, 0 hits; the only text sink is `textContent` fed by a digits-only formatter | §3.6 |
| T-04 | Tampering (state) | The state variable is driven off its closed enumeration | **Latent defect, not reachable from any Unit 1 input.** 10 inherited property names are accepted as events | §3.6.3, F-01 |
| T-05 | Repudiation | A player denies producing a score record | **Not applicable and permanently so.** Nothing attests to anything; there is no audit log because there is nothing to audit and nobody to audit it for | §3.5 |
| T-06 | Information disclosure | Player data leaks to a third party | **No data and no channel.** Zero personal data (§6); zero egress (§3.7) | WS-04 §3.2; §4.3 |
| T-07 | Denial of service | A player degrades their own session | **Self-inflicted only, and bounded.** WS-11 measured simulation cost and allocation; the obstacle set is bounded; there is no shared resource to exhaust and no other player to affect | WS-11 |
| T-08 | Privilege escalation | — | **Not applicable.** One principal | §3.1 |
| T-09 | Supply-chain compromise (runtime) | A malicious dependency ships to players | **No dependency exists to compromise.** 0 declared, 0 in the lockfile, 0 bare specifiers, 0 remote references | §4 |
| T-10 | Supply-chain compromise (build) | A compromised CI action alters the artifact | **Real but narrow.** Three GitHub Actions, none pinned by commit SHA; the workflow has never executed and does not publish | §4.5, F-04 |
| T-11 | Unsafe AI behaviour | Model-driven behaviour misfires | **Not applicable.** WS-07 §3.4 scanned 46 ML/AI tokens: zero. There is no model, no inference, no prompt | WS-07 §3.4 |
| T-12 | Business-logic abuse | Scoring rules are gamed | **Present (T-02, and WS-05's hidden-tab accrual). Recorded, not re-accepted** | §3.5; F-07 |
| T-13 | Secret disclosure | A credential is committed | **None present at HEAD or anywhere in 15 commits** | §5 |
| T-14 | Origin-level attack | The bundle is served insecurely, or a shared origin injects into it | **Out of Unit 1's control and currently unmitigated by the artifact** — no CSP, no headers, no deployed origin | §3.7, F-03 |

Eleven of the fourteen are not applicable or have no reachable path. That is the honest shape of a
static, dependency-free, network-free, storage-free, identity-free page. The three that remain are
T-02 (accepted by the owner), T-10 and T-14 (both build/hosting, both recorded as findings).

### 3.5 The `window.dinoDash` global, and the score trace's forgeability

**The global.** ADR-003 §4 installs a frozen namespace at `src/main.js:93-109` via
`Object.defineProperty(window, 'dinoDash', {…, writable: false, configurable: false})` around an
`Object.freeze`d object with four members: `version`, `getScoreTrace()`, `getState()`,
`getBackgroundVariations()`.

WS-06 §3.6 already drove this and recorded the result: assign, delete, redefine and monkey-patch
**all four threw `TypeError`**; the descriptor is `{writable:false, configurable:false,
enumerable:true}`; `getScoreTrace()` returns a new array of new objects so mutating the result cannot
reach the store; and no own property of the frozen trace object is an array, so there is no path from
the accessor to `records`. That evidence is cited, not repeated.

**What ENG-09 adds is the security reading of it, which is the part that matters:**

The accessor is a **deliberate, documented widening of the page's surface that grants an attacker
nothing they did not already have.** Anyone who can call `window.dinoDash.getScoreTrace()` is already
executing JavaScript in the page's own realm. From that position they can already read every module
binding through the debugger, rewrite `runState.score`, call `scoreTrace.appendRunEnd` directly, or
replace `formatScore`. The accessor's freezing is therefore **not** an anti-tamper measure and ADR-003
§4 says so explicitly — it exists so that *observing* under AC-19 to AC-22 cannot corrupt what is
being observed. That is an evidence-integrity property, not a security property, and conflating the
two would be exactly the security theatre ADR-003 §5 refuses.

The global is also not keyboard-reachable, so it creates no fourth state and does not bear on AC-15
or AC-26.

**The forgeability, and its attribution.** Every field of every trace record is produced by the client
and every one is forgeable from a browser console: `score` is a number in page memory, `endedAt` moves
with the system clock, `sessionLengthMs` is a subtraction the page performs on itself. Nothing
attests to anything.

> **This risk is ALREADY ACCEPTED. It is recorded here with its attribution and is neither
> re-accepted, re-scoped, nor mitigated by WS-09.**
>
> - **Accepted by:** `human-product-owner`, in `APR-870DC901FD68`, restated in `DEC-20260809-001`.
> - **Bounded to:** Units 1 and 2.
> - **Condition attached:** server-side validation is **required from Unit 3**, and its design belongs
>   to Unit 3, to be decided at Unit 3.
> - **Binding instruction:** WS-02 records this as **AR-02** with the sentence "**No workstream may
>   re-accept it.**" WS-04 (L-05), WS-05 (L-05), WS-06 (L-07) and WS-11 each carried it forward
>   without re-accepting. WS-09 does the same. Risk acceptance is a human gate under
>   `config/operating-model.yaml`; ENG-09 has no authority to accept, re-accept, extend, narrow or
>   discharge it, and this document must not be cited as having done any of those.

ENG-09 therefore designs **no** anti-tamper measure into Unit 1 — no checksum, no signature, no replay
log, no input recording, no obfuscation, no server call. ADR-003 §5 rules all of them out as theatre
on a client that also holds the verifier, and any of them would enlarge Unit 1 beyond its contracted
scope, which is behind the human `product_direction_or_priority` gate.

**What Unit 3 actually inherits** is a stable field shape to validate against, not a trustworthy
value. WS-06 §5.2 already handed Unit 3 the two things a validator needs and one trap: `score ≈
floor(sessionLengthMs / 100)` holds for 99.406% of records and diverges by exactly one point for
0.594% of them, so a strict-equality validator would reject roughly one legitimate record in 168; and
`endedAt` is the only wall-clock field, so it is unsound as an ordering key. Those are WS-06's
measurements and are cited, not re-derived.

### 3.6 The DOM and XSS surface — verified, not assumed

The task is to answer one question with evidence: **is any user-controlled string ever inserted into
the DOM?** The answer is no, and it is established in three steps.

#### 3.6.1 There is no HTML-parsing or dynamic-code sink at all

```
$ node tests/security/surface-scan.mjs      # 51 injection tokens, 18 files
innerHTML / outerHTML / insertAdjacentHTML / document.write / document.writeln
createContextualFragment / DOMParser / parseFromString / srcdoc / javascript:
data:text/html / eval( / new Function / Function( / setTimeout / setInterval
setImmediate / import( / importScripts / execScript / dangerouslySetInnerHTML
v-html / createElement('script' / setAttribute / setAttributeNS / outerText
insertAdjacentElement / appendChild / insertBefore / replaceChildren
createTextNode / location.href / location.assign / location.replace
location.search / location.hash / window.open / postMessage / onmessage
document.domain / atob / unescape / decodeURIComponent / URLSearchParams
document.referrer / Object.assign(window / __proto__ / Object.setPrototypeOf
structuredClone / JSON.parse
                        ... every one of the 51: raw=0  after-comment-strip=0
TOTAL                    raw= 0  after-comment-strip= 0
```

**Zero hits across 51 tokens — zero even *raw*, before any comment stripping.** This is a stronger
result than the storage scan WS-06 ran, where nine raw hits all turned out to be comments documenting
an absence: here the tokens do not appear even in prose. No API that parses a string as HTML exists in
the delivery, and no API that compiles a string as code exists either. There is also no
`location.search`, no `location.hash`, no `URLSearchParams` and no `document.referrer`, so **the URL
is never read** — the one input channel a static page normally has is not connected to anything.

The shipped markup agrees:

```
  <script> tags                    : 1  ["<script type=\"module\" src=\"main.js\">"]
  <link> tags                      : 2  ["<link rel=\"icon\" href=\"data:,\" />",
                                         "<link rel=\"stylesheet\" href=\"styles/game.css\" />"]
  inline on* event handlers        : 0
  remote (//, http, https) src/href: 0
  form controls (AC-25)            : 0
  CSS url()/@import (non-data:)    : 0
```

One same-origin module script, one same-origin stylesheet, one `data:` favicon, zero inline handlers,
zero remote references, zero form controls.

#### 3.6.2 The five surviving DOM writes, and what each can carry

With no HTML sink, the whole DOM-mutation surface of the delivery is five assignments. Enumerated
exhaustively:

```
$ grep -rnE "textContent|dataset\.|setProperty|classList|setAttribute|appendChild|innerHTML" src/
src/main.js:39        root.dataset.gameState = to;
src/render/hud.js:30-37  style.setProperty('--dd-sky', variation.sky);  … 8 properties
src/render/hud.js:38     root.dataset.backgroundVariation = variation.id;
src/render/hud.js:49     elements.score.textContent = score;
src/render/hud.js:54     elements.finalScore.textContent = finalScore;
```

Each was driven with hostile input against the **delivered** modules:

| Sink | Value it receives | Measured result |
| --- | --- | --- |
| `hud.js:49,54` `textContent` | `formatScore(view.score)` | 21 hostile inputs — `<img src=x onerror=…>`, `"><script>…`, `javascript:`, `${…}`, `red; background:url(javascript:…)`, `Infinity`, `NaN`, `-1`, `null`, objects with hostile `toString`/`valueOf` — **20 returned `"0000"`**; one returned `"1e+308"` (F-02). Production sweep of 97,298 values over 0–3,600,000 ms: **0 outside `/^[0-9]+$/`**; the only characters ever produced are `0123456789`, length 4–5 |
| `hud.js:38` `dataset.backgroundVariation` | `variation.id` | Closed frozen enumeration `["dawn","noon","dusk"]`; `variationById('<img onerror=alert(1)>')` returns `"dawn"` — a `find`, no prototype path |
| `hud.js:30-37` `style.setProperty` | 8 palette values × 3 variations | **24 of 24 match `/^#[0-9A-Fa-f]{6}$/`**; none contains `;`, `)`, `url(` or `expression(`, so no CSS-injection escape from a custom property |
| `main.js:39` `dataset.gameState` | the state machine's `to` | `STATE_VALUES` is `["idle","running","run-end"]` — but see F-01 |

The decisive point is the first row. `formatScore` is
`String(Number.isFinite(score) && score > 0 ? Math.floor(score) : 0).padStart(4,'0')`. It coerces
everything that is not a finite positive number to `0`, so **no string a caller supplies survives it**
— a hostile string is not escaped, it is discarded and replaced by `"0000"`. And `textContent` does
not parse HTML in the first place. The two mechanisms are independent, and either alone would be
sufficient.

**Answer to the question posed: no user-controlled string is ever inserted into the DOM, because no
user-controlled string exists.** The only input surface is `keydown`, and `src/input/keyboard.js:28-29`
reads exactly two properties of the event — `event.code` and `event.key` — and only ever compares them
against two frozen arrays. Neither value is retained, forwarded or rendered; a matching press calls
`onActionPress()`, which takes no argument. There is no path from any byte a person can influence to
any byte the DOM receives.

#### 3.6.3 Finding F-01 — the transition table is read through the prototype chain

The one genuine source defect this review found.

`src/game/state-machine.js:45` is `TRANSITIONS[state] ? TRANSITIONS[state][event] : undefined`.
`TRANSITIONS.idle` is a frozen object literal, so its prototype is `Object.prototype`, and an `event`
naming an inherited property resolves to a truthy value:

```
$ node tests/security/surface-scan.mjs      # prototype-chain probe
  TRANSITIONS.idle own keys                : ["start"]
  prototype is Object.prototype            : true
  inherited names probed                   : 10
  accepted as events by transition()       : 10  ["constructor","__proto__","toString","valueOf",
                                                  "hasOwnProperty","isPrototypeOf",
                                                  "propertyIsEnumerable","toLocaleString",
                                                  "__defineGetter__","__lookupGetter__"]
  of those, driving state off STATE_VALUES : 10
  declared events wrongly rejected         : 0
  variationById() same probe               : ["dawn"]   (find-based, no prototype path)
```

`transition('constructor')` returns `true` and leaves the state variable holding the `Object`
*function*. The value would then reach `root.dataset.gameState`, which stringifies it to
`"function Object() { [native code] }"` — verified; it contains no `<`, `>` or `"`, and a `dataset`
assignment sets an attribute value rather than parsing markup, so **this is not an XSS vector**.

**It is not reachable at this revision.** `transition()` has exactly three call sites in `src/main.js`
(lines 48 and 55) and every one passes a literal: `'start'`, `'restart'` or `'collide'`. No external
string reaches it, so **AC-26 is not violated** — the state set reachable by keyboard input is still
exactly three.

Why it is recorded rather than ignored: the guard is `if (!next) return false`, which is a
truthiness test against a lookup that consults the prototype chain. It becomes reachable the moment
any later unit routes a string — a URL fragment, a stored resume state, a server message — into
`transition()`. The existing suite cannot catch it: `tests/unit/state-machine.test.mjs:50` builds its
alphabet as `[...EVENTS, 'jump', 'pause', 'menu', 'settings', 'leaderboard', 'unknown']`, six invented
names, none of which is an `Object.prototype` property, so "AC-26: no event sequence reaches a fourth
state" passes while ten such sequences exist.

**ENG-09 does not fix it.** `src/` is sealed at WS-03 (§2.3) and WS-09's write boundary is `docs/` and
`tests/`. It is recorded as F-01 for ENG-15's disposition and for whichever unit reopens the module.

### 3.7 The static origin

WS-08 §3 established the hosting shape and it is cited rather than re-measured: **17 HTTP requests for
a cold load** (1 document + 1 stylesheet + 15 ES modules), **zero cross-origin**, **zero after load**,
and Unit 1 **requires a static HTTP origin** — it cannot run from `file://`, because ES modules do not
load there.

The security consequences of that shape:

- **The bundle has no egress, so it cannot be made to leak.** WS-04 §3.2 measured 8 raw network-token
  hits and **0 after comment stripping**; §4.3 below independently confirms **0 remote references** in
  all 18 files and **0 bare import specifiers**. There is no `fetch`, no `sendBeacon`, no
  `XMLHttpRequest`, no `WebSocket`, no `EventSource`, no worker and no service worker. An attacker who
  achieved script execution in the page would find no channel already open and would have to bring
  their own — at which point they are running arbitrary script in a page whose entire content is a
  score they can already see.
- **All 17 requests are same-origin and static.** There is no third-party host to compromise, so no
  subresource integrity attribute is needed and none is present (`integrity=` count: 0). SRI protects
  cross-origin subresources; with zero of them, its absence is correct rather than missing.
- **No security header and no CSP are shipped.** `Content-Security-Policy <meta>` count: **0** (F-03).
  This is a deliberate boundary statement, not an oversight in the artifact: response headers belong
  to an origin, and WS-08 recorded that Unit 1 has **no deployed environment at all**. A
  `<meta http-equiv="Content-Security-Policy">` *could* have shipped in `src/index.html`, so the
  option existed — but `src/` is sealed and adding one now would change the delivered artifact, alter
  the 17-request evidence base, and risk the module script under a policy nobody has reviewed.
  Recorded for whoever first stands up a real origin.
- **A shared origin is the one real hosting risk.** If Unit 1 is deployed onto an origin that also
  serves other, less careful content, that content shares the page's realm and storage partition.
  Unit 1 stores nothing, so there is nothing to steal, but the reverse direction — other content
  injecting into the game — is a property of the origin, not of the bundle. Recorded so the choice is
  made knowingly.

---

## 4. Supply-chain review, with evidence

`GATE-SUPPLY-CHAIN` asks for two artifacts: a **dependency audit** and a **software bill of
materials**. Both are produced here. The dependency facts are re-derived independently rather than
taken from WS-12, because this gate's evidence is ENG-09's to produce.

### 4.1 Declared dependencies — counted, not read off

```
$ node tests/security/sbom.mjs
--- declared dependencies (package.json) ---
  dependencies             field present=true  entries=0
  devDependencies          field present=true  entries=0
  peerDependencies         field present=false entries=0
  optionalDependencies     field present=false entries=0
  bundledDependencies      field present=false entries=0
  bundleDependencies       field present=false entries=0
  overrides                field present=false entries=0
  resolutions              field present=false entries=0
  TOTAL declared entries   0
```

**Zero entries across all eight dependency-bearing fields.** `dependencies` and `devDependencies` are
present-and-empty, which is the stronger statement: an absent field could be an omission, an empty
object is a declaration. The four fields that most often smuggle a package into a "zero-dependency"
project — `optionalDependencies`, `bundledDependencies`, `overrides`, `resolutions` — are not present
at all.

### 4.2 The lockfile pins an empty set

```
--- lockfile (package-lock.json) ---
  lockfileVersion             : 3
  packages keys               : 1 [""]
  third-party entries         : 0
  keys containing node_modules: 0
```

**One key in `packages`, and it is the root project itself (`""`).** Zero third-party entries, zero
keys mentioning `node_modules`, and no legacy `dependencies` block. The root entry's own
`devDependencies` is `{}`. This is what "pins an empty set" means when counted rather than described,
and it is what WS-12 corrected the CI header for at `6d884f1` — the lockfile *is* committed, and what
it pins is nothing.

npm agrees, run against the real tree:

```
$ npm ls --all
dino-dash@1.0.0 D:\os-test\dino-dash-app
`-- (empty)
                                        exit 0

$ npm audit --json
{"auditReportVersion":2,"vulnerabilities":{},
 "metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0},
             "dependencies":{"prod":1,"dev":0,"optional":0,"peer":0,"peerOptional":0,"total":0}}}
                                        exit 0, "found 0 vulnerabilities"
```

**Stated honestly: `npm audit` finding zero vulnerabilities across zero dependencies is a trivially
true result and attests to nothing about the code, Node itself, or the browser.** It is recorded
because the gate names a dependency audit and this is what one returns here — not because it is
evidence of quality. `prod: 1` is the root project counting itself; `total: 0` is the dependency
count.

### 4.3 Nothing is fetched — at build time or at run time

```
--- resolved module specifiers ---
  src/   relative=20 node:builtin=0 bare-third-party=0 url=0
  tests/ relative=10 node:builtin=9 bare-third-party=0 url=0
  tests/ node builtins used  : node:assert/strict, node:child_process, node:crypto,
                               node:fs, node:http, node:os, node:path, node:test, node:url
--- shipped bundle ---
  files              : 18
  bytes              : 42559
  remote references  : 0
--- node_modules and installer artifacts ---
  node_modules  exists=false      .npmrc        exists=false
  yarn.lock     exists=false      pnpm-lock.yaml exists=false
  bun.lockb     exists=false      .pnp.cjs      exists=false
  vendor        exists=false      .yarnrc(.yml) exists=false
```

Three independent confirmations, each measuring something different:

1. **Zero bare import specifiers anywhere.** Every one of the 20 specifiers in `src/` is relative and
   resolves inside `src/`. The test tier's only non-relative specifiers are 9 `node:`-prefixed
   builtins — Node's own standard library, which is not a supply-chain component in any SBOM sense
   because it ships with the runtime, cannot be substituted by a registry, and has no version of its
   own separate from `process.version`.
2. **Zero remote references in the shipped bundle**, comments included: no `http://`, no `https://`,
   no `//cdn`, no `unpkg`, `jsdelivr`, `cdnjs`, `googleapis` or `gstatic`. Nothing is fetched at
   runtime. WS-08's 17 requests are 17 same-origin static files and that is the whole of it.
3. **No `node_modules` is needed and none exists.** Nor does any alternative installer's artifact.
   WS-12 §1 recorded the operational consequence — `git clone && npm test` with no install step — and
   §4.6 below confirms it still holds at this revision.

There is **no build step**: no bundler, no transpiler, no minifier, no post-install script. The bytes
committed are the bytes served. That removes the entire class of build-time supply-chain compromise
from the shipped artifact, which is the single largest security property this delivery has and it is
a consequence of ADR-005's toolchain choice rather than of anything WS-09 did.

### 4.4 The SBOM

```
$ node tests/security/sbom.mjs
--- SBOM ---
  top-level components       : 0
  nested first-party files   : 18
  wrote tests/.results/sbom.cdx.json (13949 bytes)
  sha256                     : 31e240dcdb2ccb001d6996e1e35229058af62608bc8d20b1d7071ca293d38917
```

`tests/.results/sbom.cdx.json` is **CycloneDX 1.5 JSON**, with a `.sha256` sidecar in the same
convention as `a11y-contrast.json.sha256`. Its shape encodes the finding rather than hiding it:

- **`components: []` — zero.** This is the measured result, not an empty stub. A zero-component SBOM
  is a complete SBOM when the component count is zero, and it is the only honest one here. An SBOM
  that listed the project's own files as its dependencies would inflate a supply-chain inventory with
  the thing being inventoried.
- **`metadata.component`** is the single application component, carrying the revision, branch, gate,
  request and plan identifiers and 20 measured properties (dependency counts, lockfile version and
  entry count, bare-specifier count, remote-reference count, bundle file count and byte total, the
  test tier's node builtins, the CI actions, the `engines.node` floor, the generating Node version).
- **`metadata.component.components`** holds the 18 shipped files as **nested subcomponents** with
  SHA-256 hashes and byte counts. They are parts of one component, not dependencies of it, so
  CycloneDX's nested-assembly position is where they belong. This doubles as an integrity baseline: a
  later reader can re-hash the tree and compare.
- **`dependencies: [{ref: "dino-dash@1.0.0", dependsOn: []}]`** — the root depends on nothing,
  stated explicitly rather than by omission.

The artifact is regenerated by its command and is **not committed** — `tests/.gitignore` keeps
`tests/.results/*` out of the tree while preserving the directory in a clean checkout (WS-12, AC-30).
Its `metadata.timestamp` and the `sourceRevision` property make each generation self-describing.

### 4.5 The build pipeline is the one real supply-chain surface, and it is unpinned

```
--- build pipeline (not part of the shipped artifact) ---
  GitHub Actions referenced : 3 ["actions/checkout@v4","actions/setup-node@v4",
                                 "actions/upload-artifact@v4"]
  pinned by commit SHA      : 0 of 3
```

**Three third-party components exist in this delivery, and all three are in CI, none in the shipped
bundle.** `@v4` is a **mutable tag**: the code that runs is whatever that tag points at on the day the
workflow runs, which is the standard supply-chain weakness of tag-pinned actions. Recorded as F-04.

Four facts bound how much this matters, and all four are stated so the finding is neither inflated nor
waived:

1. The workflow **has never executed** — `.github/workflows/ci.yml` says so in its own header, and no
   CI run exists at this revision.
2. It has `permissions: contents: read` and publishes nothing; it does not touch a registry, does not
   deploy, and does not sign.
3. It performs **no dependency install**, so there is no `npm ci` step for a compromised action to
   poison.
4. It cannot alter the shipped artifact, because there is no build step and the served bytes are the
   committed bytes (§4.3).

The exposure is therefore confined to the correctness of a CI result that does not yet exist. It is
still worth pinning by commit SHA before anyone relies on a green check, and `.github/` is outside
WS-09's write boundary, so it is recorded rather than changed.

### 4.6 Reproducibility, re-confirmed at this revision

```
$ npm test
ℹ tests 61   ℹ pass 61   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   ℹ todo 0
ℹ duration_ms 430.7914
```

Run with no `node_modules` present (§4.3) and no install step. WS-12 §4 and §5 recorded the clean-
checkout proof with exit codes; this is confirmation that it still holds at `d5b71dd` with WS-09's
three harnesses added. The 61 tests are unchanged — the harnesses match no glob in the `test` script.

---

## 5. Secret scan

```
$ node tests/security/secret-scan.mjs
repository            : D:\os-test\dino-dash-app
revision              : d5b71ddf0cb1f0dd887662b9fc37b1107f84272f
tracked files         : 89
text files scanned    : 85
binary files skipped  : 4
patterns applied      : 27
commits in history    : 15
added lines in history: 10142
paths ever tracked    : 89

  aws_access_key_id / aws_secret_key_assign / github_token / github_pat_fine_grained
  slack_token / stripe_key / google_api_key / openai_key / anthropic_key / npm_token
  json_web_token / private_key_block / ssh_public_key / pem_certificate / putty_key_file
  basic_auth_in_url / database_connection_string / password_assignment / secret_assignment
  authorization_header / env_secret_line / high_entropy_base64_literal / telephone_number
  email_address / dotenv_or_key_path
                                    ... every one of these 25: matches=0
  ipv4_literal                   matches=  1
      docs/engineering/WS-11-performance-review.md:61: 12.4.254.21
  remote_url                     matches= 14
      README.md:12,13,14,22,25,139,187          (8 - shields.io badges, the project's own
                                                 GitHub URLs, nodejs.org)
      engineering/schemas/*.schema.json:2       (6 - the JSON Schema $schema identifier
                                                 https://json-schema.org/draft/2020-12/schema)

TOTAL matches at HEAD                 : 15
Credential-pattern matches in history : 0
Sensitive paths ever tracked          : 0
.gitignore present                    : false
node_modules present                  : false
```

**The real result: zero credential material, at HEAD and across the entire history.**

- **Zero matches on all 25 credential and personal-data patterns.** No cloud key, no platform token,
  no JWT, no private key block, no certificate, no connection string, no password or secret
  assignment, no `Authorization` header, no high-entropy base64 literal, no email address, no
  telephone number, no `.env`/`.pem`/`.key`/`.p12` path.
- **Zero across 15 commits and 10,142 added lines.** A clean HEAD can still hide a secret that was
  committed and later removed; the history pass rules that out. `git log --all --name-only` also shows
  **zero sensitive paths ever tracked** — no `.env`, no `secrets/`, no key file has ever existed in
  this repository under any name.
- **The two non-zero rules are both explained and neither is a secret.** `12.4.254.21` is the V8
  version string `12.4.254.21-node.56` in WS-11's environment table, matched by an IPv4 shape — a
  false positive, reported rather than filtered so the rule stays honest. The 14 `remote_url` matches
  are 8 public project links and badge images in `README.md` and 6 identical `$schema` identifiers in
  `engineering/schemas/`. None is private, none is credential-bearing, and **none is in `src/`**,
  which has zero remote references (§4.3).

This satisfies `governance/governance.md` Security and the
`config/operating-model.yaml` guardrail `secret_values_allowed_in_repository: false`. Two structural
notes follow from the same run:

- **There is no root `.gitignore`** (F-05). `tests/.gitignore` and `tests/.results/.gitignore` exist
  and are correct for their purpose, but nothing at the root prevents an accidental `npm install`
  from staging `node_modules/`, or a future `.env` from being committed. Today the risk is latent —
  §4.3 confirms no `node_modules` exists — and creating a root `.gitignore` is outside WS-09's write
  boundary.
- **Design note for whoever reads a future run of this scan:** if it ever does match real credential
  material, the value must **not** be pasted into a review document. The finding is reported by
  location and pattern name only. The harness truncates matches to 90 characters for this reason, and
  the reporting rule is written into its header comment.

---

## 6. Privacy position

### 6.1 Unit 1 collects, stores and transmits nothing about any person — verified

Three claims, each measured independently by a different route:

| Claim | Evidence | Result |
| --- | --- | --- |
| **Collects nothing** | §3.3 identity/PII scan: 44 tokens, 18 files | **1 hit in 44**, and it is `devicePixelRatio` for canvas scaling (F-06). Zero form controls. No `navigator`, no locale, no timezone, no canvas/audio fingerprinting, no UUID |
| **Stores nothing** | WS-06 §3.2 (35 storage tokens, 0 after stripping) and §3.5 (one array in a module closure, no clear path, no unload handler by ADR-003 §3 decision); re-confirmed here across 15 tokens, 0 after stripping | **Zero persistence call sites.** The trace dies with the JavaScript realm. AC-22, AC-23 |
| **Transmits nothing** | WS-04 §3.2 (0 network tokens after stripping); §4.3 here (0 remote references, 0 bare specifiers); WS-07 §3.2–3.4 (0 of 34 vendor + 25 signal + 46 ML tokens) | **Zero egress paths.** AC-24 |

**The score-trace record itself is `{score, endedAt, sessionLengthMs}` and nothing more** — ADR-003 §1
freezes the field set, `RECORD_FIELDS` at `src/trace/score-trace.js:18` enforces it, and ADR-003 §3
states "No identity: no player id, device id, session id, nickname, user agent, IP, locale, screen
size". Data classification: **no personal data of any kind is processed**. There is therefore no
lawful basis to establish, no consent to collect, no retention period to set, no deletion request to
service and no data subject to have rights — not because those obligations were discharged, but
because no processing occurs.

**Two honest qualifications**, so this is not read as more than it is:

- `endedAt` is a client wall-clock instant and `sessionLengthMs` a duration. In isolation and in page
  memory these identify nobody. They are recorded here because **the moment Unit 3 places them in a
  shared store next to a nickname within a known friend group, the combination is a behavioural
  record about an identifiable person.** The fields do not change; their classification does.
- This is a source-level and module-level determination. The runtime confirmations AC-22 to AC-25
  name — the browser's storage inspector empty of game-created keys, and the network panel showing
  zero outbound requests — are WS-10's under `GATE-AUTOMATED-TESTS`. ENG-09 does not claim them (L-01).

### 6.2 Compliance evidence recorded

- `governance/governance.md` Security / `secret_values_allowed_in_repository: false` — **satisfied**,
  §5, zero matches at HEAD and across 15 commits.
- No credentials, tokens, keys, personal data, private URLs or provider identifiers appear in this
  record or in any artifact it produced. The three `tests/.results/` outputs contain scan counts,
  file names, line numbers, SHA-256 hashes and public URLs only.
- The request's `writeBoundary` — WS-09 wrote four files, all under `docs/` and `tests/` (§10). No
  path under `engineering/`, `.development-os/`, `DEVELOPMENT.md`, `development-os.config.json`, or
  anywhere in the product workspace `D:/os-test/dino-dash`, was created or modified. `src/` is
  byte-identical to WS-03's seal (§2.3).

### 6.3 This closes NOTHING for Units 3 and 4

**Stated plainly, because a clean Unit 1 privacy result is exactly the kind of finding that gets
misquoted downstream.**

The workspace's personal-data obligation is **unmet and unchanged**. `DEVREQ-EVT-20260809-001` carries
it in two separate non-functional requirements, both still open:

> "Units 3 and 4 place a real, named friend group's nicknames, scores and profile data in a shared
> store, and **no consent, retention, deletion or anonymization approach exists anywhere in this
> workspace**. Nickname-only identity reduces the data collected but does not remove the obligation,
> because a nickname within a known friend group is identifying to that group."

and

> "Units 3 and 4 handle a named friend group's personal data. Consent, retention, deletion and
> anonymization must be defined **before either unit is contracted**. Blocked pending
> ISS-20260809-015. **No policy exists anywhere in this workspace today.**"

What that means concretely, and what WS-09 is **not** saying:

1. **Unit 1 having no personal data is not progress toward Units 3 and 4's obligation.** It is the
   absence of a subject, not the presence of a control. Zero of the four required approaches —
   consent, retention, deletion, anonymization — exists at this revision, and WS-09 authored none:
   defining them is a product decision behind a human gate, not an engineering deliverable.
2. **ADR-003 §6 rule 4 already gates the mechanism.** No field added to the trace record may be an
   identifier "in a unit that has not cleared the privacy obligation the contract carries open for
   Units 3 and 4". Unit 3 needs a key to store a row against (WS-06 §5.2: the record carries no
   identifier at all, so any store must invent one) — and rule 4 means a *row* key and an *owner* key
   are different problems, the second of which is blocked.
3. **Nothing in §6.1 may be cited as clearing that obligation, in whole or in part.** The
   determination is scoped to Unit 1 at revision `d5b71dd` and to no other unit and no other revision.

`GATE-PRIVACY-COMPLIANCE` is discharged **for Unit 1 only** on exactly this reading (§8.3).

---

## 7. Findings

None of the six is exploitable at this revision. They are ranked by what they cost if left alone.

| ID | Finding | Where | Severity now | Why it is recorded |
| --- | --- | --- | --- | --- |
| **F-01** | `TRANSITIONS[state][event]` resolves inherited `Object.prototype` properties, so 10 names including `constructor` and `__proto__` are accepted as events and drive the state variable off `STATE_VALUES` | `src/game/state-machine.js:45` | **None today** — all three call sites pass literals, so no external string reaches it and AC-26 holds. **Would become real** the moment any later unit routes a string into `transition()` | The guard is a truthiness test over a prototype-consulting lookup. The existing AC-26 test (`state-machine.test.mjs:50`) uses six invented event names, none an `Object.prototype` property, so it cannot catch this. `src/` is sealed — recorded, not patched (§3.6.3) |
| **F-02** | `formatScore` emits `"1e+308"` for inputs ≥ 1e21 — the only characters outside `[0-9]` it can produce are `e` and `+` | `src/game/score.js:27-30` | **None** | Unreachable in production: 97,298 swept values over an hour of play produced only `0123456789`. Neither character is HTML-significant and the sink is `textContent`, which does not parse markup. Recorded for completeness so §3.6.2's "digits only" claim is stated with its exact exception |
| **F-03** | No `Content-Security-Policy` is shipped, in a `<meta>` tag or otherwise; no security headers exist | `src/index.html`; the absent origin | **Low, and structural** | Headers belong to an origin and WS-08 recorded that no deployed environment exists. A `<meta>` CSP was possible but `src/` is sealed. Whoever first stands up a real origin should set CSP, `X-Content-Type-Options`, `Referrer-Policy` and frame-ancestors there |
| **F-04** | Three GitHub Actions are pinned by mutable tag (`@v4`), zero by commit SHA | `.github/workflows/ci.yml:48,51,73` | **Low** | These are the delivery's only third-party components. Bounded by four facts: the workflow has never run, has `contents: read`, publishes nothing, and performs no install (§4.5). `.github/` is outside WS-09's boundary |
| **F-05** | No root `.gitignore` | repository root | **Low, latent** | Nothing prevents an accidental `node_modules/` or a future `.env` from being staged. No such file exists today (§4.3, §5). Outside WS-09's boundary |
| **F-06** | `devicePixelRatio` is read — the delivery's only device-characteristic read | `src/render/canvas-renderer.js:129` | **None** | Clamped to 1–3, used for `setTransform`, never stored, never rendered as text, never in the trace, never transmitted. Recorded so ENG-15 does not have to decide whether it was missed |
| **F-07** | *(carried, not found here)* A run left in a hidden tab accrues +600 points per 60 s at zero risk | WS-05 §3.8 | — | WS-05's measurement, restated because it belongs in a threat model as business-logic abuse (T-12). **Not re-accepted and not re-scoped.** WS-05 records that `DEC-20260809-001` covers deliberate forgery and does **not** address time-derived accrual while hidden; that distinction is preserved exactly |

**No finding was remediated by WS-09.** F-01, F-02 and F-06 sit in `src/`, sealed at WS-03. F-03,
F-04 and F-05 sit outside WS-09's write boundary. F-07 is another role's measurement and another
authority's decision.

---

## 8. Gate dispositions

```
$ node -e "…print the three ENG-09 gates from engineering/quality/gates.json…"
GATE-SECURITY            required=true   evidence: threat review, secret and vulnerability scan
GATE-SUPPLY-CHAIN        required=true   evidence: dependency audit, software bill of materials
GATE-PRIVACY-COMPLIANCE  required=false  evidence: data classification, retention and compliance review
```

### 8.1 `GATE-SECURITY` — **DISCHARGED, with findings**

| Evidence the gate names | Where it is | Disposition |
| --- | --- | --- |
| **threat review** | §3 — trust boundaries (§3.1), assets and classification (§3.2), identities and abuse cases (§3.3), 14 STRIDE-shaped threats with per-threat disposition (§3.4), the `window.dinoDash` global and score forgeability (§3.5), the DOM/XSS surface verified across 51 injection tokens and all 5 DOM write sites (§3.6), the static origin (§3.7) | **Satisfied.** Every threat carries a disposition backed by a measurement or an explicit not-applicable with its reason |
| **secret and vulnerability scan** | §5 — 27 patterns × 85 text files at HEAD, plus 10,142 added lines across 15 commits, plus every path ever tracked: **0 credential matches**. §4.2 — `npm audit`: 0 vulnerabilities across 0 dependencies, `npm ls --all`: `(empty)` | **Satisfied, with the audit's triviality stated.** `npm audit` over zero dependencies attests to nothing and is recorded as such rather than presented as assurance |

**Discharged.** The gate is genuinely met, not skipped and not routed around: both named evidence
artifacts exist, both were produced by commands recorded in this document, and both are reproducible.
Six findings are attached (§7); none is exploitable at `d5b71dd`, and F-01 is a latent defect a later
unit will reach if the module is reopened without fixing it. `not_applicable` was **not** used for
this gate — the work was real, and it was done.

### 8.2 `GATE-SUPPLY-CHAIN` — **DISCHARGED**

| Evidence the gate names | Where it is | Disposition |
| --- | --- | --- |
| **dependency audit** | §4.1 (8 dependency fields, 0 entries), §4.2 (lockfile: 1 key, 0 third-party; `npm ls --all` empty; `npm audit` 0/0), §4.3 (0 bare specifiers, 0 remote references, no `node_modules`, no alternative installer artifact, no build step), §4.5 (3 CI actions, 0 SHA-pinned — F-04), §4.6 (`npm test` 61/61 with no install) | **Satisfied** |
| **software bill of materials** | §4.4 — `tests/.results/sbom.cdx.json`, CycloneDX 1.5, `components: []`, 18 nested first-party files with SHA-256 hashes, 20 measured properties, `.sha256` sidecar `31e240dc…d38917`, regenerable by `node tests/security/sbom.mjs` | **Satisfied** |

**Discharged.** The SBOM has zero components and that is the correct, honest artifact: the component
count was measured, not assumed, and a zero-component SBOM is complete when the count is zero. The one
place third-party code genuinely enters this delivery — three CI actions — is inventoried in the SBOM
properties and recorded as F-04 rather than omitted because it is not in the shipped bundle.

### 8.3 `GATE-PRIVACY-COMPLIANCE` — **DISCHARGED FOR UNIT 1 ONLY**

| Evidence the gate names | Where it is | Disposition |
| --- | --- | --- |
| **data classification** | §3.2 (asset table) and §6.1 — **no personal data of any kind is processed**; the trace record is `{score, endedAt, sessionLengthMs}` with no identifier, verified by a 44-token scan, WS-06's storage scan and WS-04's network scan | **Satisfied for Unit 1** |
| **retention and compliance review** | §6.1 (retention is the page's JavaScript realm, by construction, with no persistence path to clear), §6.2 (secret guardrail satisfied; write boundary honoured) | **Satisfied for Unit 1** |

**Discharged for Unit 1 at revision `d5b71dd`, and for nothing else.** §6.3 states without hedging that
the workspace's consent, retention, deletion and anonymization obligation for Units 3 and 4 is
**unmet, unchanged, and not touched by this record**. Zero of the four approaches exists anywhere in
this workspace; defining them is behind a human gate; and no sentence in §6 may be cited as clearing
any part of it.

### 8.4 Gates WS-09 does not own

`GATE-ARCHITECTURE` (ENG-02), `GATE-CODE-REVIEW` (ENG-01), `GATE-AUTOMATED-TESTS` (ENG-10),
`GATE-DOCUMENTATION` (ENG-14) and `GATE-INDEPENDENT-VERIFICATION` (ENG-15) are the other five
`required: true` gates and none is affected by this record. WS-09 issues **no verification disposition
for the delivery** — only ENG-15 at WS-14 does that, and this run reports
`verificationDisposition: not_applicable` for exactly that reason.

---

## 9. Known risks and limitations

- **L-01 — every scan here is static or module-level; none is a browser observation.** Zero call sites
  in source is what a source-level review can establish and it is strong evidence, but it is not the
  storage inspector and not the network panel. AC-22 to AC-25's stated runtime verification is WS-10's
  under `GATE-AUTOMATED-TESTS`. ENG-09 neither claims it nor pre-empts it.
- **L-02 — a token scan cannot prove the absence of an unnamed API.** 51 injection, 34 network, 15
  persistence and 44 identity tokens were checked. An API named in none of the four lists would not be
  found. The lists are printed in full in `tests/.results/security-surface.json` so a reader can judge
  the coverage rather than trust the totals.
- **L-03 — the tamper results cited from WS-06 §3.6 are strict-mode results.** Four `TypeError`s in an
  ES module become four silent no-ops in a browser console, which is sloppy mode. Same outcome,
  different diagnostics. A reader pasting those lines into DevTools and seeing no exception has not
  found a regression. WS-06 records this as its own L-03.
- **L-04 — `npm audit` here is a trivially true result.** Zero vulnerabilities across zero
  dependencies attests to nothing about the delivery's own code, about Node, or about the browser. It
  is recorded because GATE-SUPPLY-CHAIN names a dependency audit, not as assurance.
- **L-05 — the secret scan is pattern-based.** 27 patterns over 85 text files and 10,142 added lines
  found zero credential matches. A credential in a shape none of the 27 patterns describes, or split
  across lines, would not be found. Four binary files (`docs/media/*.png`) were skipped by extension
  and were not scanned for embedded strings.
- **L-06 — F-01's unreachability is verified at `d5b71dd` and only there.** It rests on `transition()`
  having exactly three call sites, all passing literals. Any change to `src/main.js` that widens that
  invalidates the finding's severity, and no test currently guards it.
- **L-07 — client-side score forgeability is the owner's accepted risk and is NOT re-accepted here.**
  `APR-870DC901FD68`, restated in `DEC-20260809-001`, bounded to Units 1 and 2, server-side validation
  required from Unit 3. WS-02 **AR-02** states that no workstream may re-accept it. This document
  records it with attribution and designs nothing against it. A second, weaker record of the same
  decision would be worse than none.
- **L-08 — WS-05's hidden-tab accrual is carried, not re-accepted and not extended.** WS-05 is
  explicit that `DEC-20260809-001` covers deliberate forgery and does **not** address time-derived
  accrual while hidden, and that its record must not be cited as extending it. F-07 preserves that
  distinction exactly.
- **L-09 — every determination is scoped to Unit 1 at revision `d5b71dd`.** None is a standing
  judgement about Dino Dash. Units 2 to 5 are not contracted and nothing here pre-clears any of them,
  in either direction.
- **L-10 — the CI workflow has never executed.** F-04's exposure assessment rests partly on that. It
  is the workflow's own stated header claim and WS-12 §4–5 recorded the equivalent commands run
  locally with real exit codes; ENG-09 re-ran `npm test` (§4.6) but ran no CI.
- **L-11 — one threat is explicitly outside the artifact's control.** T-14: if Unit 1 is deployed onto
  an origin shared with other content, that content shares the realm. Unit 1 stores nothing so there
  is nothing to steal, but nothing in the bundle prevents injection from the other direction. That is
  a hosting decision nobody has made yet (WS-08).

---

## 10. What ENG-09 did not do

- **No change to any file under `src/`.** The tree object is byte-identical to WS-03's seal (§2.3).
  F-01, F-02 and F-06 are recorded for disposition, not patched.
- **No re-acceptance, re-scoping or mitigation of the score-forgeability risk.** No checksum, no
  signature, no replay log, no input recording, no obfuscation, no server call. The owner accepted it;
  WS-02 **AR-02** forbids re-accepting it; ENG-09 has no authority to accept a product risk and did
  not attempt to.
- **No anti-tamper design, and no Unit 3 validation design.** Server-side validation belongs to Unit 3
  and is to be decided at Unit 3. §3.5 states what Unit 3 inherits — a shape, not a trustworthy value
  — and proposes nothing.
- **No privacy policy, consent flow, retention schedule, deletion path or anonymization scheme.** None
  exists in this workspace, defining them is behind a human gate, and §6.3 records the obligation as
  open rather than filling it in.
- **No failing test added to the unit tier.** The three harnesses under `tests/security/` assert
  nothing and match no glob in the `npm test` script; the tier is unchanged at 61/61. Adding an
  assertion that F-01 is fixed would have broken `GATE-AUTOMATED-TESTS` for ENG-10 over a defect
  ENG-09 is not permitted to fix.
- **No CSP, no security headers, no `.gitignore`, no CI change.** `src/`, `.github/` and the repository
  root are outside WS-09's write boundary. F-03, F-04 and F-05 are recorded instead.
- **No verification disposition for the delivery.** WS-09 reports `not_applicable` for its own run.
  Only ENG-15 at WS-14 issues the delivery's disposition.
- **No product decision and no reopening of a non-goal.** Scope, priority, risk acceptance and final
  user-visible acceptance belong to the human product owner.
- **No write outside the boundary.** This workstream created exactly four files:
  `docs/engineering/WS-09-security-review.md`, `tests/security/surface-scan.mjs`,
  `tests/security/secret-scan.mjs` and `tests/security/sbom.mjs`. Their outputs land in
  `tests/.results/`, which is git-ignored. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in the product workspace
  `D:/os-test/dino-dash`, was created, modified or read for writing.
