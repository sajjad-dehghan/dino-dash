# ADR-005: Build and test toolchain

- Status: accepted
- Request: DEVREQ-EVT-20260809-001
- Plan / workstream: ENGPLAN-EVT-20260809-001 / WS-02
- Owner: ENG-02
- Independent verifier: ENG-15
- Decided: 2026-08-10

> ENG-02 decides the *class of tooling and the constraints on it*. **ENG-12 (WS-12) owns the actual
> `package.json`, the lockfile, the exact versions, the npm scripts and any CI workflow; ENG-10
> (WS-10) owns test content.** This ADR exists because WS-01 sequences WS-12 before WS-03 and records
> **B-01**: AC-30 needs a stated command that runs from a clean checkout, and nothing runnable exists
> at the base revision.

## Context

AC-30: "a stated command runs the automated tests and produces machine-readable results, and a stated
command or procedure produces the accessibility evidence for AC-12, AC-14, AC-16 and AC-17", each
verified by running it **from a clean checkout of the delivery revision**.

AC-24 forbids network requests from the running game. AC-01 forbids console errors. AC-16 and AC-17
require *measured* ratios from *rendered* pixels. AC-28 constrains where files may be written.

## Options considered

**Build**

1. **No build step** — ship native ES modules exactly as authored. Chosen.
2. A bundler (Vite, esbuild, Rollup). Rejected: adds a dependency tree, a config file, and a `dist/`
   whose contents differ from the reviewed `src/`, which complicates the AC-28 changed-file inventory
   and gives ENG-15 two artifacts to reconcile. Unit 1 has no dependency to bundle and no module
   count that needs one.
3. Classic `<script>` tags, no modules. Rejected: kills the DOM-free testability boundary in ADR-002
   and makes the unit tier impossible without a shim.

**Unit test tier**

1. **Node's built-in `node:test` + `node:assert`, zero dependencies.** Chosen.
2. Vitest / Jest. Rejected: a large dependency tree and a transform pipeline bought for features this
   delivery does not use. Every dependency added is SBOM and audit surface for ENG-09 (WS-09).
3. jsdom-based DOM testing. Rejected: jsdom does not render, so it can evidence neither contrast nor
   a real console — and ADR-002's DOM-free core means there is nothing left for it to do.

**Browser tier**

1. **Playwright (`@playwright/test`) driving its bundled Chromium.** Chosen.
2. Puppeteer plus a separate runner and reporter. Comparable capability, more assembly: no built-in
   machine-readable reporter, no built-in screenshot/artifact handling, no `webServer` lifecycle.
3. Manual procedure only. Rejected: AC-30 requires a *command*, and manual pixel sampling across the
   AC-16/AC-17 matrix is neither reproducible nor cheap.
4. Selenium/WebDriver. Rejected: heavier setup, weaker pixel and console access.

## Decision

### 1. No build step

The delivered source **is** the running artifact. `src/index.html` loads `src/main.js` as
`<script type="module">`; the browser resolves the module graph. No transpiler, no bundler, no
minifier, no CSS pipeline, no generated directory. Consequences: the AC-28 inventory is the code that
runs; there is no build to reproduce; and the game itself has **zero runtime dependencies**.

### 2. Static server

A pinned **dev dependency** static file server, exposed as an npm script, serving the repository (or
`src/`) at a localhost origin with correct `text/javascript` MIME for `.js`. Required because
ES modules do not load over `file://` in Chromium (ADR-001). The same command backs Playwright's
`webServer` so play-time and test-time use one origin. ENG-12 selects and pins the package.

### 3. Two test tiers

| Tier | Runner | Scope | Machine-readable result |
| --- | --- | --- | --- |
| Unit | `node --test` (`node:test`, `node:assert`) | DOM-free modules: `src/game/**`, `src/trace/**`, `src/engine/clock.js`, `src/render/palette.js` | Node's built-in JUnit/TAP reporter written to a file |
| Browser | `@playwright/test`, bundled Chromium | The real page: console cleanliness, keyboard-only journey, focus, network, storage, pixel sampling, trace accessor | Playwright JSON and/or JUnit reporter written to a file |

**Node floor: Node 20 LTS or newer** (stable `node:test` and `--test-reporter`). ENG-12 states the
exact floor and records the version used.

What lands in each tier — this split is the reason the module layout is what it is:

- **Unit tier (no browser):** the transition table and its no-ops (AC-26 logic), `createRunState()`
  starting values (AC-13), score integer-ness and monotonicity (AC-08), collision geometry (AC-06,
  AC-07), the trace record shape and `endedAt` format (AC-19), `sessionLengthMs` derived from an
  **injected** clock including a wall-clock-jump scenario (AC-21 — the inspectable substitute WS-01
  anticipates under **B-05**), and the **static WCAG computation over every palette pair** (AC-16,
  AC-17 thresholds, per ADR-004).
- **Browser tier:** zero console errors on load (AC-01), keyboard-only journey with no pointer events
  (AC-02–AC-05, AC-10–AC-12), focus visibility and order (AC-14), `performance.getEntriesByType("navigation")`
  length after restarts (AC-10), storage emptiness and request count (AC-22–AC-24), the trace via
  `window.dinoDash.getScoreTrace()` (AC-19, AC-20, AC-22), the exhaustive key sweep collecting
  `data-game-state` (AC-26), and **rendered-pixel sampling** confirming the drawn colours match the
  declared palette (AC-16, AC-17, AC-18 objective half).

### 4. Stated commands (shape for ENG-12 to implement)

Four commands, named separately because they have different network characteristics:

```
npm ci          install pinned dev dependencies      NETWORK REQUIRED (registry + browser download)
npm start       serve src/ at a localhost origin     no network
npm test        unit tier + browser tier, machine-readable results   no network
npm run a11y    accessibility evidence for AC-12, AC-14, AC-16, AC-17 no network
```

**The install step touches the network; the game never does.** WS-01 records this under **B-01**:
AC-24 governs the running game, not the toolchain. The two must be stated as distinct steps in the
evidence or a verifier will read them as contradictory. ENG-12 states them separately; ENG-10 records
that the browser-tier run itself observed zero outbound requests from the page.

### 5. File placement — boundary constraints ENG-12 must respect

The narrowed write boundary is `src/`, `tests/`, `docs/`, `.github/`, `package.json`,
`package-lock.json`. Three consequences that will otherwise be discovered late:

1. **A repository-root `playwright.config.js` is outside the boundary.** The config must live under
   `tests/` and be passed explicitly (`--config tests/browser/playwright.config.js`). Playwright does
   not read config from `package.json`.
2. **Test output must be written inside the boundary** — e.g. `tests/.results/` — and kept out of the
   commit by a **nested `tests/.gitignore`**, which *is* inside the boundary.
3. **`node_modules/` at the repository root cannot be ignored from inside the boundary.** There is no
   root `.gitignore` at the base revision, and the root is not a writable path — `node_modules` is
   also on the contract's own `prohibitedPaths`. Handling: never `git add` it; build the AC-28
   inventory from the workstream commits on `codex/evt-20260809-001`, consistent with WS-01's **B-07**
   reading. If ENG-12 judges a root `.gitignore` necessary, that is a **write outside both the
   narrowed set and the contract's `allowedPaths` and must be escalated to Product Operations, not
   created quietly.** Carried as a known risk.

### 6. Dependency discipline

- **Runtime dependencies: zero.** Non-negotiable — it is what makes AC-24 true by construction.
- **Dev dependencies: as few as will do the job**, ideally the two named here (a static server and
  Playwright) plus nothing else. Every addition is audit and SBOM surface for WS-09.
- All dev dependencies pinned via `package-lock.json`; `npm ci`, never `npm install`, in CI and in
  the AC-30 clean-checkout procedure.
- No dependency may be fetched by the page at runtime, from any origin, ever (ADR-001).

## Consequences and trade-offs

- **Playwright is by far the heaviest thing in the delivery** — a browser download at install time
  against a game with zero runtime dependencies. Accepted deliberately: AC-16 and AC-17 require
  rendered-pixel measurement, AC-01 requires a real console, AC-22–AC-24 require real storage and
  network observation. Nothing lighter can produce that evidence, and the bundled Chromium doubles as
  the pinned, version-recordable reference browser ADR-001 needs.
- **`node:test` is less featureful than Jest/Vitest** — no snapshotting, plainer mocking. The DOM-free
  core needs none of it, and zero dependencies is worth more here than convenience.
- **No build step means no dead-code elimination, no minification, no legacy transpilation.** All
  irrelevant: one Chromium target, hand-written source, no distribution channel.
- **Two tiers mean two result files.** ENG-10 states both; ENG-15 reads both. Simpler than one runner
  doing both jobs badly.

## Migration, rollback, and evidence

- **Evidence:** this ADR; ENG-12's `package.json`, `package-lock.json` and scripts at the delivery
  revision; the machine-readable result files from both tiers; the recorded Node and Chromium
  versions; a clean-checkout run of `npm ci && npm test` and of the accessibility command.
- **Rollback:** delete the dev dependencies and the scripts. The game keeps running — it depends on
  none of them. That independence is itself a design goal, not an accident.
- **Escalation carried:** the root `.gitignore` / `node_modules` boundary question in §5.3 is raised,
  not settled, by ENG-02.
