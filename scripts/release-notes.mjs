#!/usr/bin/env node
// Prints the CHANGELOG.md section for a version (`v0.2.2` or `0.2.2`) and exits 1 if it is
// missing or empty. The release workflow uses it for the GitHub Release body and as a gate.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function releaseNotes(changelog, version) {
  const wanted = version.replace(/^v/, "");
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${wanted}]`));
  if (start === -1) return undefined;
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## ["));
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .replace(/\n\[[^\]]+\]: .*$/gs, "")
    .trim();
  return body || undefined;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!version) {
    console.error("Usage: release-notes.mjs <version|tag>");
    process.exit(1);
  }
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../CHANGELOG.md");
  const notes = releaseNotes(fs.readFileSync(file, "utf-8"), version);
  if (!notes) {
    console.error(
      `CHANGELOG.md has no entry for ${version}. Add a "## [${version.replace(/^v/, "")}]" section.`,
    );
    process.exit(1);
  }
  console.log(notes);
}
