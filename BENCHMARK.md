# Architecture vs. Raw Prompt: A Controlled Sonnet Case Study

> **What this compares:** two implementations produced by the same model family, Claude Sonnet, from the same product prompt. The experimental variable is the development system around the model—not the model itself.

---

## ⚠️ Revision notice — 2026-08-11

**The visual comparison in the first version of this document was not evidenced, and has been withdrawn.**

The original scorecard awarded the direct-prompt baseline **91/100** for *Graphics, animation, and visual identity* against **76/100** for the Operations OS implementation, and described the baseline as "the more feature-rich and visually ambitious prototype."

That score was inferred from a **feature list** — parallax scenery, day/night transitions, a bird obstacle — not from anything that was actually seen rendered. The document's own limitation 4 said as much: *"the evaluator's in-app browser connection was unavailable during the comparison."* A visual score assigned without seeing either game render is not a measurement; feature count is not visual quality.

What changed in this revision:

| | Before | After |
| --- | --- | --- |
| Graphics category | Scored 76 vs 91 | **WITHDRAWN — unscored** |
| UX and accessibility | Scored 78 vs 87 | **Scored for one side only — flagged** |
| Automated tests (Operations OS) | 61 | **114** (the figure was stale, not wrong when written) |
| Screenshots | None | Four real frames, Operations OS variant only |

**The correction moves the headline gap in this project's own favour**, from 19 points to 25. That is a structural consequence of withdrawing a category the baseline won, not a new finding, and it is stated here rather than buried precisely because it flatters the author. Both totals appear below; neither is "the" answer.

**What is still missing:** the baseline was never seen rendered, and it is not available on disk to this reviewer. Its graphics therefore remain **unassessed** — not poor, not good, unassessed. The experiment owner reports that the baseline's graphics are in fact weak; that is recorded below as their unverified observation, and is deliberately **not** converted into a score.

---

## Executive summary

This case study compares two ways of using Sonnet to build the same browser game:

| Variant | Execution mode |
| --- | --- |
| **Baseline** | The product prompt was sent directly to Sonnet, with no prescribed architecture, roles, workstreams, or quality gates. |
| **Operations OS** | The same product prompt was processed by the author's Product/Development Operations OS: explicit roles, staged workstreams, acceptance criteria, architecture decisions, implementation boundaries, and verification gates. |

An independent code-oriented assessment scored the Operations OS implementation **88/100** against **63/100** for the direct-prompt baseline, over the eight categories that carry evidence. The baseline produced the more feature-rich prototype; the Operations OS produced the substantially stronger engineering system. **Which of the two looks better on screen is not established by this study** — see the revision notice above.

This is a **single controlled case study**, not a universal ranking of Sonnet, agent frameworks, or software-development methods.

## Result at a glance

| Outcome | Operations OS | Direct prompt |
| --- | ---: | ---: |
| Weighted score, evidenced categories only | **88/100** | **63/100** |
| *Original score, including the withdrawn visual category* | *86/100* | *67/100* |
| Automated tests found | **114** | **0** |
| Automated tests passing | **114/114** | N/A |
| Application source files | **18** | **3** |
| Application source lines | **1,329** | **698** |
| Test files | **14** | **0** |
| Test lines | **2,286** | **0** |
| Runtime dependencies | **0** | **0** |
| Architectural decision records | **5** | **0** |
| Git repository/history in evaluated delivery | Yes | No |
| **Rendered output actually observed by the evaluator** | **No** | **No** |

File and line counts are descriptive, not quality signals by themselves. The important difference is that the Operations OS output separated the simulation from browser concerns and made the game logic independently executable and testable.

The last row is the one that invalidated the original visual comparison. It is kept in the table so that a reader cannot reach the scorecard without passing it.

## Weighted scorecard

The same rubric was applied to both deliveries. Scores are percentages; the final score is the weighted sum.

| Category | Weight | Operations OS | Direct prompt | Advantage |
| --- | ---: | ---: | ---: | --- |
| Architecture and separation of concerns | 16% | **93** | 55 | Operations OS |
| Frontend code quality | 16% | **91** | 68 | Operations OS |
| Game logic and physics | 14% | **89** | 78 | Operations OS |
| ~~Graphics, animation, and visual identity~~ | — | *withdrawn* | *withdrawn* | **unassessed** |
| UX and accessibility | 11% | **78** ⚠️ | 87 ⚠️ | *see note* |
| Product completeness and features | 11% | 67 | **91** | Direct prompt |
| Testing, reliability, and regression control | 14% | **96** | 25 | Operations OS |
| Maintainability and extensibility | 9% | **92** | 57 | Operations OS |
| Security, privacy, and attack surface | 4.5% | **92** | 68 | Operations OS |
| Process, documentation, and execution discipline | 4.5% | **90** | 30 | Operations OS |
| **Weighted total, evidenced categories** | **100%** | **88** | **63** | **Operations OS** |

**Graphics — withdrawn, not re-scored.** Neither implementation was seen rendered. The original 76 vs 91 was inferred from a feature list. It is removed rather than reversed, because this reviewer has no more visual evidence about the baseline than the original evaluator did. The remaining weights are the original ones renormalised over 88%.

**⚠️ UX and accessibility — evidenced on one side only.** The Operations OS figure now rests on measurements: 33 contrast pairs computed from the palette source with 0 failures, a minimum text ratio of 11.91:1 against a 4.5:1 threshold and a minimum non-text ratio of 3.07:1 against 3:1, plus a keyboard-only journey test. The baseline's 87 rests on the same unevidenced inspection as the withdrawn graphics score, and its "coherent, colorful presentation" was never observed. Treat this row as **half-measured**: comparing a measured number against an inferred one is not a comparison.

Neither delivery contains a backend. Backend quality was therefore treated as **not applicable**, rather than assigning either implementation an artificial zero.

### Why the gap widened

Withdrawing a category that the baseline won mechanically widens the margin: 19 points becomes 25. This is arithmetic, not evidence. A reader who wants the most conservative reading should take the **original 86 vs 67**, treat the visual row inside it as unsupported, and conclude that the engineering gap is real while the product-and-presentation comparison is unresolved.

## What changed when the model was given an operating system?

### 1. The output became a system instead of a script

The direct-prompt implementation placed DOM access, persistence, audio, state transitions, physics, spawning, collision detection, rendering, input, and lifecycle handling in one JavaScript closure.

The Operations OS implementation created explicit boundaries:

```text
Browser shell
  main / keyboard / HUD / canvas renderer
                 |
                 v
DOM-free game core
  state machine / run state / simulation / physics
  obstacles / collision / score / trace / clock
```

The result is not better merely because it has more files. It is better because time and randomness can be injected, simulation can run without a browser, state transitions are explicit, and individual policies can be changed without rewriting the entire application.

### 2. Requirements became executable evidence

The Operations OS converted acceptance criteria into automated checks. The test suite verifies, among other things:

- state-machine closure and legal transitions;
- jump, gravity, landing, collision, and obstacle lifecycle;
- deterministic behavior with an injected random source;
- frame-rate-independent scoring and simulation behavior;
- restart isolation and monotonic score records;
- WCAG contrast across every declared palette variation;
- absence of network, persistence, identity, and unintended pointer paths;
- separation between the DOM-free core and browser APIs.

At evaluation time, `node --test` returned **61 passes and 0 failures**.

The direct-prompt version passed JavaScript syntax validation, but supplied no automated behavioral or regression tests. Its behavior therefore depends primarily on manual inspection.

### 3. The baseline optimized for visible product value

The direct-prompt result should not be described as simply “worse.” It made a different tradeoff and delivered more immediately visible features:

- pause and resume;
- pointer/touch input;
- synthesized sound and mute preference;
- persistent high score;
- multiple obstacle types, including a bird;
- parallax scenery;
- animated day/night transitions;
- automatic pause on page visibility changes;
- a Persian RTL interface.

That is why it won the product-completeness category, which counts shipped features and can be established from source.

**It did not "win graphics."** That claim has been withdrawn. Every item in the list above is a *feature that exists in the code*; none of them is evidence about how the result looks. Parallax scenery can be flat, a day/night transition can be muddy, and a bird can be a rectangle. Nobody looked.

For a short-lived demo, the baseline may still be the more attractive result — that is a live possibility, not a finding.

> **Experiment owner's counter-observation, recorded and unverified:** the owner reports that the direct-prompt baseline's graphics are in fact poor, and that the original assessment should have taken and compared screenshots before scoring the category. This reviewer could not check it — the baseline is not present on disk — so it is recorded as their statement and deliberately **not** converted into a score in either direction. Two unevidenced judgements do not make one evidenced one.

### 4. The Operations OS optimized for confidence under change

The structured implementation made narrower product choices, but created stronger evidence that future changes can be made safely. It included:

- acceptance-criteria traceability;
- architecture decision records;
- explicit ownership and workstream boundaries;
- immutable configuration and reconstruct-on-restart state;
- a single palette source of truth;
- documented risks and known limitations;
- machine-verifiable quality gates;
- zero runtime dependencies and no runtime network path.

This produced a **19-point overall advantage** and a **71-point advantage in testing/reliability** while using the same underlying model.

## Engineering findings

### Operations OS implementation

Strengths:

- clean separation between rendering, input, orchestration, and game simulation;
- deterministic core through injected time and randomness;
- comprehensive unit and whole-run integration coverage;
- explicit finite-state model;
- measurable accessibility constraints;
- strong privacy posture and minimal runtime attack surface;
- documentation that states unresolved risks instead of silently claiming completion.

Tradeoffs and limitations:

- process and documentation volume is high for a game of this size;
- the initial product slice has fewer player-facing features;
- gameplay is Canvas-based and is not conveyed non-visually to screen readers;
- the evaluated working tree still contained uncommitted/untracked delivery artifacts;
- some of the operating model is overpowered for a three-file prototype, even if it becomes valuable as the system grows.

### Direct-prompt implementation

Strengths:

- high visible feature density for a compact implementation;
- ~~coherent, colorful presentation~~ — **withdrawn: never observed rendered**;
- desktop and pointer/touch controls;
- useful product touches such as pause, audio, high score, and reduced-motion awareness;
- no external runtime dependency.

Tradeoffs and limitations:

- most responsibilities are coupled inside one 540-line JavaScript closure;
- no automated tests or test seams;
- direct use of time, randomness, DOM, audio, and storage makes isolated verification difficult;
- storage access has no failure handling and can prevent startup in restricted environments;
- no repository history was present in the evaluated delivery;
- extension of gameplay or platform behavior is likely to increase regression risk quickly.

## Visual evidence — one side only

These are real frames rendered by `src/render/canvas-renderer.js` driving the delivered simulation modules. They are not mockups, and they are **not a comparison** — no equivalent frame of the baseline exists.

| Dawn (score 0+) | Noon (score 100+) | Dusk (score 200+) |
| --- | --- | --- |
| ![](docs/media/dawn.png) | ![](docs/media/noon.png) | ![](docs/media/dusk.png) |

![Collision frame](docs/media/collision.png)

Captured by driving the real modules for a scripted run: 24 cacti cleared, score 282, 28.3 seconds, ending in a collision. Publishing them here establishes what the Operations OS variant looks like. It establishes **nothing** about the baseline, and the visual category stays withdrawn until someone renders both.

## Reproduction

### Operations OS variant

From the structured project root:

```bash
npm test
npm start
```

The first command should report **114 passing tests** and needs no `npm install` — the project has zero dependencies. The second serves the game on `http://localhost:4173`.

### Direct-prompt baseline

From the baseline directory:

```bash
node --check game.js
python -m http.server 8000
```

The syntax check should complete successfully. No project-supplied automated behavioral test command exists.

## Methodology and limitations

This benchmark is designed to answer a narrow question:

> What changed in one task when the same model and product prompt were used with and without a structured product/engineering operating system?

The assessment used static source review, repository inspection, executable syntax checks, and the project-supplied automated tests. The scorecard combines objective evidence—such as test results, dependency count, module boundaries, and repository state—with reviewer judgement for product, visual, and maintainability qualities.

Important limitations:

1. This is one task and two outputs, so it does not establish statistical significance.
2. It does not isolate token usage, wall-clock time, inference cost, hidden retries, or exact model version unless those are separately recorded.
3. “Same prompt” is reported by the experiment owner; the evaluator did not independently reconstruct the complete generation transcripts.
4. **The visual score has been withdrawn.** It was derived from source, styles, Canvas implementation and interaction design while the evaluator's browser connection was unavailable — that is, without either game being seen rendered. This was disclosed in the original document as a limitation but was nonetheless allowed to contribute 12% of the weighted total and to support the "visually ambitious" framing in the summary. Disclosing a limitation is not the same as not scoring on it. The category is now unscored, and the revision notice at the top records what changed.
5. The rubric rewards maintainability and regression control. A benchmark optimized only for demo speed or visible feature count would rank the baseline more favorably.
6. The comparison demonstrates the effect of the **whole workflow**—roles, decomposition, contracts, architecture, and gates. It does not identify which individual mechanism caused how much of the improvement.

## Conclusion

The case study does not show that one model beat another. **Sonnet produced both outputs.** It shows that the surrounding development system materially changed what the same model optimized for.

With a direct prompt, Sonnet produced a compact, attractive, feature-rich prototype. With the Operations OS, Sonnet produced a smaller product slice but a much stronger software-delivery system: explicit architecture, executable requirements, deterministic logic, traceable decisions, and 61 passing tests.

The practical conclusion is:

> A capable model can generate a convincing demo from a prompt. A capable model operating inside well-designed roles, contracts, workstreams, and quality gates is substantially more likely to generate software that a team can trust, verify, and extend.

For prototype speed, the direct approach remains useful. For software expected to evolve, the observed evidence favors the Operations OS.

---

**Assessment date:** 2026-08-10  
**Compared model:** Claude Sonnet for both variants  
**Independent weighted result:** Operations OS 86/100 · Direct prompt 67/100
