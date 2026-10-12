// Runs after `npm install`. When the native binary of this platform is installed, it replaces the
// JS launcher (`bin/launcher.mjs`) with a copy of the binary, so `dx` starts without booting Node
// first (about 40-90 ms). Anything unusual leaves the launcher in place, which still works: this
// script never fails an install.
//
// It only does this for npm and Yarn classic, which link `node_modules/.bin/dx` straight to the
// file. pnpm and others write a shim that runs `node <file>`, which a binary cannot satisfy.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const launcher = path.join(root, "bin", "launcher.mjs");

function main() {
  if (process.env.DIALEX_NATIVE === "0" || process.env.DIALEX_SKIP_NATIVE_INSTALL) return;
  // not a checkout of the monorepo: that would rewrite a tracked file
  if (!root.split(path.sep).includes("node_modules")) return;
  if (process.platform === "win32") return; // the .cmd shim runs `node <file>`

  const agent = process.env.npm_config_user_agent ?? "";
  if (!agent.startsWith("npm/") && !agent.startsWith("yarn/1.")) return;

  const supported = ["linux-x64", "linux-arm64", "darwin-x64", "darwin-arm64"];
  const key = `${process.platform}-${process.arch}`;
  if (!supported.includes(key)) return;
  if (process.platform === "linux") {
    // a musl libc (Alpine) has no glibc version in its report; those machines keep the launcher
    if (!process.report?.getReport?.().header?.glibcVersionRuntime) return;
  }

  let binary;
  try {
    binary = createRequire(import.meta.url).resolve(`@dialexjs/cli-${key}/bin/dx`);
  } catch {
    return; // optional dependency not installed
  }

  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")).version;
  const probe = spawnSync(binary, ["--version"], { encoding: "utf-8", timeout: 10_000 });
  if (probe.status !== 0 || probe.stdout.trim() !== version) return;

  // copy beside the launcher, then rename over it, so there is never a half-written file
  const temporary = `${launcher}.${process.pid}.tmp`;
  try {
    fs.copyFileSync(binary, temporary);
    fs.chmodSync(temporary, 0o755);
    fs.renameSync(temporary, launcher);
  } catch {
    fs.rmSync(temporary, { force: true });
  }
}

try {
  main();
} catch {
  // keep the launcher
}
