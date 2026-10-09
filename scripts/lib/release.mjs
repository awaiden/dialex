// Pure helpers for scripts/release.mjs. They only read and return text, so they are easy to test.
import fs from "node:fs";
import path from "node:path";
import { releaseNotes } from "../release-notes.mjs";

/** Packages that share one version number. */
export const PACKAGES = ["core", "cli", "mcp", "vscode"];
export const REPO = "https://github.com/awaiden/dialex";

const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
export const isVersion = (text) => VERSION.test(text);

/** The text under `## [Unreleased]`, up to the next version heading or the link list. */
export function unreleasedBody(changelog) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.startsWith("## [Unreleased]"));
  if (start === -1) throw new Error('CHANGELOG.md has no "## [Unreleased]" section');
  const end = lines.findIndex((line, i) => i > start && /^## \[|^\[[^\]]+\]: /.test(line));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

/**
 * Turns the Unreleased section into a release: a fresh empty Unreleased on top, the entries under
 * `## [version] - date`, and the compare links at the bottom updated.
 */
export function releaseChangelog(changelog, version, date, { allowEmpty = false } = {}) {
  const body = unreleasedBody(changelog);
  if (!body && !allowEmpty) {
    throw new Error("The Unreleased section of CHANGELOG.md is empty. Describe the changes first.");
  }
  if (new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\]`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }

  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.startsWith("## [Unreleased]"));
  const end = lines.findIndex((line, i) => i > start && /^## \[|^\[[^\]]+\]: /.test(line));
  const section = ["## [Unreleased]", "", `## [${version}] - ${date}`, ""];
  if (body) section.push(body, "");
  const next = [
    ...lines.slice(0, start),
    ...section,
    ...lines.slice(end === -1 ? lines.length : end),
  ];

  const linkIndex = next.findIndex((line) => line.startsWith("[Unreleased]: "));
  if (linkIndex === -1) return next.join("\n");
  const previous = /^\[([^\]]+)\]: /.exec(next[linkIndex + 1] ?? "")?.[1];
  const links = [`[Unreleased]: ${REPO}/compare/v${version}...HEAD`];
  links.push(
    previous
      ? `[${version}]: ${REPO}/compare/v${previous}...v${version}`
      : `[${version}]: ${REPO}/releases/tag/v${version}`,
  );
  next.splice(linkIndex, 1, ...links);
  return next.join("\n");
}

export function readVersions(root) {
  return Object.fromEntries(
    PACKAGES.map((name) => [
      name,
      JSON.parse(fs.readFileSync(path.join(root, "packages", name, "package.json"), "utf-8"))
        .version,
    ]),
  );
}

/** The version `bun.lock` records for a workspace package, or `undefined`. */
export function lockedVersion(lockText, name) {
  const match = new RegExp(
    `"packages/${name}": \\{\\s*"name": "[^"]+",\\s*"version": "([^"]+)"`,
  ).exec(lockText);
  return match?.[1];
}

/**
 * Everything that must agree before a release: the four package versions, the tag, `bun.lock`
 * (which `bun pm pack` reads to write real dependency versions) and the changelog.
 */
export function checkRelease(root, tag) {
  const errors = [];
  const versions = readVersions(root);
  const unique = new Set(Object.values(versions));
  if (unique.size > 1) {
    errors.push(
      `Package versions differ: ${Object.entries(versions)
        .map(([n, v]) => `${n} ${v}`)
        .join(", ")}`,
    );
  }
  const version = versions.core;

  if (tag && tag.replace(/^v/, "") !== version) {
    errors.push(`The tag is ${tag.replace(/^v/, "")} but the packages are ${version}`);
  }

  const lock = fs.readFileSync(path.join(root, "bun.lock"), "utf-8");
  for (const name of PACKAGES) {
    const locked = lockedVersion(lock, name);
    if (locked !== versions[name]) {
      errors.push(
        `bun.lock records ${name} ${locked ?? "(nothing)"} but package.json says ${versions[name]}. Regenerate it: rm bun.lock && bun install`,
      );
    }
  }

  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
  if (!releaseNotes(changelog, version)) {
    errors.push(`CHANGELOG.md has no entry for ${version}`);
  }
  return { version, errors };
}

/**
 * Checks to make before bumping anything (`bumpp` does not roll back what it already wrote):
 * the packages agree, bun.lock matches them, and there is something to release.
 */
export function preflightErrors(root) {
  const errors = [];
  const versions = readVersions(root);
  if (new Set(Object.values(versions)).size > 1) {
    errors.push(
      `Package versions differ: ${Object.entries(versions)
        .map(([n, v]) => `${n} ${v}`)
        .join(", ")}`,
    );
  }
  const lock = fs.readFileSync(path.join(root, "bun.lock"), "utf-8");
  for (const name of PACKAGES) {
    const locked = lockedVersion(lock, name);
    if (locked !== versions[name]) {
      errors.push(
        `bun.lock records ${name} ${locked ?? "(nothing)"} but package.json says ${versions[name]}`,
      );
    }
  }
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
  if (!unreleasedBody(changelog)) {
    errors.push("The Unreleased section of CHANGELOG.md is empty. Describe the changes first.");
  }
  return errors;
}
