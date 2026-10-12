// Time to the first diagnostics of the Node and the native language server on a synthetic project.
//
//   node apps/benchmarks/cli/lsp.mjs [dictionaries=1000] [runs=5]
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createProject } from "./project.mjs";

const root = path.resolve(import.meta.dirname, "../../..");
const count = Number(process.argv[2] ?? 1000);
const runs = Number(process.argv[3] ?? 5);
const servers = {
  node: [
    process.execPath,
    [path.join(root, "packages/language-server/dist/index.mjs"), "--stdio"],
    {},
  ],
  native: [path.join(root, "crates/target/release/dialex-language-server"), ["--stdio"], {}],
  "node->native": [
    process.execPath,
    [path.join(root, "packages/language-server/dist/index.mjs"), "--stdio"],
    { DIALEX_LSP_BINARY: path.join(root, "crates/target/release/dialex-language-server") },
  ],
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-lsp-bench-"));
createProject(dir, count);
const uri = pathToFileURL(dir).href;

function firstDiagnostics([command, args, env]) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "ignore"],
      env: { ...process.env, ...env },
    });
    let buffer = Buffer.alloc(0);
    const write = (m) => {
      const body = Buffer.from(JSON.stringify(m));
      child.stdin.write(
        Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]),
      );
    };
    child.stdout.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        const length = Number(/Content-Length: (\d+)/i.exec(buffer.slice(0, end).toString())[1]);
        if (buffer.length < end + 4 + length) return;
        const message = JSON.parse(buffer.slice(end + 4, end + 4 + length).toString());
        buffer = buffer.slice(end + 4 + length);
        if (message.method === "textDocument/publishDiagnostics") {
          const elapsed = performance.now() - started;
          child.kill();
          resolve(elapsed);
        }
      }
    });
    child.on("error", reject);
    write({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { rootUri: uri, workspaceFolders: [{ uri, name: "x" }], capabilities: {} },
    });
    write({ jsonrpc: "2.0", method: "initialized", params: {} });
    setTimeout(() => reject(new Error("timeout")), 60000);
  });
}

// Analysis time of the server's first run and of the runs after one dictionary changed, from the
// "analyzed N dictionaries in X ms" lines the native server logs.
function editLatency([command, args, env]) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "ignore"],
      env: { ...process.env, ...env },
    });
    let buffer = Buffer.alloc(0);
    const timings = [];
    const write = (m) => {
      const body = Buffer.from(JSON.stringify(m));
      child.stdin.write(
        Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]),
      );
    };
    const target = path.join(dir, "src/features/f0/feature0.content.ts");
    const original = fs.readFileSync(target, "utf-8");
    let edits = 0;
    const edit = () => {
      edits++;
      fs.writeFileSync(target, original.replace('"', `"${"x".repeat(edits)}`));
      // editors with file watching send a change event for the file
      write({
        jsonrpc: "2.0",
        method: "workspace/didChangeWatchedFiles",
        params: { changes: [{ uri: pathToFileURL(target).href, type: 2 }] },
      });
    };
    child.stdout.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        const length = Number(/Content-Length: (\d+)/i.exec(buffer.slice(0, end).toString())[1]);
        if (buffer.length < end + 4 + length) return;
        const message = JSON.parse(buffer.slice(end + 4, end + 4 + length).toString());
        buffer = buffer.slice(end + 4 + length);
        const match =
          message.method === "window/logMessage" &&
          /analyzed \d+ dictionaries in (\d+) ms/.exec(message.params.message);
        if (!match) continue;
        timings.push(Number(match[1]));
        if (timings.length < 6) edit();
        else {
          child.kill();
          fs.writeFileSync(target, original);
          resolve(timings);
        }
      }
    });
    child.on("error", reject);
    write({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        rootUri: uri,
        workspaceFolders: [{ uri, name: "x" }],
        capabilities: { workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } },
      },
    });
    write({ jsonrpc: "2.0", method: "initialized", params: {} });
    setTimeout(() => reject(new Error("timeout")), 60000);
  });
}

console.log(
  `${count} dictionaries, best of ${runs} (includes process start and the 300 ms debounce)`,
);
for (const [name, spec] of Object.entries(servers)) {
  const times = [];
  for (let i = 0; i < runs; i++) times.push(await firstDiagnostics(spec));
  console.log(`${name.padEnd(14)} ${Math.min(...times).toFixed(0)} ms`);
}
const timings = await editLatency(servers.native);
console.log(
  `native analysis: first ${timings[0]} ms, after one edit ${timings.slice(1).join(", ")} ms (best ${Math.min(...timings.slice(1))} ms)`,
);
fs.rmSync(dir, { recursive: true, force: true });
