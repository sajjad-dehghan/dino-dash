# WS-01 — Engineering Coordination

| Field | Value |
| --- | --- |
| Plan | `ENGPLAN-EVT-20260809-001` |
| Request | `DEVREQ-EVT-20260809-001` (digest `6586f10d8f0738c352008388ffb207da437c577a2579456a63807316bd43a926`) |
| Workstream | WS-01, owner role ENG-01, producer actor `actor-eng-01` |
| Branch / base revision | `codex/evt-20260809-001` @ `32d94b5` |
| Scope | Unit 1 only. Units 2–5 are not contracted and are not pre-cleared anywhere in this document. |
| Authored | 2026-08-10 |

This is a working register for the workstreams that follow. It sequences them, records what each one
needs from an earlier one, maps every acceptance criterion to an owner, and lists the blockers that
are live right now. It contains no game code, no verification disposition and no product decision.

---

## 0. What Unit 1 actually is

One static browser game, served from a single entry point under `src/`. Three states: idle, running,
run-end. No backend, no database, no network at runtime, no identity, no persistence, no second
character. That shape — not the breadth of the plan's fourteen workstreams — decides which
workstreams have work.

Two consequences that drive everything below:

1. Only **WS-03** writes game code. Everything else is decision, tooling, review, evidence or documentation.
2. Five workstreams have **no work at all** and must record `not_applicable`. `not_applicable` is a
   recorded disposition, not an omission — WS-09 and WS-10 declare dependencies on them and cannot
   start until those runs exist.

### Declared write boundary for this delivery

The contract's `writeBoundary.allowedPaths` lists thirteen entries. Unit 1 needs six. ENG-01 narrows
the operating set for this delivery:

| Status | Paths |
| --- | --- |
| In use | `src/`, `tests/`, `docs/`, `.github/`, `package.json`, `package-lock.json` |
| Allowed by contract, **not to be created** | `app`, `apps`, `packages`, `services`, `database`, `migrations`, `infrastructure` |
| Prohibited (contract) | `.git`, `node_modules`, `.env`, `secrets`, `production-data` |
| Prohibited (engineering-owned, AC-28) | `engineering/**`, `.development-os/**`, `DEVELOPMENT.md`, `development-os.config.json` |
| Prohibited (other repository) | anything under `D:/os-test/dino-dash` |

Creating an unused allowed directory is not a boundary breach, but it inflates the AC-28 changed-file
inventory and costs review time. Do not scaffold what Unit 1 does not use.

---

## 1. Execution sequence

Dependencies below are the plan's own declared edges; the ordering within a dependency tier is ENG-01's.

| Order | WS | Role | Plan deps | Work in Unit 1 | Why here |
| --- | --- | --- | --- | --- | --- |
| 1 | WS-02 | ENG-02 Solution Architecture | WS-01 | **Real** | Everything downstream reads its decisions. Must fix: module layout under `src/`, rendering approach, the three-state machine and its reset semantics, the score-trace field contract, and the monotonic time source. `GATE-ARCHITECTURE` is required. |
| 2 | WS-12 | ENG-12 DevEx & Delivery | WS-02 | **Real** | Must land before WS-03 and WS-10, not after. It creates `package.json`, the lockfile, the test command and any CI workflow. WS-03 needs somewhere to put tests; WS-10 needs a command that runs; AC-30 needs both to work from a clean checkout. |
| 3 | WS-03 | ENG-03 Frontend & Accessibility | WS-02 | **Real** | The entire game. Owns 22 of the 30 acceptance criteria. Longest single piece of work in the plan. |
| 4 | WS-04 | ENG-04 Backend/API | WS-02 | `not_applicable` | There is no server, no API and no integration. AC-24 forbids any runtime network call. `GATE-API-COMPATIBILITY` is `required: false`. Record and move on. |
| 4 | WS-05 | ENG-05 Client Applications | WS-02 | `not_applicable` | Delivery target is a desktop browser page, which is ENG-03's domain. No mobile app, no desktop app, no packaging, no store, no client lifecycle. |
| 4 | WS-06 | ENG-06 Database & Storage | WS-02 | `not_applicable` | AC-22 and AC-23 forbid persistence of any kind — no store, no schema, no migration, nothing to back up. `GATE-DATABASE` is `required: false`. |
| 4 | WS-07 | ENG-07 Data, Analytics & AI | WS-02 | `not_applicable` | The score trace is an in-page array discarded on unload and transmitted nowhere. It is not an analytics contract and no pipeline exists. No model, no telemetry event, no data classification beyond "none collected". |
| 4 | WS-08 | ENG-08 Platform, Cloud & Network | WS-02 | `not_applicable` | No infrastructure, no deployment target, no DNS/TLS/CDN/queue, no cost surface. The delivery is files in a checkout. `GATE-INFRA-NETWORK` is `required: false`. |
| 4 | WS-11 | ENG-11 SRE, Observability & Performance | WS-02 | `not_applicable`, with one carried note | No service to observe, no SLO, no error budget, no incident surface. The contract's performance NFR is explicitly UNKNOWN with no numeric budget, and no acceptance criterion asserts one, so nothing here is testable. The only legitimate output is a limitation record: frame-rate and jump-timing fairness remain unquantified and are **not** a Unit 1 exit condition. ENG-11 must not invent a budget. |
| 5 | WS-09 | ENG-09 Security, Privacy & Compliance | WS-02..08, 11, 12 | **Real, thin** | `GATE-SECURITY` and `GATE-SUPPLY-CHAIN` are both required, so this cannot be skipped even though the attack surface is one static page. Genuine work: dependency audit and SBOM over whatever ENG-12 pinned (dev-only toolchain), secret scan, and confirmation that AC-22/23/24/25 hold as review findings. Must **not** re-accept the client-side score-tamperability risk — the owner already accepted it, bounded to Units 1 and 2. |
| 6 | WS-10 | ENG-10 Quality Engineering | WS-03..08, 11, 12, 09 | **Real** | `GATE-AUTOMATED-TESTS` required. Automated tests with machine-readable results, plus the stated accessibility-evidence procedure for AC-12, AC-14, AC-16, AC-17. Last producer of evidence before documentation. |
| 7 | WS-13 | ENG-14 Technical Documentation | WS-02..08, 11, 12 | **Real** | `GATE-DOCUMENTATION` required, and WS-13 owns AC-29 outright. Sequenced after WS-10 in practice even though the plan does not force it, because documenting behaviour that the tests have not yet exercised risks documenting unverified behaviour — which ENG-14 is explicitly forbidden from doing. |
| 8 | WS-14 | ENG-15 Independent Verification | all | **Real** | Verifies last and **changes nothing**. Reproduces claims, inspects evidence, issues the single verification disposition for the delivery. It is the only workstream that may do so. |

### Not in the plan

`GATE-SEO` exists in `engineering/quality/gates.json` (owner ENG-13, `required: false`) but appears in
neither the plan's `qualityGates` list nor as a workstream. There is no ENG-13 run to expect. A static
game page with no discovery requirement in any acceptance criterion needs none. Recorded so ENG-15
does not look for a missing artifact.

### Required-gate coverage check

Every gate with `required: true` lands on a workstream that has real work. Verified against
`gates.json`: ARCHITECTURE → WS-02, CODE-REVIEW → WS-01, AUTOMATED-TESTS → WS-10, SECURITY and
SUPPLY-CHAIN → WS-09, DOCUMENTATION → WS-13, INDEPENDENT-VERIFICATION → WS-14. No required gate is
owned by a workstream recording `not_applicable`.

---

## 2. Dependency and blocker register

| # | Consumer | Needs | From | Kind | Why it matters |
| --- | --- | --- | --- | --- | --- |
| D-01 | WS-03 | Module layout under `src/`, entry-point path, rendering approach | WS-02 | Hard | AC-01 requires a single entry point under `src/`; where it lives is an architecture decision, not a coding preference. |
| D-02 | WS-03 | Score-trace field contract: names, types, units, timezone convention | WS-02 | Hard | ENG-02 decides it, ENG-03 implements it, ENG-14 documents it (AC-29). Three workstreams must agree on one artifact. If ENG-03 invents field names ahead of the ADR, AC-29 fails on a documentation/behaviour mismatch. |
| D-03 | WS-03 | Monotonic time source decision (AC-21) | WS-02 | Hard | AC-21 forbids differencing two wall-clock readings. This is a stated architectural constraint, and AC-21's verification inspects the implementation reference for the source used. |
| D-04 | WS-03 | Three-state machine and its reset semantics | WS-02 | Hard | AC-13 (complete reset) and AC-26 (exactly three reachable states) are both properties of the state model, not of any single handler. |
| D-05 | WS-03, WS-10 | A runnable test command and pinned dependencies | WS-12 | Hard | ENG-10's tests cannot exist before there is a command that runs them. This is the single most important ordering constraint in the plan and the plan's own edges do not express it — WS-10 depends on WS-12, but WS-03 does not, and WS-03 writes first. |
| D-06 | WS-10 | The built game at a fixed revision | WS-03 | Hard | Nothing to assert against otherwise. |
| D-07 | WS-10 | Which accessibility criteria need an evidence procedure | WS-03 | Soft | ENG-03 owns AC-12/14/16/17; ENG-10 produces the reproducible evidence for them under AC-30. Split ownership needs an explicit handshake or contrast measurements get taken twice with different methods. |
| D-08 | WS-09 | Dependency set and lockfile | WS-12 | Hard | No SBOM or audit is possible before dependencies are pinned. The plan already encodes this edge. |
| D-09 | WS-09 | Recorded runs from WS-04..08 and WS-11 | those | Procedural | The plan makes WS-09 depend on all of them. `not_applicable` runs still have to exist as records or WS-09 is formally blocked on nothing. |
| D-10 | WS-13 | The ADR for the score-trace contract | WS-02 | Hard | AC-29 requires a Unit 3 author to predict the three field names, types and units from documentation alone, without reading the run loop. |
| D-11 | WS-13 | Test and accessibility evidence | WS-10 | Soft | ENG-14 must not document unverified behaviour as complete. |
| D-12 | WS-14 | Every prior run record, evidence artifact and the delivery revision | all | Hard | ENG-15 verifies last, edits nothing, and cannot verify its own work. |
| D-13 | WS-01 | Changed-file inventory from every workstream | all | Hard | `GATE-CODE-REVIEW` is ENG-01-owned and its evidence is the changed-component inventory. AC-28 is checked against it. |

---

## 3. Traceability — 30 acceptance criteria to workstreams

Each criterion appears exactly once. "Owner" is the workstream whose deliverable the criterion is
checked against; "contributes" names workstreams without which the owner cannot satisfy it.

| AC | Subject | Owner | Contributes |
| --- | --- | --- | --- |
| AC-01 | Entry point under `src/`, playable, zero console errors, two browsers | WS-03 | WS-12 (opens from a clean checkout) |
| AC-02 | Idle instruction on screen, run starts by keyboard alone | WS-03 | — |
| AC-03 | One Space press while grounded = exactly one jump | WS-03 | — |
| AC-04 | Up Arrow identical to Space, both always active | WS-03 | — |
| AC-05 | No browser default action; page does not scroll | WS-03 | — |
| AC-06 | Cactus contact ends the run; score stops | WS-03 | — |
| AC-07 | Only cactus contact ends the run | WS-03 | — |
| AC-08 | Score visible throughout, starts at zero, never decreases | WS-03 | — |
| AC-09 | Run-end score equals last in-run value | WS-03 | — |
| AC-10 | Restart with no page reload; new score zero | WS-03 | — |
| AC-11 | Run-end restart instruction, keyboard-operable | WS-03 | — |
| AC-12 | Whole journey completable keyboard-only | WS-03 | WS-10 (reproducible evidence, AC-30) |
| AC-13 | Restart resets score, position, obstacles completely | WS-03 | WS-02 (state/reset model) |
| AC-14 | Visible focus, predictable order, no focus trap | WS-03 | WS-10 (evidence) |
| AC-15 | Every key with an effect is named on screen | WS-03 | WS-10 (exhaustive key enumeration) |
| AC-16 | Text contrast ≥ 4.5:1 in every state and background | WS-03 | WS-10 (measurement evidence) |
| AC-17 | Character, cacti, ground line ≥ 3:1 | WS-03 | WS-10 (measurement evidence) |
| AC-18 | Colour-bearing, ≥ 3 distinct saturated hues — **objective half only** | WS-03 | WS-10 (pixel sampling). Judgement half is the human product owner's under `final_user_visible_acceptance`; no engineering workstream can close it. |
| AC-19 | Trace record carries `score`, `endedAt`, `sessionLengthMs` | WS-03 | WS-02 (field contract), WS-10 (assertions) |
| AC-20 | Trace `score` matches display; `sessionLengthMs` within 250 ms | WS-03 | WS-10 (tolerance test) |
| AC-21 | `sessionLengthMs` from a monotonic source, clock-change safe | WS-02 | WS-03 (implements), WS-10 (evidence) |
| AC-22 | Traces accumulate in page memory, observable, discarded on unload | WS-03 | WS-10 (storage assertions), WS-09 (review) |
| AC-23 | Persists nothing; reload equals a first visit | WS-03 | WS-09 (review) |
| AC-24 | No network after initial asset load; playable offline | WS-03 | WS-09 (review), WS-12 (no external asset host) |
| AC-25 | No identity surface anywhere, including in the trace | WS-03 | WS-09 (review) |
| AC-26 | Exactly three reachable states | WS-03 | WS-02 (state machine) |
| AC-27 | Exactly one character, no catalogue, no balance | WS-03 | — |
| AC-28 | Every changed file inside the write boundary | WS-01 | every workstream complies; WS-14 confirms independently — ENG-01 may not certify its own claim |
| AC-29 | Score-trace field contract documented findably for a Unit 3 author | WS-13 | WS-02 (source decision), WS-03 (behaviour must match) |
| AC-30 | Reproducible test command + accessibility evidence procedure | WS-10 | WS-12 (the command and the clean-checkout path) |

Counts: WS-03 owns 22, WS-02 owns 1, WS-01 owns 1, WS-10 owns 1, WS-13 owns 1 — plus AC-18's
judgement half, which leaves engineering entirely. Total 30, each once.

---

## 4. Blockers, risks and open items

**B-01 — AC-30 needs a command that runs from a clean checkout, and nothing runnable exists yet.**
The repository at `32d94b5` has no `package.json`, no lockfile, no test runner and no CI workflow.
AC-30 requires a *stated command* that runs from a *clean checkout of the delivery revision* and emits
machine-readable results. Two traps: (a) if ENG-10 writes tests before ENG-12 lands the command, the
evidence is not reproducible by anyone else; (b) a clean checkout will need a dependency install step,
which touches the network at *install* time. That is not an AC-24 violation — AC-24 governs the
running game, not the toolchain — but the two must be stated separately in the evidence or a verifier
will read them as contradictory. ENG-12 should state the install command and the test command as
distinct steps, and prefer a dependency set small enough that the game itself has zero runtime
dependencies. Owner: WS-12, then WS-10. Live until WS-12 records a run.

**B-02 — AC-28 and AC-30 read against each other, and the reading matters.**
AC-30 requires evidence recorded under `.development-os/evidence/`. AC-28 prohibits any file under
`.development-os/` being created or modified. They are consistent only under AC-28's own qualifier:
the prohibition is on creation *by application code*. Evidence deposition is a development-OS
operation performed by the delivery process, not by the game. ENG-01 records this reading and does
not have authority to settle it beyond that: if ENG-15 reads AC-28 as an absolute path prohibition,
the conflict is a contract defect and must be escalated to Product Operations, not resolved inside a
workstream. Live for the whole delivery.

**B-03 — the contract's `writeBoundary` is wider than Unit 1 needs.**
Seven allowed top-level paths (`app`, `apps`, `packages`, `services`, `database`, `migrations`,
`infrastructure`) correspond to no Unit 1 work. Creating any of them passes the AC-28 assertion while
producing scaffolding for a system that does not exist, inflating the changed-file inventory ENG-01
must review under `GATE-CODE-REVIEW` and giving ENG-15 unexplained paths to reconcile. Section 0
narrows the operating set. This is a coordination constraint, not a contract amendment — ENG-01
cannot narrow the contract itself.

**B-04 — AC-18's judgement half cannot be closed by engineering, and AC-18 is flagged conditional.**
The contract records (ISS-20260809-028) that "modern and colourful" is absent from the
`approvals.json` rationale of APR-870DC901FD68 and rests on an unverified producer record. Engineering
can measure hue count and saturation; whether the result is acceptable is the owner's under
`final_user_visible_acceptance`. No workstream may record AC-18 as passed in full, and ENG-15 must
report it as partially dispositioned.

**B-05 — AC-21's stated verification may not be executable in this environment.**
It calls for changing the operating-system clock by one hour mid-run. If that is not permitted where
the delivery is executed, ENG-10 must disclose the limitation and substitute an inspectable
alternative (a fake/controlled clock in test, plus the implementation reference AC-21 already allows),
and must not report the substitute as the manual procedure. Missing evidence is a gap, never an
invented pass.

**B-06 — AC-01 requires two browser families.**
Chromium-based *and* Gecko-based, both at 100% zoom, with recorded name and version. If only one
engine is available at execution time, AC-01 is partially evidenced and must be recorded as such.

**B-07 — pre-existing working-tree state must not be attributed to this delivery.**
At the point WS-01 began, `engineering/taskboard/workstreams.csv` was already modified and three
`.development-os/` files were untracked, all products of the plan-intake step rather than of any
workstream. AC-28's verification asks for "the changed-file inventory for the delivery revision".
That inventory must be built from the workstream commits on `codex/evt-20260809-001`, not from
`git status`, or the intake bookkeeping will be misread as an application-code boundary breach.

**R-01 — split ownership of the accessibility criteria.** ENG-03 owns AC-12/14/16/17; ENG-10 owns the
reproducible evidence for them under AC-30. Without D-07's handshake, contrast gets measured twice by
two methods and the numbers disagree.

**R-02 — the performance requirement has no threshold and no owner who can supply one.** Carried
open from DD-0001 and unclosed. WS-11 is `not_applicable` precisely because there is nothing testable;
that is a recorded gap, not a pass, and it stays open into later units.

**R-03 — five `not_applicable` runs sit on WS-09's and WS-10's dependency lists.** If any of them is
simply not run, the two required-gate workstreams are formally blocked by an absent record rather
than by real work. Sequence position 4 exists to prevent that.

**R-04 — ENG-01 cannot certify its own coordination.** `roles.json` forbids it, so WS-01's
verification disposition is `not_applicable` and this register's accuracy is itself a WS-14 item.

---

## 5. What ENG-01 did not do

- **No application code.** No file under `src/` or `tests/` was created, and no game behaviour was
  designed, prototyped or implied. Rendering approach, framework, module layout and test framework
  are ENG-02's and ENG-12's to choose; the contract explicitly leaves method to engineering and this
  document names none.
- **No verification disposition.** WS-01 records `not_applicable`. Only ENG-15 at WS-14 issues a real
  disposition for this delivery, and it may not be pre-empted, predicted or partially anticipated here.
- **No product decision.** Scope, priority, risk acceptance and final user-visible acceptance belong to
  the human product owner. This register interprets the 30 acceptance criteria for sequencing purposes
  and adds none, removes none and reweights none. Where the contract carries a question open — the
  performance budget, AC-18's judgement half — it is carried open, not closed.
- **No gate waived.** Every gate marked `required: true` is assigned above. `not_applicable` is used
  only where the contract's own non-goals remove the work, never to route around a gate.
- **No write outside the boundary.** This delivery created exactly one file,
  `docs/engineering/WS-01-coordination.md`. Nothing under `engineering/`, `.development-os/`,
  `DEVELOPMENT.md`, `development-os.config.json`, or anywhere in the product workspace
  `D:/os-test/dino-dash`, was created or modified.
