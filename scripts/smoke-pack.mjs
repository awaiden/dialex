// Packs dialexjs, @dialexjs/config, @dialexjs/cli, @dialexjs/mcp and the editor and lint packages, installs the tarballs into an empty project and
// runs them, so a broken `exports` map, a missing file or a stale internal version fails here
// instead of after publishing. Used by CI and the Release workflow.
import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  writeFileSync,
  closeSync,
} from "node:fs";
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
  for (const dir of ["core", "config", "cli", "mcp", "language-server", "eslint-plugin"]) {
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

  // The resolver the native binary runs: it must write the resolved config of an empty project
  const resolved = JSON.parse(run(bin("dialex-config"), ["--print"], app));
  if (resolved.config?.defaultLocale !== "en") {
    throw new Error("@dialexjs/config did not resolve the defaults of an empty project");
  }

  const plugin = run(
    "node",
    [
      "-e",
      'import("@dialexjs/eslint-plugin").then((m) => console.log(Object.keys(m.default.rules).length))',
    ],
    app,
  ).trim();
  if (plugin !== "5") throw new Error(`@dialexjs/eslint-plugin has ${plugin} rules, expected 5`);

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

  // The native binary, when this machine has one built and assembled into its platform package
  // (the Release workflow does; a plain checkout does not): `npm install` with scripts must put
  // the binary where the launcher was, and `--ignore-scripts` must leave a launcher that works.
  const platform = `${process.platform}-${process.arch}`;
  const nativePackage = join(root, "packages", `cli-${platform}`);
  const nativeFile = join(nativePackage, "bin", process.platform === "win32" ? "dx.exe" : "dx");
  if (existsSync(nativeFile)) {
    run("bun", ["pm", "pack", "--destination", packs], nativePackage);
    const nativeTarball = join(packs, `dialexjs-cli-${platform}-${version}.tgz`);
    const nativeOverrides = {
      ...overrides,
      [`@dialexjs/cli-${platform}`]: `file:${nativeTarball}`,
    };

    const install = (name, flags) => {
      const dir = join(work, name);
      mkdirSync(dir);
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({
          name: "smoke-native",
          type: "module",
          dependencies: { "@dialexjs/cli": overrides["@dialexjs/cli"] },
          overrides: nativeOverrides,
        }),
      );
      run("npm", ["install", "--no-audit", "--no-fund", ...flags], dir);
      return dir;
    };
    const launcherOf = (dir) => join(dir, "node_modules/@dialexjs/cli/bin/launcher.mjs");
    const isScript = (file) => {
      const fd = openSync(file, "r");
      const head = Buffer.alloc(2);
      readSync(fd, head, 0, 2, 0);
      closeSync(fd);
      return head.toString() === "#!";
    };

    const withScripts = install("native-scripts", []);
    const without = install("native-no-scripts", ["--ignore-scripts"]);
    for (const dir of [withScripts, without]) {
      const out = run(join(dir, "node_modules", ".bin", "dx"), ["--version"], dir).trim();
      if (out !== version) throw new Error(`native dx printed "${out}", expected "${version}"`);
      // a command the native binary hands to the Node CLI still works from either layout
      run(join(dir, "node_modules", ".bin", "dx"), ["export", "--help"], dir);

      // `check` reads the config the binary has `@dialexjs/config` write, found next to the
      // binary in this install layout, with nothing in the environment to point at it
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(
        join(dir, "dialex.config.ts"),
        'export default { defaultLocale: "en", locales: ["en", "tr"] };\n',
      );
      writeFileSync(
        join(dir, "src", "a.content.ts"),
        'export default { name: "a", dictionary: { en: { title: "T" }, tr: { title: "B" } } };\n',
      );
      // DIALEX_NATIVE=1: fail instead of quietly handing the command to the Node CLI
      const checked = JSON.parse(
        execFileSync(join(dir, "node_modules", ".bin", "dx"), ["check", "--json"], {
          cwd: dir,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "inherit"],
          env: { ...process.env, DIALEX_NATIVE: "1" },
        }),
      );
      if (checked.success !== true) throw new Error("native `dx check` reported problems");
      if (!existsSync(join(dir, ".dialex", "config.json"))) {
        throw new Error(
          `native \`dx check\` did not write .dialex/config.json in ${dir}: ${JSON.stringify(checked)}`,
        );
      }
    }
    if (!["win32"].includes(process.platform) && isScript(launcherOf(withScripts))) {
      throw new Error("npm install did not put the native binary in place of the launcher");
    }
    if (!isScript(launcherOf(without))) {
      throw new Error("--ignore-scripts must keep the JS launcher");
    }
  }

  console.log(`smoke test passed for ${Object.keys(overrides).length} packages at ${version}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
