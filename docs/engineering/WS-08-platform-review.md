# WS-08 — Platform, Cloud and Network: recorded not-applicable determination

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` |
| Workstream | WS-08, owner role ENG-08, producer actor `actor-eng-08`, domain `platform_cloud_network` |
| Plan dependency | WS-02 (complete) |
| Branch | `codex/evt-20260809-001` |
| Revision reviewed | `b35af29f4516c54b00fd8473b45b763688982978` |
| Disposition | `not_applicable` — **verified by scan and by serving the delivered artifact over HTTP, not asserted** |
| Gate | `GATE-INFRA-NETWORK` (ENG-08, `required: false`) — **not engaged**; see section 4 |
| Authored | 2026-08-11 |

This record exists because `not_applicable` is a disposition, not an omission. WS-09 (**D-09**) and
WS-10 declare WS-08 in their dependencies, and an absent record blocks two required-gate workstreams
on nothing (WS-01 **R-03**). It provisions nothing. It contains no IaC, no Dockerfile, no deployment
configuration, no DNS, TLS, CDN, queue, load balancer, autoscaling policy, capacity model or cost
model, and no scaffolding for any of them.

---

## 1. The determination

**Unit 1 has no cloud, no deployed environment, no infrastructure and no capacity or cost profile. It
is a static bundle served from any origin, with zero network use after load. WS-08 has no
implementation work, and ENG-08 built none.**

The absence is contracted, not incidental:

| Source | What it says |
| --- | --- |
| `DEVREQ-EVT-20260809-001` `desiredOutcome` | For Unit 1 specifically, "persistence of any kind, **any network call**, any identity, any leaderboard or score table" are **non-goals — removed from scope, not deferred**. Reopening any is a product direction behind the human `product_direction_or_priority` gate. |
| `DEVREQ-EVT-20260809-001` NFR `network` | "SUPERSEDED FOR THIS VERSION… no real-time guarantee, no concurrency between players, and no requirement that any service be reachable while a player is playing", and "**Units 1 and 2 declare no network dependency at all**". |
| AC-01 | Playable "with no… loading dependency on any server"; network panel shows **zero cross-origin requests**. |
| AC-24 | "no network request after the initial asset load, and remains fully playable with the network disabled". |
| WS-01 §1, order 4 | "No infrastructure, no deployment target, no DNS/TLS/CDN/queue, no cost surface. The delivery is files in a checkout. `GATE-INFRA-NETWORK` is `required: false`." |
| ADR-005 §1, §6 | No build step, no `dist/`; "the delivered source **is** the running artifact"; "**Runtime dependencies: zero.** Non-negotiable — it is what makes AC-24 true by construction." |

There is no environment to promote to, so there is no environment topology, no promotion path and no
rollback target. There is no running service, so there is no capacity unit to size and no billable
resource to price. A cost profile for Unit 1 is not "zero pending estimation" — there is no resource
class it could be a profile of.

---

## 2. Verified absence — what ENG-08 actually scanned

Scope: all **79 tracked files** at `b35af29`, plus the untracked working tree.

### 2.1 IaC, container, orchestration and platform-host filenames — zero

`git ls-files` matched case-insensitively against `dockerfile`, `docker-compose*`, `*.tf`,
`*.tfvars`, `*.tfstate`, `*.tf.json`, `pulumi*`, `*cloudformation*`, `chart.y[a]ml`,
`values.y[a]ml`, `serverless.y[a]ml`, `vercel.json`, `netlify.toml`, `fly.toml`, `app.yaml`,
`Procfile`, `nginx.conf`, `.env*`:

> **0 matches.**

Directory-segment match against `k8s`, `kubernetes`, `helm`, `terraform`, `infra`,
`infrastructure`, `deploy`, `deployment`, `.circleci`, `ansible`:

> **0 matches.**

### 2.2 Cloud and platform tokens in file content — zero

`git grep -nIiE` across all tracked files, excluding the prior `docs/engineering/WS-0*` reviews
(which name these tokens only to record their absence), for
`terraform|pulumi|cloudformation|kubernetes|kubectl|helm|docker|serverless|aws_|s3://|gs://|azure|gcp|cloudfront|route53|lambda|fargate|nginx|vercel|netlify|heroku|fly\.io|cdn\.`:

> **0 matches.**

### 2.3 Runtime network call sites — zero, cross-checked

`fetch(`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, `EventSource`, `importScripts`,
`@import`, `url(...)` across `src/`:

> **2 matches, both in comments** — `src/main.js:6` and `src/trace/score-trace.js:11`, each a prose
> line stating the API is absent. **Zero call sites.**

This is the same result WS-04 §2 reached from the backend/integration direction and WS-06 §2 from the
storage direction. ENG-08 re-ran it rather than inheriting it, because the platform question is
"does anything leave the origin", not "is there a server" — a different question with the same answer
here. **The WS-04, WS-05, WS-06 and WS-07 scans are cited, not repeated.**

### 2.4 Toolchain and secret material

- No root `package.json`, no `package-lock.json`, no `.github/`, no CI workflow at this revision.
  **WS-12 has not run**; ADR-005 §4 specifies the commands it will own. Nothing at this revision
  requires a network at play time; ADR-005 §4 and WS-01 **B-01** separate the *install*-time network
  from the *run*-time network, and ENG-08 confirms Unit 1 has no run-time network at all.
- No `node_modules/` in the working tree.
- Worktree-wide search for `.env*`, `*secret*`, `*.pem`, `*.key`, `credentials*` (excluding `.git`):
  **0 files.** No provider identifier, endpoint, region, account, project id or private URL exists to
  be committed, because there is no provider.

---

## 3. What the deployable artifact actually is — measured

The artifact is `src/` at `b35af29`, unmodified. There is no build, so nothing is generated,
transformed or minified between what is reviewed and what runs (ADR-005 §1).

| Measure | Value |
| --- | --- |
| Files in `src/` | **18** (all 18 git-tracked) |
| Total bytes of `src/` | **42,559 B** (41.6 KiB) |
| Files the browser actually fetches | **17** |
| Bytes served on a cold load | **42,517 B** (41.5 KiB) |
| HTTP requests for a cold load | **17** — 1 document + 1 stylesheet + **15 ES modules** |
| Cross-origin requests | **0** |
| Requests after load | **0** (AC-24; no call site exists — §2.3) |
| Largest single file | **`src/render/palette.js`, 7,049 B** |
| Second largest | `src/render/canvas-renderer.js`, 6,191 B |
| Runtime dependencies | **0** |

The 17 requests, in the order the browser discovers them:

```
src/index.html            src/game/state-machine.js   src/game/score.js
src/styles/game.css       src/game/run-state.js       src/trace/score-trace.js
src/main.js               src/render/palette.js       src/render/canvas-renderer.js
src/engine/clock.js       src/game/physics.js         src/render/hud.js
src/engine/loop.js        src/game/simulation.js      src/input/keyboard.js
                          src/game/collision.js
                          src/game/obstacles.js
```

Two details that keep the count honest:

- The favicon is `<link rel="icon" href="data:,">` (`src/index.html:7`). A `data:` URI is **not** a
  network request; the tag exists to stop the browser's default `/favicon.ico` probe, which would
  otherwise be an 18th request and a console 404 against AC-01.
- `src/package.json` (42 B, `{"type":"module","private":true}`) is the 18th file in `src/` and is
  **never fetched by the browser** — it exists so Node's unit tier (ADR-005 §3) resolves the same
  files as ES modules. It is servable but unreferenced.

**Measured, not computed.** ENG-08 started `tests/tools/static-server.mjs` on `127.0.0.1:4188`,
requested all 17 paths, and recorded: **17/17 responded `200` with the correct MIME type**
(`text/html`, `text/css`, `text/javascript`), **42,517 bytes transferred**, **0 failures**. The
server was stopped afterwards. Nothing was provisioned and no listener was left running.

For scale: the whole playable artifact is smaller than a single typical web font file. It fits in one
TCP congestion window's worth of round trips on any origin. There is no capacity question here to
answer.

---

## 4. `GATE-INFRA-NETWORK` — state and reason

`engineering/quality/gates.json` (lines 76–84):

```json
{
  "id": "GATE-INFRA-NETWORK",
  "domain": "infrastructure",
  "ownerRole": "ENG-08",
  "required": false,
  "evidence": ["infrastructure plan", "network and cost review"]
}
```

- **`required`: `false`.**
- **Engaged: no.**

**Reason.** The gate's two evidence items have no referent at this revision. An "infrastructure plan"
presupposes infrastructure; §2.1 and §2.2 show zero IaC, container, orchestration or platform-host
artifacts across 79 tracked files. A "network and cost review" presupposes traffic and a billable
resource; §2.3 and §3 show zero runtime network calls and a 42,517-byte static artifact with no
hosted component. Producing either document would mean authoring a plan for a system that does not
exist.

This is the same reasoning WS-01 §1 recorded for `GATE-DATABASE` and `GATE-API-COMPATIBILITY`, and it
matches WS-01's required-gate coverage check: **no gate with `required: true` is owned by ENG-08**, so
recording `not_applicable` here routes around nothing. `GATE-INFRA-NETWORK` is not waived, not
deferred and not pre-cleared for any later unit — it is simply not engaged by Unit 1's scope, and it
becomes live the moment a unit introduces a hosted component.

---

## 5. The one real platform fact worth recording

**Unit 1 needs a static origin over HTTP. It cannot run from `file://`.**

This is the only genuine platform constraint the delivery has, and it is a hosting *protocol*
requirement, not an infrastructure requirement.

### Verified, not asserted

| Check | Result |
| --- | --- |
| `src/index.html:60` declares the entry script | `<script type="module" src="main.js"></script>` — **`type="module"` present** |
| Classic (non-`module`) `<script src=…>` tags in `index.html` | **0** — there is no fallback path |
| `nomodule` attribute or inline bootstrap | **none** |
| ES module specifiers across `src/` | **24 static `import`/`export … from` statements, every specifier relative** (`./`, `../`); no bare specifier, no import map, no dynamic `import()` |
| Modules reachable only through the module graph | **15 of 15** — every `.js` file in the delivery loads via `type="module"` resolution |

The consequence is mechanical rather than a matter of judgement: because there is no classic-script
path, the module graph is the *only* way any of the 15 JS files gets loaded, and module scripts are
fetched under CORS rules. Under `file://` the page's origin is opaque, the module fetches fail, and
Chromium emits a console error — which fails **AC-01** ("zero errors") directly, before any gameplay
criterion is reached. ADR-001 §4 records this and rejects `file://` on exactly this ground; AC-24's
own verification text ("all are same-origin static assets") already presumes an HTTP origin.

### Minimum viable hosting

Anything that returns bytes over HTTP with a correct `Content-Type` for `.js`:

1. **Serves the 17 files of `src/` at a single origin**, preserving relative paths.
2. **Sends `text/javascript` for `.js`.** This is the one requirement that is not automatic —
   a server defaulting `.js` to `text/plain` or `application/octet-stream` causes Chromium to refuse
   the module on MIME grounds and the page fails identically to `file://`. `tests/tools/static-server.mjs`
   sets it explicitly; ENG-08 verified all 15 module responses carried it (§3).
3. **Nothing else.** No TLS terminator (localhost HTTP suffices for the AC-01/AC-24 procedure), no
   routing rules, no rewrite, no server-side logic, no session, no headers beyond content type, no
   database, no origin-side state of any kind. The origin is a file reader.

Concretely, the floor is a single process serving a directory — which is exactly what
`tests/tools/static-server.mjs` already is, at 63 lines and **zero dependencies**. ADR-005 §2 assigns
the pinned dev-dependency equivalent to WS-12; either satisfies the requirement, and the requirement
is satisfied by any static file server that has ever existed. **ENG-08 is not selecting a host, and
this section is not a hosting recommendation** — it states the floor so that a later reader does not
mistake "needs HTTP" for "needs infrastructure".

---

## 6. Analysis: what a later unit would need from ENG-08

**This section is analysis, not design.** It proposes no component, selects no technology, sizes
nothing and pre-clears no gate. Units 2–5 are not contracted (WS-01 §0), and nothing here may be read
as a decision.

### The owner's Unit 3 disposition, as relayed

The coordinator relayed, on this task, that the owner has decided Unit 3's shared table is
**self-hosted on the owner's own machine, local, and any client may submit**. ENG-08 records that
disposition as given and does not extend, narrow or re-litigate it. ENG-08 did **not** read the
product workspace `D:/os-test/dino-dash` and does not restate the decision's canonical identifier;
the authoritative record lives on the product side.

### What that implies for this domain

Four consequences follow from the disposition alone, without designing anything:

1. **No cloud account, therefore no cloud-shaped work.** Self-hosted on the owner's machine means
   there is no provider to select, no region, no account, no IAM model, no managed service, no
   provisioning step and no external billing relationship. The provider-selection and
   cost-modelling half of ENG-08's domain stays empty into Unit 3. The
   `real_money_or_provider_operation` human gate is **not** engaged by this — no provider operation is
   implied — and this record does not pre-clear it in either direction.

2. **No scaling story, and that is a decision the owner has already made.** A single machine serving a
   known friend group has no horizontal scaling dimension, no autoscaling policy, no load balancer, no
   capacity plan and no availability target. What replaces the scaling question is a much smaller
   one: the table is reachable only when that machine is running. Unit 1 is unaffected — AC-24 and the
   contract's `network` NFR already state that no service need be reachable while a player is playing,
   and Unit 1 declares no network dependency at all, so Unit 1 keeps working when the machine is off.
   Whether *Unit 3* tolerates that is a Unit 3 question and is not answered here.

3. **A single origin, which is the same platform fact §5 already records — extended by one step.**
   Unit 1 needs a static origin. Unit 3 would need that origin to also accept a submission, which
   turns the file reader of §5 into something with a request handler. That is the first genuine
   platform delta in the whole product, and it is small: one origin, one machine, no topology. It is
   also the point at which `GATE-INFRA-NETWORK` stops being empty — the "network review" half acquires
   a referent even though the "cost review" half still does not.

4. **"Any client may submit" makes the origin the only control point.** This is the consequence worth
   flagging hardest, and it is a statement about where a control *can* sit, not a proposal for one. If
   there is no identity, no account and no client-side gate, then every property anyone might later
   want of the shared table — that a submitted score is well-formed, that it is in range, that it is
   not a replay, that one client cannot flood the table — can only be established at the origin,
   because the origin is the only place in the system that is not the submitting client. The contract
   already carries this from the product side: its `security` NFR states that from Unit 3 "server-side
   validation is required; its design belongs to Unit 3 by the owner's instruction", and the owner's
   client-side-tamperability risk acceptance is **bounded to Units 1 and 2** and must not be re-accepted
   or widened by any workstream. ENG-08 designs no validation, proposes no rate limit and names no
   mechanism. It records only the topology fact: a local single origin open to any client has exactly
   one enforcement surface, and Unit 3's contract will need to say what — if anything — it does with it.

### Carried couplings, unchanged

- **`ISS-20260809-010` / contract `security` NFR:** a server can validate only what the client emits,
  so whether Unit 1's run loop must produce a replayable or attestable score trace is a Unit 1 design
  question generated by a Unit 3 requirement. ENG-08 does not answer it. What ENG-08 adds is that the
  self-hosted, open-submission shape makes the *origin* the place the answer will be enforced,
  which sharpens the question without closing it.
- **Privacy (contract `privacy` NFR, `ISS-20260809-015`):** Units 3 and 4 place a named friend group's
  data in a shared store and no consent, retention, deletion or anonymization approach exists in this
  workspace. Self-hosting changes *where* that data sits; it does not reduce the obligation. Risk
  acceptance is a human gate. Unit 1 collects nothing (AC-23, AC-25), so nothing is carried from here.
- **Performance (WS-01 **R-02**):** the frame-rate and jump-timing requirement remains unquantified
  with no numeric budget and is not a Unit 1 exit condition. It is not a platform item and ENG-08
  invents no budget for it.

---

## 7. What ENG-08 did not do

- **Provisioned nothing.** No cloud resource, account, DNS record, certificate, CDN, queue, load
  balancer, container registry or environment was created, requested or configured. No credential was
  read, written, requested or handled.
- **Wrote no IaC, no Dockerfile, no deployment configuration.** No `infrastructure/`, `database/`,
  `migrations/`, `services/`, `app/`, `apps/` or `packages/` directory was created — WS-01 **B-03**
  lists them as allowed by the contract but not to be created, and creating them would inflate the
  AC-28 inventory with scaffolding for a system that does not exist.
- **Selected no host and recommended none.** §5 states the protocol floor the delivery already
  requires; it names no product and endorses none.
- **Engaged no gate and waived none.** `GATE-INFRA-NETWORK` is recorded as `required: false` and not
  engaged, with the reason stated. No gate belonging to another role was touched, and no
  `required: true` gate is affected.
- **Made no product decision and pre-cleared no human gate.** The Unit 3 disposition in §6 is recorded
  as relayed, not interpreted into a design. `real_money_or_provider_operation`,
  `product_direction_or_priority` and `final_user_visible_acceptance` are neither engaged nor
  pre-cleared. The owner's Units 1–2 risk acceptance is neither widened nor re-accepted.
- **Issued no verification disposition for the delivery.** Only ENG-15 at WS-14 may do that. This
  record's `not_applicable` is WS-08's own disposition and nothing more.
- **Left no process running.** The static server started for the §3 measurement was stopped.
- **Wrote outside no boundary.** This workstream created exactly one file,
  `docs/engineering/WS-08-platform-review.md`. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, `src/`, `tests/`, or anywhere in the product
  workspace `D:/os-test/dino-dash`, was created or modified.

---

## 8. Commands run (verbatim, reproducible at `b35af29`)

```
git rev-parse HEAD
git ls-files | wc -l
git ls-files | grep -Ei '(^|/)(dockerfile|docker-compose[^/]*|.*\.tf|.*\.tfvars|.*\.tfstate|pulumi[^/]*|.*cloudformation[^/]*|chart\.ya?ml|values\.ya?ml|serverless\.ya?ml|vercel\.json|netlify\.toml|fly\.toml|app\.yaml|Procfile|nginx\.conf|\.env.*|.*\.tf\.json)$'
git ls-files | grep -Ei '(^|/)(k8s|kubernetes|helm|terraform|infra|infrastructure|deploy|deployment|\.circleci|ansible)(/|$)'
git grep -nIiE 'terraform|pulumi|cloudformation|kubernetes|kubectl|helm|docker|serverless|aws_|s3://|gs://|azure|gcp |cloudfront|route53|lambda|fargate|nginx|vercel|netlify|heroku|fly\.io|cdn\.' -- . ':!docs/engineering/WS-0*'
grep -rnoE '(from|import)[[:space:]]+"[^"]+"|href="[^"]+"|src="[^"]+"|url\([^)]*\)|fetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|EventSource|importScripts|@import' src/
grep -rnE "^\s*(import|export)[^;]*from" src/ --include=*.js
find src -type f -printf '%s\t%p\n' | sort -rn
find src -type f | wc -l
find src -type f -printf '%s\n' | awk '{s+=$1} END {print s}'
find . -path ./.git -prune -o \( -iname '.env*' -o -iname '*secret*' -o -iname '*.pem' -o -iname '*.key' -o -iname 'credentials*' \) -print
node tests/tools/static-server.mjs 4188        # then GET all 17 cold-load paths; assert 200 + MIME; then stop
```

One inline Node script (not reproduced here) resolved the `src/index.html` module graph transitively
to produce the 17-request closure in §3; one more issued the 17 HTTP GETs against the local server and
recorded status, `content-type` and byte count. Both are described by their one-line effect above.

## 9. Evidence and limitations

- **Evidence:** this record; `b35af29f4516c54b00fd8473b45b763688982978`; the scan results in §2; the
  measured artifact figures and the live 17/17 HTTP result in §3; `engineering/quality/gates.json`
  lines 76–84 for §4; `src/index.html:60` and the 24-specifier module scan for §5.
- **Cited, not repeated:** `docs/engineering/WS-01-coordination.md` (§0, §1, **B-01**, **B-03**,
  **R-02**, **R-03**); `docs/architecture/decisions/ADR-001` §4 and `ADR-005` §1, §2, §4, §6;
  `docs/engineering/WS-04-backend-review.md` (no server, no API, no integration);
  `WS-05-client-review.md` (no packaged client, no lifecycle host); `WS-06-storage-review.md`
  (no persistence); `WS-07-data-review.md` (no telemetry, no pipeline, no egress).
- **Limitation — no browser was driven.** The `file://` failure mode in §5 is verified at the level
  ENG-08 can verify it: the `type="module"` declaration, the absence of any classic-script fallback,
  and the all-relative specifier set — the conditions that make the failure mechanical. Observing the
  Chromium console error itself is browser-tier work belonging to WS-10 under AC-01, and is not
  claimed here.
- **Limitation — WS-12 has not run.** No root `package.json`, lockfile or CI workflow exists at this
  revision. Every §3 figure is the artifact as delivered by WS-03 and will not change under ADR-005
  §1 (no build step), but a re-measure after WS-12 is cheap and is the correct check if that
  assumption is ever doubted.
- **Limitation — §6 is analysis of a relayed disposition.** ENG-08 did not read the product workspace
  and does not restate the decision's canonical identifier. If the relay is inaccurate, §6's four
  consequences are inaccurate with it; §§1–5 do not depend on it.
- No credential, key, token, personal datum, private URL or provider identifier appears in this
  record. Unit 1 collects none and there is no provider to identify.
