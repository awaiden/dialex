// Packs dialexjs, @dialexjs/cli and @dialexjs/mcp, installs the tarballs into an empty project and
// runs them, so a broken `exports` map, a missing file or a stale internal version fails here
// instead of after publishing. Used by CI and the Release workflow.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "dialex-smoke-"));
const run = (cmd, args, cwd, input) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"], input });

try {
  const packs = join(work, "packs");
  mkdirSync(packs);
  // The packages depend on each other by exact version. Overrides make npm use the tarballs built
  // here for those dependencies too, even when the same version is already on the registry.
  const overrides = {};
  for (const dir of ["core", "cli", "mcp", "language-server"]) {
    const pkg = JSON.parse(readFileSync(join(root, "packages", dir, "package.json"), "utf8"));
    run("bun", ["pm", "pack", "--destination", packs], join(root, "packages", dir));
    const tarball = join(
      packs,
      `${pkg.name.replace("@", "").replace("/", "-")}-${pkg.version}.tgz`,
    );
    overrides[pkg.name] = `file:${tarball}`;
  }

  const app = join(work, "app");
  mkdirSync(app);
  writeFileSync(
    join(app, "package.json"),
    JSON.stringify({ name: "smoke", type: "module", dependencies: overrides, overrides }),
  );
  run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts"], app);

  const version = JSON.parse(
    readFileSync(join(root, "packages/core/package.json"), "utf8"),
  ).version;
  const bin = (name) => join(app, "node_modules", ".bin", name);

  for (const name of ["dx", "dialex"]) {
    const out = run(bin(name), ["--version"], app).trim();
    if (out !== version)
      throw new Error(`${name} --version printed "${out}", expected "${version}"`);
  }

  const core = run(
    "node",
    [
      "-e",
      'import("dialexjs").then((m) => console.log(typeof m.createT + typeof m.formatMessage))',
    ],
    app,
  ).trim();
  if (core !== "functionfunction") throw new Error("dialexjs is missing createT/formatMessage");
  for (const sub of ["dialexjs/server", "dialexjs/icu", "@dialexjs/cli/api"]) {
    run(
      "node",
      [
        "-e",
        `import(${JSON.stringify(sub)}).catch((e) => { console.error(e.message); process.exit(1); })`,
      ],
      app,
    );
  }

  const reply = run(
    "node",
    [join(app, "node_modules/@dialexjs/mcp/dist/index.mjs")],
    app,
    '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1"}}}\n',
  );
  if (!reply.includes('"serverInfo"')) throw new Error("@dialexjs/mcp did not answer initialize");

  // The language server speaks LSP with Content-Length framing over stdio. Editors keep stdin
  // open, so the session is driven like an editor would: initialize, wait, shut down.
  await new Promise((resolve, reject) => {
    const server = spawn(
      "node",
      [join(app, "node_modules/@dialexjs/language-server/dist/index.mjs"), "--stdio"],
      { cwd: app, stdio: ["pipe", "pipe", "inherit"] },
    );
    const frame = (message) => {
      const body = JSON.stringify({ jsonrpc: "2.0", ...message });
      return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
    };
    let output = "";
    let stage = 0;
    const timeout = setTimeout(() => {
      server.kill();
      reject(new Error("@dialexjs/language-server did not answer initialize in time"));
    }, 15000);

    server.stdout.on("data", (chunk) => {
      output += chunk;
      if (stage === 0 && output.includes("dialex-language-server")) {
        stage = 1;
        server.stdin.write(frame({ method: "initialized", params: {} }));
        server.stdin.write(frame({ id: 2, method: "shutdown" }));
        server.stdin.write(frame({ method: "exit" }));
      }
    });
    server.on("error", reject);
    server.on("exit", (code) => {
      clearTimeout(timeout);
      if (stage === 1 && code === 0) resolve();
      else reject(new Error(`@dialexjs/language-server exited with ${code} at stage ${stage}`));
    });
    server.stdin.write(
      frame({
        id: 1,
        method: "initialize",
        params: { processId: null, rootUri: null, capabilities: {} },
      }),
    );
  });

  console.log(`smoke test passed for ${Object.keys(overrides).length} packages at ${version}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
