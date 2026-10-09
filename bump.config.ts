import { defineConfig } from "bumpp";

// `bun run release` runs `release.mjs --preflight` and then this. bumpp asks for the version,
// bumps the four packages, runs `--prepare` (changelog, bun.lock, docs pages), commits everything
// and tags it. It does not push: push, wait for CI, then push the tag (see RELEASING.md).
export default defineConfig({
  files: ["packages/core", "packages/cli", "packages/mcp", "packages/vscode"].map(
    (dir) => `${dir}/package.json`,
  ),
  commit: "Release v%s",
  tag: "v%s",
  all: true,
  push: false,
  execute: "node scripts/release.mjs --prepare",
});
