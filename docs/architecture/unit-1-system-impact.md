# Unit 1 — system impact analysis

| Field | Value |
| --- | --- |
| Plan / workstream | `ENGPLAN-EVT-20260809-001` / WS-02, owner role ENG-02, producer actor `actor-eng-02` |
| Request | `DEVREQ-EVT-20260809-001` |
| Branch / base revision | `codex/evt-20260809-001` @ `2098741e` |
| Depends on | WS-01 (`docs/engineering/WS-01-coordination.md`) |
| Scope | Unit 1 only. Units 2–5 are not contracted and nothing here pre-clears them. |
| Authored | 2026-08-10 |

This is the system-boundary half of `GATE-ARCHITECTURE`. The decision half is the five ADRs under
`docs/architecture/decisions/`. It contains no game code, no verification disposition and no product
decision.

---

## 1. The system, in full

One static browser page. No server, no database, no queue, no cache, no scheduled job, no identity
provider, no third-party service, no build output, no deployment target. The delivery is files in a
checkout, opened through a local static HTTP origin (ADR-001).

**Containers:** one — the browser page.

**Components inside it** (ADR-002): a bootstrap module; a `requestAnimationFrame` loop; a monotonic
clock; a three-state machine; per-run state produced by a factory; physics, obstacle, collision and
score modules; a score-trace store with a read-only in-page accessor; a canvas renderer over a single
declared palette; a DOM UI layer for all text; a keyboard input adapter.

**Trust boundary:** there is exactly one, and it is the page itself. Everything inside it —
including the score, the elapsed time and the trace record — is client-produced and forgeable from a
browser console. There is no second party to trust or be trusted by, because nothing leaves the page.

**Data classes:** none personal, none sensitive, none retained. The only data structure that outlives
a run is an in-memory array of `{score, endedAt, sessionLengthMs}` records (ADR-003), which reaches no
store and no destination and dies with the page's JavaScript realm.

**Interfaces:** two, both inbound and both local — the keyboard, and the read-only in-page accessor
`window.dinoDash` used for evidence. No outbound interface of any kind exists.

**Failure boundaries:** a page that fails to load is a page that does not run; there is no partial
state, no retry, no degraded mode, no recovery path, because there is nothing to recover *to*. This
is not an oversight — it is what "no persistence, no network, no identity" means at the architecture
level.

---

## 2. Per-impact-domain assessment

The contract lists eight impact domains. Each is assessed against Unit 1 as contracted.

| Domain | Impact | Assessment |
| --- | --- | --- |
| **frontend** | **High — this is the whole delivery.** | Canvas play field plus a DOM UI layer for all text (ADR-002). Native ES modules, no framework, no build step (ADR-005). Owned by WS-03. |
| **accessibility** | **High, and cross-cutting by owner disposition.** | `DEC-20260809-001` makes keyboard operability and contrast cross-cutting across all five units. Architecture serves this in three concrete ways: text lives in the DOM so it can take focus and be measured; text sits on opaque plates so its background is one enumerated colour; the palette is a single exported enumeration so contrast is computable statically (ADR-002, ADR-004). Contrast thresholds are the owner's: 4.5:1 text, 3:1 game elements. |
| **architecture** | **High.** | Five ADRs. The load-bearing one is ADR-003, because it is the only Unit 1 artifact a later unit consumes. |
| **data** | **Low, and deliberately terminal.** | One in-memory array. No schema, no store, no migration, no pipeline, no analytics event, no retention question, no classification beyond "none collected". WS-06 and WS-07 are `not_applicable` for exactly this reason. The only forward-facing data concern is the *shape* Unit 3 inherits, which ADR-003 fixes. |
| **security** | **Low surface, one recorded acceptance.** | No server, no auth, no input from any origin, no third-party code, no secret, no credential, no storage. The entire security story is the accepted one: score authority is client-side and every trace field is forgeable. That risk was accepted by the product owner bounded to Units 1 and 2 (`APR-870DC901FD68`, restated in `DEC-20260809-001`). **ENG-02 designs no anti-tamper measure into Unit 1** and no workstream may re-accept a risk the owner already accepted. Server-side validation is a Unit 3 decision to be made at Unit 3. |
| **performance** | **Open and unquantified — not closed here.** | The contract's performance NFR is explicitly UNKNOWN with no numeric budget, and no acceptance criterion asserts one. WS-01 carries this as **R-02**. Architecture makes one relevant choice — delta-time simulation with a clamped maximum step, so the score sequence is frame-rate independent (ADR-002 §5) — and asserts **no** budget. ENG-02 does not invent a target where the owner has stated none. |
| **documentation** | **Medium, and one AC depends on it.** | AC-29 requires the score-trace field contract to be findable and to match behaviour. ADR-003 is its source; ENG-14 (WS-13) writes the Unit-3-facing version. WS-01 records this as **D-10**. |
| **devops** | **Low.** | No infrastructure, no deployment, no environment, no secret store. The only devops surface is a dev-only toolchain and optionally a CI workflow under `.github/` — ENG-12's to build, ADR-005's constraints to respect. |

---

## 3. What this delivery does *not* touch

- **No server, API, integration, or contract with any external party** — WS-04 `not_applicable`.
- **No mobile, desktop, or packaged client** — WS-05 `not_applicable`.
- **No database, schema, migration, or backup** — WS-06 `not_applicable`; AC-22 and AC-23 forbid
  persistence of any kind.
- **No analytics, telemetry, model, or pipeline** — WS-07 `not_applicable`; the score trace is an
  in-page array, not an analytics contract.
- **No infrastructure, DNS, TLS, CDN, queue, or cost surface** — WS-08 `not_applicable`.
- **No service to observe, no SLO, no error budget, no incident surface** — WS-11 `not_applicable`
  with the performance limitation carried open.

These are WS-01's dispositions, restated here only because a system-impact analysis that lists eight
impact domains and stays silent on what is *out* invites someone to build it.

---

## 4. Boundary compliance for this workstream (AC-28)

WS-02 created files under `docs/architecture/` only. Nothing was created or modified under
`engineering/`, `.development-os/`, `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in
the product workspace `D:/os-test/dino-dash`, which was read only and not written.

None of the contract-allowed but Unit-1-unneeded top-level paths (`app`, `apps`, `packages`,
`services`, `database`, `migrations`, `infrastructure`) were created, per WS-01 §0 and **B-03**.

The house artifacts `engineering/architecture/system-context.md` and
`engineering/architecture/decisions/ADR-000-template.md` were read for format and left untouched; the
ADRs live under `docs/architecture/decisions/` as the write boundary requires.
