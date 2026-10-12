// Runs the Node CLI and the native binary on identical copies of a project and compares the files
// they write and what they print.
//
//   node crates/tests/parity.mjs <command...>      e.g. generate, generate --json
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildFixtures } from "./fixtures.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const node = path.join(root, "packages/cli/dist/index.mjs");
const native = path.join(root, "crates/target/release/dx");
// The binary does not read `dialex.config.*`; it runs this to write `.dialex/config.json`
const resolver = path.join(root, "packages/config/dist/cli.mjs");
const argv = process.argv.slice(2);
if (argv.length === 0) throw new Error("usage: parity.mjs <command...>");

const SKIP = new Set([
  "node_modules",
  "dist",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".git",
  ".turbo",
  "build",
  ".expo",
  ".intlayer",
  // written by the native binary only, and not a result of the command
  ".dialex",
]);

function copy(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter: (source) => !SKIP.has(path.basename(source)),
  });
}

function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return out.toSorted();
}

function run(bin, cwd, extraEnv = {}) {
  const command = bin.endsWith(".mjs") ? [process.execPath, bin] : [bin];
  const result = spawnSync(command[0], [...command.slice(1), ...argv], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NO_COLOR: "1", DIALEX_CONFIG_RESOLVER: resolver, ...extraEnv },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-parity-"));
const fixtures = buildFixtures(tmp);

let failures = 0;
for (const [name, source] of fixtures) {
  const a = path.join(tmp, "node", name.replace("/", "-"));
  const b = path.join(tmp, "native", name.replace("/", "-"));
  copy(source, a);
  copy(source, b);
  // The config imports `dialexjs`, which Node resolves from the project's node_modules
  if (fs.existsSync(path.join(source, "node_modules"))) {
    for (const dir of [a, b])
      fs.symlinkSync(path.join(source, "node_modules"), path.join(dir, "node_modules"));
  }

  const expected = run(node, a);
  const actual = run(native, b, { DIALEX_NATIVE: "1" });

  const problems = [];
  const normalize = (text, dir) => text.split(dir).join("<root>");
  if (expected.status !== actual.status)
    problems.push(`exit ${expected.status} vs ${actual.status}`);
  if (normalize(expected.stdout, a) !== normalize(actual.stdout, b)) {
    problems.push(
      `stdout differs:\n--- node\n${expected.stdout.slice(0, 400)}\n--- native\n${actual.stdout.slice(0, 400)}\n${actual.stderr.slice(0, 300)}`,
    );
  }
  const filesA = listFiles(a);
  const filesB = listFiles(b);
  if (JSON.stringify(filesA) !== JSON.stringify(filesB)) {
    problems.push(
      `file lists differ: ${filesA.filter((f) => !filesB.includes(f)).slice(0, 5)} | ${filesB.filter((f) => !filesA.includes(f)).slice(0, 5)}`,
    );
  } else {
    for (const file of filesA) {
      const left = fs.readFileSync(path.join(a, file));
      const right = fs.readFileSync(path.join(b, file));
      if (!left.equals(right)) {
        problems.push(`${file} differs`);
        fs.writeFileSync(path.join(tmp, "diff-left.txt"), left);
        fs.writeFileSync(path.join(tmp, "diff-right.txt"), right);
        break;
      }
    }
  }
  if (problems.length) failures++;
  console.log(
    `${problems.length ? "FAIL" : "ok  "} ${name}${problems.length ? "\n  " + problems.join("\n  ") : ""}`,
  );
}
console.log(
  `\n${fixtures.length - failures}/${fixtures.length} identical${failures ? `  (diffs in ${tmp})` : ""}`,
);
process.exit(failures ? 1 : 0);
