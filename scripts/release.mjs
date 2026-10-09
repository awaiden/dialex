#!/usr/bin/env node
// Releases the packages with Changesets and keeps one root CHANGELOG.md.
//
//   bun run changeset         describe a change (a file in .changeset/)
//   bun run release           bump, update the changelog, rebuild bun.lock and the docs, commit, tag
//   bun run release --dry-run show what would be released
//   node scripts/release.mjs --check [vX.Y.Z]   verify a release is consistent (CI runs this)
//
// `changeset version` decides the bump from the changesets and keeps the four packages on one
// version. It would write per-package changelogs, so it is configured with `changelog: false` and
// this script writes the root changelog from the changeset files before they are consumed.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACKAGES,
  changesetSections,
  checkRelease,
  isVersion,
  preflightErrors,
  readChangesets,
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
  process.exit(0);
}

const errors = preflightErrors(root);
if (!flag("--allow-dirty") && !flag("--dry-run")) {
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf-8" });
  if (status.stdout.trim())
    errors.push("The working tree has uncommitted changes. Commit or stash them first.");
}
if (errors.length) fail(errors);

const changesets = readChangesets(root);
const entries = changesetSections(changesets);

if (flag("--dry-run")) {
  console.log(`Changesets to release: ${changesets.map((c) => c.name).join(", ")}\n`);
  run("Planned version bump", "changeset", ["status"]);
  console.log(`\nChangelog entry:\n\n${entries}\n`);
  process.exit(0);
}

run("Bumping versions (changeset version)", "changeset", ["version"]);

// `changeset version` skips the private VS Code package, so it follows the others.
const version = readVersions(root).core;
if (!isVersion(version)) fail(`"${version}" is not a version`);
const vscodePackage = path.join(root, "packages", "vscode", "package.json");
fs.writeFileSync(
  vscodePackage,
  fs.readFileSync(vscodePackage, "utf-8").replace(/("version":\s*")[^"]+(")/, `$1${version}$2`),
);

const date = new Date().toISOString().slice(0, 10);
const changelogPath = path.join(root, "CHANGELOG.md");
try {
  fs.writeFileSync(
    changelogPath,
    releaseChangelog(fs.readFileSync(changelogPath, "utf-8"), version, date, entries),
  );
} catch (error) {
  fail(error.message);
}
console.log(`✔ CHANGELOG.md: added ${version} (${date})`);

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

const check = checkRelease(root);
if (check.errors.length) fail(check.errors);
console.log(`\n✔ Release ${version} is prepared and consistent.`);

if (flag("--gate")) run("Running the full gate", "bun", ["run", "ready"]);

if (flag("--no-commit")) {
  console.log(
    `\nNext:\n  git add -A && git commit -m "Release v${version}"\n  git tag -a v${version} -m "v${version}"`,
  );
} else {
  run("Committing", "git", ["add", "-A"]);
  run("Committing", "git", ["commit", "-m", `Release v${version}`]);
  run("Tagging", "git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
}
console.log(`\nNext:\n  git push origin main      # wait for CI\n  git push origin v${version}`);
