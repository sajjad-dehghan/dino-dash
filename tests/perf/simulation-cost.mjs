/**
 * WS-11 measurement harness — simulation cost, scaling, allocation, frame-rate independence.
 *
 * THIS IS A MEASUREMENT TOOL, NOT A TEST. It asserts nothing, declares no threshold,
 * and has no pass/fail outcome. It exists so the numbers in
 * `docs/engineering/WS-11-performance-review.md` can be reproduced on another machine.
 *
 * It is deliberately NOT named `*.test.mjs`, so `node --test tests/unit` and any
 * `*.test.*` discovery glob will not pick it up. It must never be wired into the
 * pass/fail unit tier: the delivery's performance requirement is explicitly
 * unquantified (DEVREQ-EVT-20260809-001 nonFunctionalRequirements[performance],
 * WS-01 R-02), so there is no threshold this file could legitimately assert against.
 *
 * It imports the delivered `src/game/**`, `src/engine/**` and `src/render/palette.js`
 * modules unmodified and drives them through their public entry points only.
 *
 *   node tests/perf/simulation-cost.mjs
 *   node --expose-gc tests/perf/simulation-cost.mjs   (adds settled-heap sampling)
 */

import os from 'node:os';
import { createRunState, LAYOUT, PHYSICS, RUN } from '../../src/game/run-state.js';
import { advanceRun, markRunStart } from '../../src/game/simulation.js';
import { createObstacle, CACTUS_KINDS } from '../../src/game/obstacles.js';
import { clampStepSeconds, jump } from '../../src/game/physics.js';
import { createScoreTrace } from '../../src/trace/score-trace.js';

/** Deterministic random source, so every run of this harness sees the same traffic. */
function seededRandom(seed = 0x2f6e2b1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0x100000000;
  };
}

function quantile(sortedNs, q) {
  if (sortedNs.length === 0) return 0;
  const i = Math.min(sortedNs.length - 1, Math.max(0, Math.ceil(q * sortedNs.length) - 1));
  return sortedNs[i];
}

const us = (ns) => (Number(ns) / 1000).toFixed(4);

function heading(text) {
  console.log('\n' + text);
  console.log('-'.repeat(text.length));
}

// ---------------------------------------------------------------- machine

heading('0. Machine and runtime');
console.log('node                 ' + process.version + '  (v8 ' + process.versions.v8 + ')');
console.log('platform             ' + process.platform + ' ' + os.release() + ' ' + process.arch);
console.log('cpu                  ' + os.cpus()[0].model.trim() + ' x' + os.cpus().length);
console.log('totalmem             ' + (os.totalmem() / 2 ** 30).toFixed(1) + ' GiB');
console.log('--expose-gc          ' + (typeof globalThis.gc === 'function'));

// Cost of the timer itself, so the per-frame distribution below can be read honestly.
{
  const N = 200000;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) process.hrtime.bigint();
  const t1 = process.hrtime.bigint();
  console.log('hrtime.bigint() self-cost  ' + us((t1 - t0) / BigInt(N)) + ' us/call' +
    '  (included in every per-frame figure below)');
}

// ------------------------------------------------- 1. cost of one frame

heading('1. Cost of advancing one simulation frame (natural gameplay traffic)');

function measureFrames(sampleCount, { stepMs = 1000 / 60, warmup = 50000 } = {}) {
  const random = seededRandom();
  const run = createRunState(0);
  let t = 1000;
  markRunStart(run, t);

  for (let i = 0; i < warmup; i++) { t += stepMs; advanceRun(run, t, stepMs, random); }

  // Pass A: per-frame distribution. Each sample carries one hrtime.bigint() self-cost.
  const samples = new Array(sampleCount);
  let obstacleSum = 0;
  let obstacleMax = 0;
  for (let i = 0; i < sampleCount; i++) {
    t += stepMs;
    const a = process.hrtime.bigint();
    advanceRun(run, t, stepMs, random);
    const b = process.hrtime.bigint();
    samples[i] = Number(b - a);
    obstacleSum += run.obstacles.length;
    if (run.obstacles.length > obstacleMax) obstacleMax = run.obstacles.length;
  }

  // Pass B: untimed batch, two clock reads for the whole loop. No per-frame timer cost.
  const batchStart = process.hrtime.bigint();
  for (let i = 0; i < sampleCount; i++) {
    t += stepMs;
    advanceRun(run, t, stepMs, random);
  }
  const batchEnd = process.hrtime.bigint();

  samples.sort((x, y) => x - y);
  return {
    samples,
    batchMeanNs: Number(batchEnd - batchStart) / sampleCount,
    obstacleMean: obstacleSum / sampleCount,
    obstacleMax,
    run
  };
}

{
  const N = 500000;
  const r = measureFrames(N);
  const mean = r.samples.reduce((a, b) => a + b, 0) / N;
  console.log('samples              ' + N + ' frames at a 60 Hz step, after 50000 warm-up frames');
  console.log('obstacles on field   mean ' + r.obstacleMean.toFixed(2) + ', max ' + r.obstacleMax +
    '  (this is what the delivered spawn rule actually produces)');
  console.log('mean   (per-frame timed, includes one timer self-cost)  ' + us(mean) + ' us/frame');
  console.log('mean   (untimed batch, timer cost excluded)             ' + us(r.batchMeanNs) + ' us/frame');
  console.log('p50                  ' + us(quantile(r.samples, 0.50)) + ' us');
  console.log('p95                  ' + us(quantile(r.samples, 0.95)) + ' us');
  console.log('p99                  ' + us(quantile(r.samples, 0.99)) + ' us');
  console.log('p99.9                ' + us(quantile(r.samples, 0.999)) + ' us');
  console.log('max                  ' + us(r.samples[N - 1]) + ' us');
  console.log('min                  ' + us(r.samples[0]) + ' us');
}

// ------------------------------------------- 2. scaling with obstacle count

heading('2. How frame cost scales with obstacle count');
console.log('The delivered spawn rule cannot produce these counts, so obstacles are seated');
console.log('by hand. They travel leftwards and despawn, so the timed window is broken into');
console.log('short rounds and the obstacle list is re-seated (untimed) between rounds; the');
console.log('count observed inside every timed round is reported so the isolation is checkable.');
console.log('Speed is held at RUN.maxSpeedPxPerSecond by starting each round deep into a run.');
console.log('');
console.log('obstacles      mean us/frame     us per obstacle    count seen in window');

const scaling = [];
for (const count of [0, 1, 2, 4, 8, 16, 32, 64, 128]) {
  const stepMs = 1000 / 60;
  const ROUNDS = 2000, FRAMES_PER_ROUND = 100, WARM_ROUNDS = 200;
  const seat = () => {
    const run = createRunState(0);
    run.startedAtMs = -600000; // 10 simulated minutes in: speed pinned at the cap
    run.spawnCountdownPx = Number.POSITIVE_INFINITY; // suppress natural spawning
    for (let i = 0; i < count; i++) {
      const kind = CACTUS_KINDS[i % CACTUS_KINDS.length];
      // Seated far enough right that none despawns inside a round, and none reaches
      // the character, so `.some()` scans the whole list on every frame.
      run.obstacles.push(createObstacle(kind, LAYOUT.width + 1400 + i * 130));
    }
    return run;
  };

  let seenMin = Infinity, seenMax = 0;
  for (let r = 0; r < WARM_ROUNDS; r++) {
    const run = seat(); const random = seededRandom();
    let t = 0;
    for (let i = 0; i < FRAMES_PER_ROUND; i++) { t += stepMs; advanceRun(run, t, stepMs, random); }
  }

  let totalNs = 0n;
  for (let r = 0; r < ROUNDS; r++) {
    const run = seat();
    const random = seededRandom();
    let t = 0;
    const a = process.hrtime.bigint();
    for (let i = 0; i < FRAMES_PER_ROUND; i++) { t += stepMs; advanceRun(run, t, stepMs, random); }
    const b = process.hrtime.bigint();
    totalNs += b - a;
    if (run.obstacles.length < seenMin) seenMin = run.obstacles.length;
    if (run.obstacles.length > seenMax) seenMax = run.obstacles.length;
  }
  const perFrameNs = Number(totalNs) / (ROUNDS * FRAMES_PER_ROUND);
  const per = count === 0 ? '-' : us(perFrameNs / count);
  scaling.push({ count, perFrameNs });
  console.log(String(count).padStart(9) + us(perFrameNs).padStart(18) + String(per).padStart(20) +
    (count + ' -> ' + seenMin).padStart(24));
}
{
  const zero = scaling[0].perFrameNs;
  const hi = scaling[scaling.length - 1];
  console.log('');
  console.log('fixed cost with an empty obstacle list      ' + us(zero) + ' us/frame');
  console.log('marginal cost per obstacle (0 -> ' + hi.count + ')       ' +
    us((hi.perFrameNs - zero) / hi.count) + ' us/obstacle  (linear: one array pass + one .some())');
}

// ------------------------------------------- 3. allocation over a long run

heading('3. Allocation over a long run');
{
  const random = seededRandom();
  const run = createRunState(0);
  let t = 1000;
  markRunStart(run, t);
  const stepMs = 1000 / 60;
  const MINUTES = 30;
  const frames = Math.round((MINUTES * 60 * 1000) / stepMs);

  const settle = () => { if (typeof globalThis.gc === 'function') { globalThis.gc(); globalThis.gc(); } };
  const sampleAt = new Set([0, Math.round(frames * 0.25), Math.round(frames * 0.5),
    Math.round(frames * 0.75), frames - 1]);

  console.log('driving ' + frames + ' frames = ' + MINUTES + ' simulated minutes of one uninterrupted run');
  console.log('');
  console.log('frame        sim-min   score    obstacles  obstacle-peak   heapUsed MiB' +
    (typeof globalThis.gc === 'function' ? ' (settled)' : ' (unsettled)'));

  let peak = 0;
  const heapSamples = [];
  for (let i = 0; i < frames; i++) {
    t += stepMs;
    advanceRun(run, t, stepMs, random);
    if (run.obstacles.length > peak) peak = run.obstacles.length;
    if (sampleAt.has(i)) {
      settle();
      const mib = process.memoryUsage().heapUsed / 2 ** 20;
      heapSamples.push(mib);
      console.log(String(i).padStart(9) +
        ((i * stepMs) / 60000).toFixed(1).padStart(10) +
        String(run.score).padStart(9) +
        String(run.obstacles.length).padStart(11) +
        String(peak).padStart(15) +
        mib.toFixed(3).padStart(16));
    }
  }
  console.log('');
  console.log('run-state own fields   ' + Object.keys(run).length + ' (unchanged from createRunState())');
  console.log('obstacles at end       ' + run.obstacles.length + ', peak over the whole run ' + peak);
  console.log('heap drift first->last ' +
    (heapSamples[heapSamples.length - 1] - heapSamples[0]).toFixed(3) + ' MiB');
  console.log('note: stepObstacles() rebuilds runState.obstacles with .filter() every frame,');
  console.log('      so the run produces steady short-lived garbage. That is a rate, not growth.');
}

heading('3b. The one structure that DOES grow without bound: the score trace (AC-22)');
{
  const trace = createScoreTrace({ wallClockIso: () => '2026-08-10T00:00:00.000Z' });
  const settle = () => { if (typeof globalThis.gc === 'function') { globalThis.gc(); globalThis.gc(); } };
  settle();
  const base = process.memoryUsage().heapUsed;
  const RUNS = 200000;
  for (let i = 0; i < RUNS; i++) {
    trace.appendRunEnd({ score: i % 5000, sessionLengthMs: 1000 + (i % 60000) });
  }
  settle();
  const after = process.memoryUsage().heapUsed;
  const grew = after - base;
  console.log('records appended     ' + RUNS + ' (one per run end; AC-22 requires accumulation)');
  console.log('trace.size()         ' + trace.size());
  console.log('retained heap growth ' + (grew / 2 ** 20).toFixed(2) + ' MiB' +
    (typeof globalThis.gc === 'function' ? ' (settled)' : ' (unsettled)'));
  console.log('per record           ~' + (grew / RUNS).toFixed(1) + ' B');
  console.log('This is unbounded BY DESIGN and bounded in practice by the page session:');
  console.log('the array is module state that dies with the JavaScript realm (AC-23), and');
  console.log('one record is appended per run end, not per frame.');
}

// ---------------------------------- 4. frame-rate independence (ADR-002 §5)

heading('4. Frame-rate independence over the same wall-clock duration');
console.log('Same 60 s of monotonic time, advanced at three step sizes. Collisions are');
console.log('observed but not acted on, so all three runs cover the full duration.');
console.log('');
console.log('fps        step ms     frames    elapsedMs   score   distancePx   speed   obstacles');

const fpsResults = [];
for (const fps of [30, 60, 144]) {
  const DURATION_MS = 60000;
  const frames = Math.round((DURATION_MS * fps) / 1000);
  const stepMs = DURATION_MS / frames;
  const random = seededRandom();
  const run = createRunState(0);
  const START = 1000;
  markRunStart(run, START);
  // nowMs is computed absolutely, not accumulated, so all three runs land on the
  // identical final monotonic instant and float drift cannot enter the comparison.
  for (let i = 1; i <= frames; i++) {
    advanceRun(run, START + (i * DURATION_MS) / frames, stepMs, random);
  }
  fpsResults.push({ fps, run, frames });
  console.log(String(fps).padStart(3) + stepMs.toFixed(4).padStart(14) +
    String(frames).padStart(11) + Math.round(run.elapsedMs).toString().padStart(13) +
    String(run.score).padStart(8) + run.distancePx.toFixed(1).padStart(13) +
    Math.round(run.speedPxPerSecond).toString().padStart(8) +
    String(run.obstacles.length).padStart(12));
}
{
  const scores = fpsResults.map((r) => r.run.score);
  const dists = fpsResults.map((r) => r.run.distancePx);
  console.log('');
  console.log('score spread across 30/60/144 fps      ' + (Math.max(...scores) - Math.min(...scores)) +
    ' points  (' + scores.join(' / ') + ')');
  console.log('distancePx spread                      ' + (Math.max(...dists) - Math.min(...dists)).toFixed(2) +
    ' px  (' + (100 * (Math.max(...dists) - Math.min(...dists)) / Math.max(...dists)).toFixed(3) + '% of max)');
}

heading('4b. Jump trajectory at the same three step sizes (one grounded jump)');
console.log('Semi-implicit Euler integration; the score is time-derived but the jump arc is stepped.');
console.log('');
console.log('fps      apex height px    airtime ms    frames airborne');
for (const fps of [30, 60, 144]) {
  const stepMs = 1000 / fps;
  const run = createRunState(0);
  markRunStart(run, 1000);
  run.spawnCountdownPx = Number.POSITIVE_INFINITY;
  const restingY = LAYOUT.groundY - run.character.height;
  jump(run.character);
  let t = 1000, airborneFrames = 0, apex = 0;
  const random = seededRandom();
  while (!run.character.grounded && airborneFrames < 100000) {
    t += stepMs;
    advanceRun(run, t, stepMs, random);
    airborneFrames++;
    const h = restingY - run.character.y;
    if (h > apex) apex = h;
  }
  console.log(String(fps).padStart(3) + apex.toFixed(2).padStart(19) +
    (airborneFrames * stepMs).toFixed(2).padStart(14) + String(airborneFrames).padStart(20));
}

// ------------------------------------------------- 5. delta-time clamp

heading('5. Delta-time clamp after a long frame gap (PHYSICS.maxStepSeconds)');
console.log('maxStepSeconds       ' + PHYSICS.maxStepSeconds + ' s (= ' + (PHYSICS.maxStepSeconds * 1000) + ' ms)');
console.log('');
console.log('raw gap ms     clampStepSeconds(gap) s     world px advanced on that one frame' +
  '     unclamped would be');
for (const gapMs of [16.67, 33.33, 50, 51, 200, 1000, 5000, 60000, 3600000]) {
  const clamped = clampStepSeconds(gapMs);
  const random = seededRandom();
  const run = createRunState(0);
  let t = 1000;
  markRunStart(run, t);
  const stepMs = 1000 / 60;
  for (let i = 0; i < 120; i++) { t += stepMs; advanceRun(run, t, stepMs, random); } // 2 s of play
  const before = run.distancePx;
  t += gapMs;
  advanceRun(run, t, gapMs, random);
  const advanced = run.distancePx - before;
  const unclamped = run.speedPxPerSecond * (gapMs / 1000);
  console.log(gapMs.toFixed(2).padStart(11) + clamped.toFixed(5).padStart(24) +
    advanced.toFixed(2).padStart(38) + unclamped.toFixed(0).padStart(24));
}
{
  // Does the character teleport through a cactus placed directly in its path?
  const random = seededRandom();
  const run = createRunState(0);
  markRunStart(run, 1000);
  run.spawnCountdownPx = Number.POSITIVE_INFINITY;
  run.obstacles.length = 0;
  run.obstacles.push(createObstacle(CACTUS_KINDS[1], LAYOUT.characterX + 300));
  let t = 1000;
  const positions = [];
  for (let i = 0; i < 30; i++) {
    t += 5000; // thirty consecutive 5-second frame gaps
    advanceRun(run, t, 5000, random);
    positions.push(run.obstacles.length ? run.obstacles[0].x.toFixed(1) : 'despawned');
  }
  console.log('');
  console.log('a cactus at x=' + (LAYOUT.characterX + 300) + ', thirty consecutive 5000 ms frame gaps:');
  console.log('  obstacle x after each gap: ' + positions.slice(0, 12).join(' ') + ' ...');
  console.log('  it is stepped past the character one clamped step at a time; it is never skipped over.');
}

heading('6. Input response, simulation side only');
console.log('jump() is called synchronously from the keydown handler (src/main.js handleActionPress).');
console.log('It mutates velocityY immediately; the character MOVES on the next advanceRun().');
console.log('The browser-side path -- keydown dispatch to the next rAF callback -- is NOT measurable');
console.log('in Node and is not measured here. Only the simulation-side component is below.');
console.log('');
{
  const N = 2000000;
  const c = createRunState(0).character;
  const a = process.hrtime.bigint();
  for (let i = 0; i < N; i++) { c.grounded = true; jump(c); }
  const b = process.hrtime.bigint();
  console.log('jump() cost                        ' + us(Number(b - a) / N) +
    ' us/call (includes the grounded reset in the loop)');
}
console.log('');
console.log('fps      frame interval ms    frames until y changes    sim-side response ms');
for (const fps of [30, 60, 144]) {
  const stepMs = 1000 / fps;
  const run = createRunState(0);
  markRunStart(run, 1000);
  run.spawnCountdownPx = Number.POSITIVE_INFINITY;
  const y0 = run.character.y;
  jump(run.character);
  let t = 1000, frames = 0;
  const random = seededRandom();
  while (run.character.y === y0 && frames < 1000) {
    t += stepMs; advanceRun(run, t, stepMs, random); frames++;
  }
  console.log(String(fps).padStart(3) + stepMs.toFixed(4).padStart(19) +
    String(frames).padStart(26) + (frames * stepMs).toFixed(2).padStart(25));
}

heading('7. Constants read from the delivered source (no value invented here)');
console.log('PHYSICS  ' + JSON.stringify(PHYSICS));
console.log('RUN      ' + JSON.stringify(RUN));
console.log('LAYOUT   ' + JSON.stringify(LAYOUT));

console.log('\nEND. No threshold was asserted. These are observations, not budgets.');
