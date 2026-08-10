# ADR-001: Browser target and runtime baseline for Unit 1

- Status: accepted
- Request: DEVREQ-EVT-20260809-001
- Plan / workstream: ENGPLAN-EVT-20260809-001 / WS-02
- Owner: ENG-02
- Independent verifier: ENG-15
- Decided: 2026-08-10

## Context

AC-01 as exported in `.development-os/inbox/DEVREQ-EVT-20260809-001.json` requires the entry point to
be opened in "a current Chromium-based browser **and** a current Gecko-based browser … both must
pass". WS-01 carried that reading forward as blocker **B-06**.

That text is **superseded**. The product owner amended it, and the amendment is recorded and
attributed in `DEC-20260809-001` (product workspace file `events/DEC-20260809-001-owner-disposition.md`,
`decision_maker_actor_id: human-product-owner`, `decided_at: 2026-08-09T11:55:53Z`, status approved).
The operative text is:

> **One browser is sufficient, and it is Chromium.** Gecko support is an **open item**, not a Unit 1
> acceptance criterion. No run may be blocked or failed for missing Gecko evidence.

`DD-0007-result.json` and the exported AC-01 verification text are immutable under
`historical_record_mutation_allowed: false`; they are superseded on this point, not rewritten. This
ADR exists so that the next reader — ENG-03, ENG-10, ENG-14, ENG-15 — does not re-derive the
amendment from the raw contract and re-open B-06.

The second premise: the entry point must be a single file under `src/` (AC-01), all initial requests
must be same-origin static assets, and there must be zero requests after initial load (AC-24).

## Options considered

1. **Target Chromium only; design against no engine-specific API.** Evidence is captured on one
   engine. Gecko is neither claimed nor designed against.
2. **Target Chromium and Gecko anyway.** Doubles the evidence surface, the browser download in CI,
   and ENG-10's run matrix, to satisfy a criterion the owner has withdrawn. Nothing in Unit 1 needs
   it.
3. **Target Chromium and use Chromium-only APIs freely** (e.g. `chrome.*`, non-standard CSS,
   experimental canvas features). Cheapest today, most expensive at the moment Gecko is re-opened.
4. **Open the entry point over `file://`.** Rejected on a hard technical fact, see Decision.

## Decision

**Target: current Chromium, one engine. Runtime baseline: native ES modules served over a local
static HTTP origin. No engine-specific API anywhere in the delivery.**

1. **Engine.** Chromium only. ENG-10 records the exact browser name and version used for evidence.
   The Chromium bundled by the browser-automation toolchain (ADR-005) is the reference build, because
   it pins the version reproducibly from a clean checkout.
2. **No Gecko evidence is required**, no run may be blocked or failed for its absence, and no
   workstream may record Gecko support as passed, failed, or attempted unless it actually ran.
   Gecko is carried as an **open item** for a later unit.
3. **API floor.** Only APIs that are baseline across current Chromium *and* current Gecko may be
   used: ES modules, `<canvas>` 2D context, `requestAnimationFrame`, `performance.now()`,
   `KeyboardEvent.code`, `dataset`, `CustomEvent`, `Object.freeze`. This costs nothing today and
   keeps the open item cheap to close later. It is a **design constraint, not a support claim**.
4. **Delivery is served, not opened from disk.** The entry point is `src/index.html`, loaded from a
   local static HTTP server at a localhost origin. `<script type="module">` under `file://` is
   blocked by the module CORS rules in Chromium and emits a console error, which fails AC-01
   directly. AC-24's own verification text ("all are same-origin static assets") already presumes an
   HTTP origin, so this is the contract's expectation, not an addition to it.
5. **No runtime dependency of any kind.** The game ships zero third-party code. Every asset is
   generated in code (canvas drawing, CSS) — no font file, no sprite sheet, no CDN, no external
   image. This is what makes AC-24's "zero further requests" true by construction rather than by
   inspection.

## Consequences and trade-offs

- **AC-01 becomes single-engine.** ENG-15 must verify against this ADR and `DEC-20260809-001`, not
  against the exported AC-01 verification sentence. If ENG-15 reads the exported text as still
  binding, AC-01 is partially evidenced and the disagreement is a contract-export defect to escalate
  to Product Operations — not something a workstream may settle.
- **A static server is now part of the delivery's runnable surface.** ENG-12 must provide it as a
  stated command (ADR-005). It runs at play time and at test time; it is not shipped to any user and
  is not part of the game.
- **The API floor may look like over-engineering for a one-engine target.** It is deliberate: the
  cost is zero (nothing Unit 1 does needs a modern-only or vendor API) and it means the open Gecko
  item is a testing task later, not a rewrite.
- **Zero runtime dependencies removes a whole class of supply-chain surface** from ENG-09's review:
  the SBOM covers the dev toolchain only, and nothing third-party reaches the browser.

## Migration, rollback, and evidence

- **Evidence:** this ADR; `DEC-20260809-001`; the browser name and version ENG-10 records with the
  browser-tier test results; the network panel / route log showing same-origin static assets only.
- **Rollback:** none required — no infrastructure, no data, no deployed state. Reverting the ADR
  reverts a document.
- **Re-opening Gecko** is additive: run the existing browser-tier suite against a second engine. It
  requires no source change if item 3 held. That is the test of whether item 3 was honoured.
