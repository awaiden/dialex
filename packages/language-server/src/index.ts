#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const PLATFORMS = new Set([
  "linux-x64",
  "linux-arm64",
  "darwin-x64",
  "darwin-arm64",
  "win32-x64",
  "win32-arm64",
]);

/**
 * The native server of this machine (the `@dialexjs/cli-<platform>` optional packages), when it is
 * asked for with `DIALEX_NATIVE=1` or `DIALEX_BINARY`. It is opt-in for now: the Node server
 * stays the default until the native one has been used for a release.
 */
function nativeServer(): string | undefined {
  if (process.env.DIALEX_LSP_BINARY) {
    return existsSync(process.env.DIALEX_LSP_BINARY) ? process.env.DIALEX_LSP_BINARY : undefined;
  }
  if (process.env.DIALEX_NATIVE !== "1") return undefined;

  const key = `${process.platform}-${process.arch}`;
  if (!PLATFORMS.has(key)) return undefined;
  if (process.platform === "linux") {
    // A musl libc (Alpine) has no glibc version in its report
    const report = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } };
    if (!report?.header?.glibcVersionRuntime) return undefined;
  }
  const file =
    process.platform === "win32" ? "dialex-language-server.exe" : "dialex-language-server";
  try {
    return createRequire(import.meta.url).resolve(`@dialexjs/cli-${key}/bin/${file}`);
  } catch {
    return undefined; // optional dependency not installed
  }
}

const native = nativeServer();

if (native) {
  // The native server speaks LSP on the same stdio
  const child = spawn(native, process.argv.slice(2), { stdio: "inherit" });
  child.on("error", () => void startNodeServer());
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
} else {
  await startNodeServer();
}

async function startNodeServer(): Promise<void> {
  const { createConnection, ProposedFeatures } = await import("vscode-languageserver/node.js");
  const { createServer } = await import("./server.js");

  // stdout carries the protocol; anything that logs there would corrupt it.
  console.log = (...args: unknown[]) => console.error(...args);

  // `--stdio` (what editors pass), `--node-ipc` and `--socket=<port>` are handled by the library.
  const connection = createConnection(ProposedFeatures.all);
  createServer(connection);
  connection.listen();
}
