// Writes the per-platform packages that carry the native `dx` and `dialex-language-server` binaries.
//
//   node scripts/native-packages.mjs --skeleton
//       package.json files only (what is committed)
//   node scripts/native-packages.mjs --target linux-x64 --binary crates/target/release/dx \
//       --lsp-binary crates/target/release/dialex-language-server
//       also copies the binaries into the package, ready to publish
import fs from "node:fs";
import path from "node:path";

export const TARGETS = {
  "linux-x64": { os: "linux", cpu: "x64", file: "dx", lsp: "dialex-language-server" },
  "linux-arm64": { os: "linux", cpu: "arm64", file: "dx", lsp: "dialex-language-server" },
  "darwin-x64": { os: "darwin", cpu: "x64", file: "dx", lsp: "dialex-language-server" },
  "darwin-arm64": { os: "darwin", cpu: "arm64", file: "dx", lsp: "dialex-language-server" },
  "win32-x64": { os: "win32", cpu: "x64", file: "dx.exe", lsp: "dialex-language-server.exe" },
  "win32-arm64": { os: "win32", cpu: "arm64", file: "dx.exe", lsp: "dialex-language-server.exe" },
};

const root = path.resolve(import.meta.dirname, "..");
const cli = JSON.parse(fs.readFileSync(path.join(root, "packages/cli/package.json"), "utf-8"));

export function writePackage(target) {
  const info = TARGETS[target];
  if (!info) throw new Error(`Unknown target "${target}"`);
  const dir = path.join(root, "packages", `cli-${target}`);
  fs.mkdirSync(path.join(dir, "bin"), { recursive: true });

  const manifest = {
    name: `@dialexjs/cli-${target}`,
    version: cli.version,
    description: `The native dialex binaries for ${target}. Installed by @dialexjs/cli, not used directly.`,
    license: cli.license,
    author: cli.author,
    repository: cli.repository,
    homepage: cli.homepage,
    bugs: cli.bugs,
    os: [info.os],
    cpu: [info.cpu],
    files: ["bin"],
    publishConfig: cli.publishConfig,
  };
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(
    path.join(dir, "README.md"),
    `# @dialexjs/cli-${target}\n\nThe native \`dx\` and \`dialex-language-server\` binaries of [@dialexjs/cli](https://www.npmjs.com/package/@dialexjs/cli) for ${target}.\nIt is installed automatically as an optional dependency; install \`@dialexjs/cli\` instead.\n`,
  );
  fs.writeFileSync(path.join(dir, "bin", ".gitkeep"), "");
  return { dir, file: info.file, lsp: info.lsp };
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (args.includes("--skeleton")) {
    for (const target of Object.keys(TARGETS)) writePackage(target);
    console.log(`Wrote ${Object.keys(TARGETS).length} platform packages`);
  } else {
    const target = flag("--target");
    const binary = flag("--binary");
    const lspBinary = flag("--lsp-binary");
    if (!target || !binary) {
      throw new Error("usage: --target <platform-arch> --binary <path> [--lsp-binary <path>]");
    }
    const { dir, file, lsp } = writePackage(target);
    for (const [source, name] of [
      [binary, file],
      [lspBinary, lsp],
    ]) {
      if (!source) continue;
      const destination = path.join(dir, "bin", name);
      fs.copyFileSync(path.resolve(source), destination);
      fs.chmodSync(destination, 0o755);
      console.log(`Wrote ${path.relative(root, destination)}`);
    }
  }
}
