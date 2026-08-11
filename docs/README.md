# Dino Dash — documentation index

Delivery documentation for **Unit 1** (`DEVREQ-EVT-20260809-001`, plan
`ENGPLAN-EVT-20260809-001`). Everything a reader needs is under `docs/`; nothing here requires
reading `src/`.

## Start here

| If you want to… | Read |
| --- | --- |
| **Build Unit 3 (the shared score table)** — field names, types, units, timezone, accessor | **[`score-trace-contract.md`](score-trace-contract.md)** |
| **Run the game, the tests, the accessibility evidence, the perf harnesses** | **[`runbook.md`](runbook.md)** |
| **Understand the delivery cold** — the three states, the DOM-free core, the palette rule, what is deliberately absent | **[`operating-overview.md`](operating-overview.md)** |

> **Unit 3 authors: the score-trace field contract is
> [`score-trace-contract.md`](score-trace-contract.md).** It states the three field names, their
> types, the unit of `sessionLengthMs`, the timezone convention of `endedAt`, the
> `window.dinoDash.getScoreTrace()` accessor, copy-on-read semantics, lifetime, and what the record
> is *not*. The normative decision behind it is
> [ADR-003](architecture/decisions/ADR-003-score-trace-field-contract.md).

## Architecture decisions (normative)

| ADR | Subject |
| --- | --- |
| [ADR-001](architecture/decisions/ADR-001-browser-target-and-runtime-baseline.md) | Browser target and runtime baseline |
| [ADR-002](architecture/decisions/ADR-002-unit-1-rendering-state-model-and-module-layout.md) | Rendering approach, state model, module layout, the DOM-free core |
| [ADR-003](architecture/decisions/ADR-003-score-trace-field-contract.md) | **The score-trace field contract** |
| [ADR-004](architecture/decisions/ADR-004-observability-affordances-state-signal-and-background-enumeration.md) | State signal and the closed background-variation enumeration |
| [ADR-005](architecture/decisions/ADR-005-build-and-test-toolchain.md) | Build and test toolchain |

Supporting architecture notes: [`architecture/unit-1-architecture-notes.md`](architecture/unit-1-architecture-notes.md),
[`architecture/unit-1-ac-traceability.md`](architecture/unit-1-ac-traceability.md),
[`architecture/unit-1-system-impact.md`](architecture/unit-1-system-impact.md).

## Workstream records

Under [`engineering/`](engineering/) — each is the record of one workstream, including what it did
**not** do and the risks it carries.

| Record | Subject |
| --- | --- |
| [WS-01](engineering/WS-01-coordination.md) | Coordination, dependencies, blockers |
| [WS-03](engineering/WS-03-implementation.md) | Implementation — `src/` is sealed here |
| [WS-04](engineering/WS-04-backend-review.md) · [WS-05](engineering/WS-05-client-review.md) | Backend (not applicable) · client review |
| [WS-06](engineering/WS-06-storage-review.md) · [WS-07](engineering/WS-07-data-review.md) | Storage (not applicable) · data |
| [WS-08](engineering/WS-08-platform-review.md) · [WS-09](engineering/WS-09-security-review.md) | Platform / network · security (findings **F-01**, **F-02**) |
| [WS-10](engineering/WS-10-quality-review.md) | Quality — the AC-by-AC coverage matrix and the browser-tier gap |
| [WS-11](engineering/WS-11-performance-review.md) | Performance and reliability — measurements, **no budgets** |
| [WS-12](engineering/WS-12-delivery-review.md) | Developer experience and delivery — the commands |
| [WS-13](engineering/WS-13-documentation.md) | Technical documentation — AC-29 and `GATE-DOCUMENTATION` |

Screenshots of the three background variations and a collision are in [`media/`](media/).

## Known gaps, in one place

These are **recorded gaps, not passes**. Detail and evidence in [`runbook.md`](runbook.md) §6 and
[`operating-overview.md`](operating-overview.md) §9.

1. **No browser tier.** A cold Playwright acquisition produced zero bytes in ten minutes. Fourteen
   criteria have partial or no machine evidence for this one reason.
2. **The rendered-pixel half of AC-16 / AC-17 is unmeasured** — the contrast command measures the
   declared palette only.
3. **The performance budget is unset and must not be invented.** `GATE-PERFORMANCE` and
   `GATE-RELIABILITY` are not engaged.
4. **WS-09 F-01 is guarded, not fixed** — the state machine's prototype-chain lookup; unreachable at
   this revision, characterised and containment-tested, and left in place because `src/` is sealed.
5. **`endedAt`'s `Z` designator is an open interpretation risk** against AC-19's "explicit UTC
   offset".
6. **AC-30 names AC-12 and AC-14**, and no command produces accessibility evidence for either;
   AC-14 has no substitute at all. The stated procedure is [`runbook.md`](runbook.md) §2.

## Boundary note

`README.md` and `BENCHMARK.md` at the repository root are the owner's and are not maintained by any
engineering workstream. Where they and these documents disagree, these documents state the revision
they were verified at.
