// Keeps the (private, unpublished) VS Code extension on the same version as dialexjs, so the
// `.vsix` attached to a release matches its tag. Run by `bun run changeset:version`.
import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const core = read("packages/core/package.json");
const vscode = read("packages/vscode/package.json");

if (vscode.version !== core.version) {
  vscode.version = core.version;
  writeFileSync("packages/vscode/package.json", `${JSON.stringify(vscode, null, 2)}\n`);
  console.log(`dialex-vscode -> ${core.version}`);
}
