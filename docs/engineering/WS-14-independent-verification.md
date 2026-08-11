# WS-14 — Independent Engineering Verification

**Plan** `ENGPLAN-EVT-20260809-001` · **Request** `DEVREQ-EVT-20260809-001` · **Workstream** WS-14
**Role** ENG-15 (Independent Engineering Verification) · **Actor** `actor-eng-15`
**Gate owned** `GATE-INDEPENDENT-VERIFICATION` (`required: true`)
**Revision verified** `d3560a81dbbd13a5febb0802d62fb5f9b6318b8c`
**Disposition** **`passed`**

This workstream changed nothing. It added this file and nothing else. It did not modify `src/`,
`tests/`, `package.json`, or any prior workstream's output, and it repaired no defect it found.

---

## 0. Method

Verification here means **reproduction**, not review. Every claim below was re-run against a
**fresh `git clone` into a temporary directory outside both repositories** — not the existing
working tree — at `d3560a81`. Where a number differs from a record, the difference is stated with
its cause rather than smoothed over.

Environment: Node **v22.23.2**, npm **10.9.8**, Windows 11 Pro 10.0.28000, Git Bash.
No `node_modules` existed before any command, and none existed after — checked, not assumed.

---

## 1. The `src/` seal — verified, not accepted

Several workstreams assert `src/` was sealed at WS-03. Checked directly by resolving the `src` tree
object at every commit rather than by diffing:

```
ea12453 (WS-03)  0566d5d39599d0cdf374b5dee27d22afdb544c41
290f45c 963cf74 ae8895e b35af29 cacfcb0 e8a2959 c85a5ac c25065f
6d884f1 d5b71dd bd43f5f b522eab 0fb86ee bf5ac18 d3560a8   ... all 0566d5d3
```

**All 16 commits from WS-03 to `HEAD` carry the identical `src` tree `0566d5d3`.** The two commits
before WS-03 have no `src` path at all. The seal holds absolutely — no workstream, including the
owner-directed commit, altered a byte of the product source.

## 2. The delivered commands, from a clean checkout

| Command | Exit | Reproduced result |
| --- | ---: | --- |
| `npm test` | **0** | `tests 114 / pass 114 / fail 0`, `duration_ms 643.78` |
| `npm run evidence:a11y` | **0** | 3 variations, 11 pairs, **33 rows, 33 passed / 0 failed**; min text **11.91** (threshold 4.5), min non-text **3.07** (threshold 3) |
| `node tests/tools/ac-coverage.mjs` | **0** | `evidence=11 partial=18 none=1`; `consistent: true`; `problems: []` |
| `npm run perf:artifact` | **0** | **17 requests, 0 non-200**, disk total = wire total |
| `npm run perf:simulation` | **0** | closes "No threshold was asserted. These are observations, not budgets." |
| `node tests/security/{sbom,secret-scan,surface-scan}.mjs` | **0**, **0**, **0** | 0 top-level SBOM components; see §5 |

**WS-10's 114/114 reproduces exactly. WS-12's zero-install claim reproduces exactly** — every command
above ran on a bare checkout with no install step, and `node_modules` was absent before and after.

**WS-10's "53 new tests" reproduces.** Running the suite at `bd43f5f` (the commit before WS-10's test
tier) gives **61 tests, exit 0**; at `HEAD`, **114**. 114 − 61 = **53**.

## 3. Delivery boundary — clean

Changed-file inventory built across every delivery commit (`32d94b5..HEAD`), then filtered per
commit against the forbidden paths:

**Zero commits touched `engineering/`, `.development-os/`, `DEVELOPMENT.md` or
`development-os.config.json`.** Nothing landed in the product workspace.

Provenance checked rather than assumed: `README.md` and all four `docs/media/*.png` are touched by
**exactly one commit, `bf5ac18`, authored by "Product Operations"** — the owner-directed commit that
is deliberately not part of this delivery. **They are out of scope and are treated as such here.**
`BENCHMARK.md` is not tracked by git at all and forms no part of the delivery.

## 4. Load-bearing technical claims

**F-01 (WS-09) — reproduced live, not read.** Executing the delivered module directly:
`transition('constructor')` returns `true`, leaves the state variable holding a **function**, and
`STATE_VALUES.includes(state)` is `false`. The machine is then **bricked** — `transition('start')`
returns `false` and every declared event is refused. WS-09's finding and WS-10's "the escape is
one-way" addition are both **confirmed by execution**. The three call sites do pass literals, so the
unreachability conclusion also holds.

**Frame-rate independence (WS-11) — confirmed.** Over the same 60 s of monotonic time at 30 / 60 /
144 fps: score **600 / 600 / 600**, spread **0 points**; `distancePx` spread 4.48 px (0.012 %).

**Jump-apex spread (WS-11) — confirmed.** Apex 134.44 / 141.67 / 145.88 px across the same three
step sizes: (145.88 − 134.44) / 134.44 = **8.51 %**, matching WS-11's stated 8.5 %.

**Contrast numbers (WS-12) — confirmed.** 33/33 rows pass; the two reported minima reproduce to the
digit. The measurement is of the **declared palette**, not rendered pixels — which every record says.

**The 17-request artifact figure — reconciled.** See §5, D-1.

## 5. Discrepancies found

Three. None is material; each is recorded with its cause.

**D-1 — the byte total (17 requests is right; 42,517 vs 43,842 is a checkout artifact).**
My clean checkout measured **43,842 B over 17 requests**; WS-08, WS-11 and WS-13 report **42,517 B**.
Cause established, not guessed: **`core.autocrlf=true` with no `.gitattributes`**. Summing the
canonical git blobs gives `index.html` 2,477, `main.js` 3,903, `palette.js` 7,049 and **42,559 B
across all 18 files** — matching WS-08 exactly, and 42,559 − 42 (`src/package.json`, never fetched)
= **42,517**. The existing working tree is LF on disk (42,559); a fresh Windows checkout is CRLF
(+1 byte per line, +1,325 across the 17 fetched files). **The `src` tree object is identical in both
cases** — no content differs. **WS-12 §5.3 had already found and correctly diagnosed this**, naming
the same root cause and noting that the request count, the non-200 count and the
disk-equals-wire property are unaffected. That is the honest handling of it, and it is why the
divergence between records is a disclosed environment property rather than a contradiction.

**D-2 — WS-09 undercounts F-01's breadth: 10 stated, 12 actual.**
`tests/security/surface-scan.mjs` probes a **hard-coded 10-name list** that omits
`__defineSetter__` and `__lookupSetter__`. Deriving the alphabet properly from
`Object.getOwnPropertyNames(Object.prototype)`, **12** inherited names are accepted and all 12 drive
the state off `STATE_VALUES`. This **understates** the defect; it does not overstate it, and it
changes no conclusion. **WS-10 already corrected the methodology** — its regression file derives the
alphabet at runtime rather than hard-coding it, so it covers all 12. The stale figure survives only
in WS-09's prose and in `security-surface.json`.

**D-3 — WS-09's "zero matches on all 25 credential patterns" no longer reproduces at HEAD.**
At `d3560a81` the scan reports `pem_certificate` = 1 and `putty_key_file` = 1. Both are
**self-matches on the scanner's own regex literals** at `tests/security/secret-scan.mjs:43-44`.
`tests/security/` was **untracked at `d5b71dd`**, the revision WS-09 scanned — verified by listing
that tree — so the tool could not then match itself. The claim was true when made and is now stale.
**No credential material exists**; sensitive paths ever tracked remains **0**. WS-09's disclosure
practice is otherwise sound: it reports its false positives rather than filtering them.

## 6. AC coverage matrix — audited, not accepted

`evidence=11 partial=18 none=1` reproduces exactly, with the generator's own `consistent: true` and
an empty `problems` list. I read the test titles behind **all 11** `evidence` criteria and compared
them against the criterion text in `docs/architecture/unit-1-ac-traceability.md`.

**No criterion claimed as `evidence` is unsupported by its tests.** Each names real, executing tests
whose titles map onto the criterion. The three that retain residual judgement carry an **explicit
`limitation` string** rather than a silent pass — AC-21 discloses the injected clock as a declared
substitute, AC-25 argues absence-over-static-source, AC-29 states the human procedure is not
replaced. AC-01, the sole `none`, is honestly labelled a pure browser observation and explicitly
declines to borrow AC-24's evidence. Fourteen criteria sit at `partial` for the single declared
reason that no browser tier exists.

## 7. Declared gaps — declared, not hidden

Checked as gaps rather than as passes: **no browser tier** (WS-10's cold Playwright acquisition:
ten minutes, zero output, exit 143), the **unset performance budget** (`GATE-PERFORMANCE` and
`GATE-RELIABILITY` recorded as gaps; both perf harnesses end by refusing to assert a threshold),
and the **rendered-pixel half of AC-16/AC-17**. Each appears in the runbook, the operating overview
and the coverage matrix, worded as an open gap. `.github/workflows/ci.yml` states in its own header
that it **has never been executed** — an honesty note the delivery volunteered.

## 8. Disposition — `passed`

Every load-bearing claim reproduced: the `src` seal, 114/114 zero-install, the 53-test delta, the
33/33 contrast rows, the 11/18/1 coverage split, 17 requests with 0 non-200, zero-point frame-rate
spread, the 8.5 % apex spread, F-01's existence and unreachability, and a clean write boundary.

The three discrepancies in §5 are a Windows line-ending artifact **the delivery had already
diagnosed itself**, an undercount that **understates** a finding and was **already corrected
methodologically** by the next workstream, and a **stale-by-construction** scan figure with no
credential behind it. None is a material claim failing to reproduce, and none is a gap that was
hidden rather than declared. The declared gaps are declared repeatedly, in machine-readable output
as well as prose, and are not grounds for failure by the plan's own terms.

**`GATE-INDEPENDENT-VERIFICATION`: passed.**

### Risks carried forward

- **R-01** — `src/` byte totals and any sha256 over `src/` files are **checkout-dependent** on
  Windows. A root `.gitattributes` would settle it; that path is outside this workstream's boundary.
- **R-02** — F-01 remains **live and unfixed** in sealed source. It is unreachable only because all
  three call sites pass literals; the first unit to route a string into `transition()` makes it real.
  Its true breadth is **12** inherited names, not the 10 recorded in WS-09.
- **R-03** — `tests/security/surface-scan.mjs` hard-codes its probe list and will keep under-reporting.
- **R-04** — Re-running `secret-scan.mjs` will keep reporting 2 self-matches until the scanner
  excludes its own source. A future reader must not read them as credential material.
- **R-05** — Fourteen criteria stay `partial` and AC-01 stays `none` until a browser tier exists.
  This verification is of the unit tier only; **no rendered pixel was observed by this workstream.**
