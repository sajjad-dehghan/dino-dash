# Unit 1 — architecture review notes, handoffs, and known risks

| Field | Value |
| --- | --- |
| Plan / workstream | `ENGPLAN-EVT-20260809-001` / WS-02, owner role ENG-02, producer actor `actor-eng-02` |
| Request | `DEVREQ-EVT-20260809-001` |
| Gate | `GATE-ARCHITECTURE` (`required: true`, owner ENG-02) |
| Authored | 2026-08-10 |

---

## 1. `GATE-ARCHITECTURE` evidence

`engineering/quality/gates.json` requires two evidence kinds for this gate. **ENG-02 does not
disposition its own gate** — the evidence is recorded here and the disposition is ENG-15's at WS-14.

| Required evidence | Artifact |
| --- | --- |
| architecture decision records | `docs/architecture/decisions/ADR-001` … `ADR-005` |
| system-boundary review | `docs/architecture/unit-1-system-impact.md` (§1 boundary, §3 what is out, §4 write-boundary compliance) |

Supporting: `docs/architecture/unit-1-ac-traceability.md`, and this document.

---

## 2. Handoff — what each downstream workstream must take from WS-02

**WS-12 / ENG-12 (next in sequence).** ADR-005. Specifically: no build step; a pinned dev-dependency
static server exposed as a script; `node --test` for the unit tier and `@playwright/test` for the
browser tier, both with a file-writing machine-readable reporter; Node ≥ 20; four separately stated
commands with the install step's network use called out distinctly from the game's zero network use;
Playwright config under `tests/`, **not** at the repository root; results under `tests/.results/` with
a nested `tests/.gitignore`; zero runtime dependencies, ever.

**WS-03 / ENG-03.** ADR-002 for the module layout, the entry point `src/index.html`, the canvas +
DOM-UI split, the transition table, and the reconstruct-on-restart rule. ADR-003 **exactly** for the
trace — field names, types, units, the `Z`-suffixed UTC convention, the append-once rule, the frozen
`window.dinoDash` accessor, and the prohibition on adding an unload handler or any anti-tamper
mechanism. ADR-004 for emitting the state signal from `transition()` and for `palette.js` as the sole
source of every colour. Two rules that are easy to break silently: **nothing under `src/game/**`,
`src/trace/**`, `src/engine/clock.js` or `src/render/palette.js` may reference the DOM**, and **no
colour literal may appear outside `palette.js`**.

**WS-10 / ENG-10.** The tier split in ADR-005 §3, including the static WCAG computation over the
palette in the unit tier. `window.dinoDash.getBackgroundVariations()` is the enumeration source for
AC-16/AC-17 completeness — iterate it, do not guess. `data-game-state` plus `dino-dash:statechange`
are the collection surface for the AC-26 key sweep, and must be paired with a DOM assertion that no
other view exists. The injected clock is the AC-21 substitute if the OS clock cannot be changed, and
must be disclosed as a substitute.

**WS-13 / ENG-14.** ADR-003 is the source for AC-29. The test the documentation must pass: a Unit 3
author predicts the three field names, types and units from the documentation alone, without opening
the run loop.

**WS-09 / ENG-09.** Zero runtime dependencies — the SBOM and audit cover the dev toolchain only, and
nothing third-party reaches the browser. The client-side score-tamperability risk is **already
accepted by the product owner, bounded to Units 1 and 2**; it is to be noted, not re-accepted, and
not mitigated in Unit 1.

**WS-14 / ENG-15.** AC-01 is single-engine by `DEC-20260809-001`; verify against ADR-001 and that
record, not against the exported AC-01 verification sentence.

---

## 3. Known risks and limitations

**AR-01 — `endedAt` offset interpretation is unsettled and it is on the Unit 3 seam.** ADR-003 reads
AC-19's "ISO-8601 string with an explicit UTC offset" as UTC with the literal `Z` designator. A
verifier requiring a numeric `±HH:MM` local offset would find `Z` insufficient. The code change is
trivial; the contract change is not, because Unit 3 inherits whichever is chosen. **Settle before
ENG-03 implements.** Owner: raised by ENG-02, resolvable by ENG-15's reading or by Product Operations
if the two readings persist.

**AR-02 — the trace is entirely forgeable and that is the accepted design.** Every field is produced
by the client. The record attests to nothing. Recorded so no later reader mistakes shape for
integrity, and so no one adds a checksum believing it helps. Accepted by the product owner
(`APR-870DC901FD68`, restated in `DEC-20260809-001`), bounded to Units 1 and 2, with server-side
validation required from Unit 3 and to be designed at Unit 3.

**AR-03 — the state signal is a claim by the implementation, not independent proof.** A view that
never updated `data-game-state` would not appear in the AC-26 sweep. Mitigation is procedural and
belongs to ENG-10: pair the signal with a DOM assertion that no leaderboard, table, catalogue,
settings, profile, lobby or presence view exists in the document.

**AR-04 — the palette-as-single-source rule is unenforced by tooling.** One hex literal in CSS or in
the renderer silently invalidates the completeness claim behind AC-16/AC-17. Mitigation: an automated
assertion (no colour literal outside `palette.js` and the custom-property block it feeds) plus an
ENG-01 review item under `GATE-CODE-REVIEW`.

**AR-05 — `node_modules` cannot be git-ignored from inside the write boundary.** No root `.gitignore`
exists at the base revision and the repository root is not a writable path. Handling: never `git add`
it, and build the AC-28 inventory from the workstream commits on `codex/evt-20260809-001` per WS-01
**B-07**. If ENG-12 concludes a root `.gitignore` is necessary, that is a write outside both the
narrowed set and the contract's `allowedPaths` and must be **escalated to Product Operations, not
created quietly**.

**AR-06 — the opaque-plate rule constrains visual design, and AC-18's judgement half is the owner's.**
No text over a translucent scrim and no colour tweening on sampled surfaces. If the owner judges the
result insufficiently "modern and colourful" under `final_user_visible_acceptance`, the remedy is more
saturated enumerated palettes and richer motion/shape — **not** relaxing the opacity or enumeration
rules, which would reopen AC-16/AC-17 completeness.

**AR-07 — no non-visual representation of gameplay.** The canvas is `aria-hidden` and conveys the
play field visually only. No acceptance criterion requires a screen-reader-accessible representation
of gameplay, and Unit 1's accessibility obligations are keyboard operability and contrast. This is a
**recorded limitation, not a satisfied requirement**, and it is the right place for a later unit to
improve if the owner directs it.

**AR-08 — the performance requirement remains unquantified.** No numeric frame-rate or
input-latency budget exists in any artifact; the contract's NFR is explicitly UNKNOWN. Architecture
makes the score frame-rate independent (delta-time simulation with a clamped step) and asserts no
budget. Carried open, consistent with WS-01 **R-02**. ENG-02 did not invent a target.

---

## 4. What ENG-02 did not do

- **No game code.** No file under `src/` or `tests/` was created. Every path named in ADR-002 §4 and
  ADR-005 is a specification for WS-03 and WS-12, not an existing file.
- **No `package.json`, no lockfile, no CI workflow.** ADR-005 states the tooling *decision and its
  constraints*; ENG-12 owns the artifacts, the exact package selections, the versions and the scripts.
- **No verification disposition.** WS-02 records `not_applicable`. Only ENG-15 at WS-14 issues a real
  disposition, and it is neither pre-empted nor predicted here. ENG-02 also does not disposition its
  own `GATE-ARCHITECTURE` — §1 records evidence, not a pass.
- **No product decision.** The AC-01 amendment applied in ADR-001 is the product owner's, recorded and
  attributed in `DEC-20260809-001`; ENG-02 transcribed and applied it and decided nothing about scope.
  Where the contract carries a question open — the performance budget, AC-18's judgement half, the
  Gecko item — it is carried open.
- **No re-mapping of WS-01's work.** The AC-to-workstream table, the dependency register and the
  blocker list in `docs/engineering/WS-01-coordination.md` stand unchanged and are cited, not
  restated.
- **No write outside the boundary.** WS-02 created eight files, all under `docs/architecture/`.
  Nothing under `engineering/`, `.development-os/`, `DEVELOPMENT.md`, `development-os.config.json`, or
  anywhere in `D:/os-test/dino-dash`, was created or modified; the product workspace and the
  `engineering/` house artifacts were read only.
