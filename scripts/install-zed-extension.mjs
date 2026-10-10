// Builds the Zed extension and installs it into the local Zed, the same way a dev install ends up:
// `extensions/installed/dialex/{extension.toml,extension.wasm}`. Restart Zed afterwards.
//
//   node scripts/install-zed-extension.mjs
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const extension = join(root, "packages/zed");

const dataDir =
  platform() === "darwin"
    ? join(homedir(), "Library/Application Support/Zed")
    : platform() === "win32"
      ? join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData/Local"), "Zed")
      : join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local/share"), "zed");

if (!existsSync(join(dataDir, "extensions"))) {
  console.error(`Zed's data directory was not found at ${dataDir}. Start Zed once first.`);
  process.exit(1);
}

execFileSync("cargo", ["build", "--release", "--target", "wasm32-wasip2", "--locked"], {
  cwd: extension,
  stdio: "inherit",
});

const target = join(dataDir, "extensions/installed/dialex");
mkdirSync(target, { recursive: true });
copyFileSync(join(extension, "extension.toml"), join(target, "extension.toml"));
copyFileSync(
  join(extension, "target/wasm32-wasip2/release/zed_dialex.wasm"),
  join(target, "extension.wasm"),
);

console.log(`Installed the Dialex extension into ${target}. Restart Zed to load it.`);
