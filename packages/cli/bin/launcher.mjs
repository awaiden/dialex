#!/usr/bin/env node
// Entry point of `dialex` and `dx`. It runs the native binary of the platform when one is
// installed (the `@dialexjs/cli-<platform>` optional packages), and the Node CLI otherwise.
//
//   DIALEX_NATIVE=0   always use the Node CLI
//   DIALEX_NATIVE=1   native only: fail instead of falling back to Node for a command
//   DIALEX_BINARY     path of a binary to use instead of the installed package
//   DIALEX_CONFIG_RESOLVER   is set for the binary: the `@dialexjs/config` script it runs to resolve the config
//
// The native binary handles `generate` and `check` itself and hands every other command back to
// the Node CLI (`dist/index.mjs`), so behavior and output stay the same.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const nodeCli = fileURLToPath(new URL("../dist/index.mjs", import.meta.url));

/** The platform package that holds the binary for this machine, or `undefined`. */
function platformPackage() {
  const { platform, arch } = process;
  if (platform === "linux") {
    // A musl libc (Alpine) has no glibc version in its report; those machines use Node
    const glibc = process.report?.getReport?.().header?.glibcVersionRuntime;
    if (!glibc) return undefined;
  }
  const supported = new Set([
    "linux-x64",
    "linux-arm64",
    "darwin-x64",
    "darwin-arm64",
    "win32-x64",
    "win32-arm64",
  ]);
  const key = `${platform}-${arch}`;
  return supported.has(key) ? `@dialexjs/cli-${key}` : undefined;
}

function findBinary() {
  if (process.env.DIALEX_BINARY) {
    return existsSync(process.env.DIALEX_BINARY) ? process.env.DIALEX_BINARY : undefined;
  }
  const name = platformPackage();
  if (!name) return undefined;
  const file = process.platform === "win32" ? "bin/dx.exe" : "bin/dx";
  try {
    return createRequire(import.meta.url).resolve(`${name}/${file}`);
  } catch {
    return undefined; // optional dependency not installed (--no-optional, unsupported platform)
  }
}

/**
 * The script of `@dialexjs/config` that writes `.dialex/config.json`. The binary does not read
 * `dialex.config.*` itself; it runs this when the resolved file is missing or stale.
 */
function findConfigResolver() {
  try {
    return createRequire(import.meta.url).resolve("@dialexjs/config/cli");
  } catch {
    return undefined;
  }
}

const binary = process.env.DIALEX_NATIVE === "0" ? undefined : findBinary();

if (binary) {
  const result = spawnSync(binary, process.argv.slice(2), {
    stdio: "inherit",
    env: {
      ...process.env,
      DIALEX_NODE_CLI: nodeCli,
      ...(findConfigResolver() ? { DIALEX_CONFIG_RESOLVER: findConfigResolver() } : {}),
    },
  });
  if (result.error) {
    // The binary could not be started (wrong architecture, missing permissions): use Node
    await import("../dist/index.mjs");
  } else if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exit(result.status ?? 1);
  }
} else {
  await import("../dist/index.mjs");
}
