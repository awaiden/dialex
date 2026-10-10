// Packs dialexjs, @dialexjs/cli and @dialexjs/mcp, installs the tarballs into an empty project and
// runs them, so a broken `exports` map, a missing file or a stale internal version fails here
// instead of after publishing. Used by CI and the Release workflow.
import { execFileSync } from "node:child_process";
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
  const tarballs = [];
  for (const dir of ["core", "cli", "mcp"]) {
    const pkg = JSON.parse(readFileSync(join(root, "packages", dir, "package.json"), "utf8"));
    run("bun", ["pm", "pack", "--destination", packs], join(root, "packages", dir));
    tarballs.push(join(packs, `${pkg.name.replace("@", "").replace("/", "-")}-${pkg.version}.tgz`));
  }

  const app = join(work, "app");
  mkdirSync(app);
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "smoke", type: "module" }));
  run("npm", ["install", "--no-audit", "--no-fund", "--ignore-scripts", ...tarballs], app);

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

  console.log(`smoke test passed for ${tarballs.length} packages at ${version}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
