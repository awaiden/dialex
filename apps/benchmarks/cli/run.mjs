// Wall-clock time of the Dialex CLI on synthetic projects.
//
//   node cli/run.mjs                              the Node CLI (packages/cli/dist)
//   node cli/run.mjs --bin ./target/release/dx    another binary, same commands
//   node cli/run.mjs --baseline results/cli-baseline.json
//   node cli/run.mjs --compare results/cli-baseline.json
//
// Every measurement is a fresh process. The best of --runs is kept (the median is printed next to
// it), which is the least noisy figure for start-up-dominated commands.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createProject } from "./project.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const bin = flag("--bin");
const command = bin
  ? [path.resolve(bin)]
  : [process.execPath, path.resolve(here, "../../../packages/cli/dist/index.mjs")];
const sizes = flag("--sizes", "100,1000").split(",").map(Number);
const runs = Number(flag("--runs", 5));
const baselineOut = flag("--baseline");
const compareWith = flag("--compare");

const COMMANDS = {
  version: ["--version"],
  generate: ["generate"],
  check: ["check"],
  "check --json": ["check", "--json"],
};

function time(cwd, argv) {
  const start = process.hrtime.bigint();
  const result = spawnSync(command[0], [...command.slice(1), ...argv], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    maxBuffer: 1 << 28,
  });
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { ms, status: result.status, stderr: result.stderr };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const results = {};
for (const size of sizes) {
  const dir = path.join(os.tmpdir(), `dialex-bench-${size}`);
  createProject(dir, size);
  results[size] = {};
  for (const [label, argv] of Object.entries(COMMANDS)) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const sample = time(dir, argv);
      if (sample.status !== 0 && label !== "check" && label !== "check --json") {
        throw new Error(`${label} failed (${sample.status}): ${sample.stderr.slice(0, 400)}`);
      }
      samples.push(sample.ms);
    }
    results[size][label] = {
      best: +Math.min(...samples).toFixed(1),
      median: +median(samples).toFixed(1),
    };
    console.log(
      `${String(size).padStart(5)} dictionaries  ${label.padEnd(14)} best ${String(results[size][label].best).padStart(8)} ms   median ${String(results[size][label].median).padStart(8)} ms`,
    );
  }
}

const out = {
  meta: {
    date: new Date().toISOString().slice(0, 10),
    node: process.version,
    cpu: os.cpus()[0]?.model,
    command: command.join(" "),
    runs,
  },
  results,
};
fs.mkdirSync(path.join(here, "../results"), { recursive: true });
fs.writeFileSync(
  path.join(here, "../results/cli-latest.json"),
  JSON.stringify(out, null, 2) + "\n",
);
if (baselineOut) {
  fs.writeFileSync(path.resolve(baselineOut), JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${baselineOut}`);
}
if (compareWith) {
  const before = JSON.parse(fs.readFileSync(path.resolve(compareWith), "utf-8")).results;
  console.log(`\nSpeed-up against ${compareWith} (above 1 is faster):`);
  for (const [size, row] of Object.entries(results)) {
    for (const [label, r] of Object.entries(row)) {
      const was = before[size]?.[label];
      if (was)
        console.log(
          `${String(size).padStart(5)}  ${label.padEnd(14)} ${(was.best / r.best).toFixed(1)}x`,
        );
    }
  }
}
