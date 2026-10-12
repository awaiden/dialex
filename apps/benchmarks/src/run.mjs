// Throughput of the same four messages in each library.
//
//   node src/run.mjs            (from apps/benchmarks, after `bun run build:packages`)
//
// Each case is checked for identical output first, warmed up, then timed in several rounds; the
// median round is reported. Results go to results/throughput.json.
import fs from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";

import { libraries, MESSAGES, VALUES } from "./libs.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const baselineOut = flag("--baseline"); // write the results here as well
const compareWith = flag("--compare"); // print the ratio against this file
const only = flag("--only"); // a library name prefix, for quick runs
const repeat = Number(flag("--repeat") ?? 1); // keep the best of this many passes per case
const MAX_REGRESSION = 0.06; // a dialexjs row slower than this fails the comparison (noise is about 5%)

const ROUNDS = 7;
const ROUND_MS = 400;
const WARMUP_MS = 300;
const BATCH = 200;

const cases = Object.keys(MESSAGES);
let sink = 0;

function batch(fn, makeValues, start) {
  for (let i = 0; i < BATCH; i++) sink += fn(makeValues(start + i)).length;
}

function opsPerSecond(fn, makeValues) {
  let i = 0;
  const warmupEnd = performance.now() + WARMUP_MS;
  while (performance.now() < warmupEnd) {
    batch(fn, makeValues, i);
    i += BATCH;
  }
  const rounds = [];
  for (let round = 0; round < ROUNDS; round++) {
    let operations = 0;
    const start = performance.now();
    const end = start + ROUND_MS;
    let now = start;
    while (now < end) {
      batch(fn, makeValues, i);
      i += BATCH;
      operations += BATCH;
      now = performance.now();
    }
    rounds.push(operations / ((now - start) / 1000));
  }
  rounds.sort((a, b) => a - b);
  return rounds[Math.floor(rounds.length / 2)];
}

// 1. Same output everywhere
const reference = {};
for (const key of cases) {
  for (let i = 0; i < 12; i++) {
    const outputs = libraries
      .filter((lib) => lib.run[key])
      .map((lib) => [lib.name, String(lib.run[key](VALUES[key](i)))]);
    const expected = outputs[0][1];
    for (const [name, output] of outputs) {
      if (output !== expected) {
        throw new Error(`${key} #${i}: ${name} returned "${output}", expected "${expected}"`);
      }
    }
    reference[key] = expected;
  }
}

// 2. Timing
const results = {};
for (const lib of libraries) {
  if (only && !lib.name.startsWith(only)) continue;
  results[lib.name] = {};
  for (const key of cases) {
    const fn = lib.run[key];
    if (!fn) {
      results[lib.name][key] = null;
      continue;
    }
    let best = 0;
    for (let pass = 0; pass < repeat; pass++) best = Math.max(best, opsPerSecond(fn, VALUES[key]));
    results[lib.name][key] = Math.round(best);
    console.log(
      `${lib.name.padEnd(34)} ${key.padEnd(14)} ${results[lib.name][key].toLocaleString("en")} ops/s`,
    );
  }
}

const meta = {
  date: new Date().toISOString().slice(0, 10),
  node: process.version,
  platform: `${os.type()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  rounds: ROUNDS,
  roundMs: ROUND_MS,
  sink,
};
fs.mkdirSync(new URL("../results/", import.meta.url), { recursive: true });
fs.writeFileSync(
  new URL("../results/throughput.json", import.meta.url),
  JSON.stringify({ meta, messages: MESSAGES, results }, null, 2) + "\n",
);
console.log("\nWrote results/throughput.json");

if (baselineOut) {
  fs.copyFileSync(new URL("../results/throughput.json", import.meta.url), baselineOut);
  console.log(`Wrote ${baselineOut}`);
}

if (compareWith) {
  const before = JSON.parse(fs.readFileSync(compareWith, "utf-8")).results;
  let failed = false;
  console.log(`\nRatio against ${compareWith} (above 1 is faster):`);
  for (const [name, row] of Object.entries(results)) {
    if (!before[name]) continue;
    const cells = cases.map((key) => {
      if (row[key] === null || !before[name][key]) return `${key} n/a`;
      const ratio = row[key] / before[name][key];
      const regression = name.startsWith("dialexjs") && ratio < 1 - MAX_REGRESSION;
      if (regression) failed = true;
      return `${key} ${ratio.toFixed(2)}x${regression ? " REGRESSION" : ""}`;
    });
    console.log(`${name.padEnd(34)} ${cells.join("   ")}`);
  }
  if (failed) {
    console.error(
      `\nA dialexjs case is more than ${MAX_REGRESSION * 100}% slower than the baseline.`,
    );
    process.exitCode = 1;
  }
}
