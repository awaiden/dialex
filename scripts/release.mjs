#!/usr/bin/env node
// The parts of a release that `bumpp` cannot do. `bun run release` runs:
//
//   release.mjs --preflight   before bumping: packages agree, bun.lock matches, Unreleased has entries
//   bumpp                     asks for the version, bumps the four packages, then runs --prepare,
//                             commits everything and tags it (see bumpp.config.ts)
//   release.mjs --prepare     after bumping: moves the changelog entries under the new version,
//                             rebuilds bun.lock and the docs pages, and checks that it all agrees
//
//   release.mjs --check [vX.Y.Z]   verify a release is consistent (the release workflow runs this)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkRelease,
  isVersion,
  preflightErrors,
  readVersions,
  releaseChangelog,
} from "./lib/release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const positional = args.filter((a) => !a.startsWith("--"));

const fail = (messages) => {
  console.error(
    []
      .concat(messages)
      .map((m) => `✖ ${m}`)
      .join("\n"),
  );
  process.exit(1);
};

function run(label, command, commandArgs, { optional = false } = {}) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.status === 0) return true;
  if (optional) {
    console.warn(`  (skipped: ${command} ${commandArgs.join(" ")} did not succeed)`);
    return false;
  }
  return fail(`${label} failed.`);
}

if (flag("--check")) {
  const tag = positional[0];
  const { version, errors } = checkRelease(root, tag);
  if (errors.length) fail(errors);
  console.log(
    `✔ Release ${version} is consistent (packages, bun.lock, changelog${tag ? ", tag" : ""}).`,
  );
} else if (flag("--preflight")) {
  const errors = preflightErrors(root);
  if (!flag("--allow-dirty")) {
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf-8" });
    if (status.stdout.trim())
      errors.push("The working tree has uncommitted changes. Commit or stash them first.");
  }
  if (errors.length) fail(errors);
  console.log(`✔ Ready to release from ${readVersions(root).core}.`);
} else if (flag("--prepare")) {
  // bumpp has already written the new version into the four package.json files.
  const version = readVersions(root).core;
  if (!isVersion(version)) fail(`"${version}" is not a version`);
  const date = new Date().toISOString().slice(0, 10);

  const changelogPath = path.join(root, "CHANGELOG.md");
  try {
    fs.writeFileSync(
      changelogPath,
      releaseChangelog(fs.readFileSync(changelogPath, "utf-8"), version, date),
    );
  } catch (error) {
    fail(error.message);
  }
  console.log(`✔ CHANGELOG.md: Unreleased → ${version} (${date})`);

  // bun.lock stores each workspace's version and `bun pm pack` reads it, so it must be rebuilt.
  fs.rmSync(path.join(root, "bun.lock"), { force: true });
  run("Regenerating bun.lock", "bun", ["install"]);
  run("Regenerating the docs changelog pages", "bun", [
    "run",
    "--cwd",
    "apps/docs",
    "generate-changelog",
  ]);
  run("Regenerating llms.txt", "bun", ["run", "--cwd", "apps/docs", "generate-llms"]);
  run("Formatting", "vp", ["fmt"], { optional: true });

  const { errors } = checkRelease(root);
  if (errors.length) fail(errors);
  console.log(`\n✔ Release ${version} is prepared and consistent.`);
} else {
  console.error(
    "Usage: node scripts/release.mjs --preflight | --prepare | --check [vX.Y.Z]\nTo release, run: bun run release",
  );
  process.exit(1);
}
