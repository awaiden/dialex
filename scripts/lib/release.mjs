// Pure helpers for scripts/release.mjs. They only read and return text, so they are easy to test.
import fs from "node:fs";
import path from "node:path";

import { releaseNotes } from "../release-notes.mjs";

/** Packages that share one version number. */
export const PACKAGES = ["core", "cli", "mcp", "vscode"];
export const REPO = "https://github.com/awaiden/dialex";

const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
export const isVersion = (text) => VERSION.test(text);

const BUMPS = ["major", "minor", "patch"];
const BUMP_HEADINGS = { major: "Major Changes", minor: "Minor Changes", patch: "Patch Changes" };

/** Parses one `.changeset/*.md` file: `{ releases: { "pkg": "minor" }, summary }`. */
export function parseChangeset(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error("A changeset must start with a --- frontmatter block");
  const releases = {};
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^\s*["']?([^"':]+)["']?\s*:\s*["']?(\w+)["']?\s*$/.exec(line);
    if (!entry) continue;
    if (!BUMPS.includes(entry[2])) throw new Error(`Unknown bump "${entry[2]}" for ${entry[1]}`);
    releases[entry[1].trim()] = entry[2];
  }
  return { releases, summary: match[2].trim() };
}

/** Pending changesets, in file-name order. `README.md` is documentation, not a change. */
export function readChangesets(root) {
  const dir = path.join(root, ".changeset");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort()
    .map((name) => ({ name, ...parseChangeset(fs.readFileSync(path.join(dir, name), "utf-8")) }));
}

/** The largest bump a changeset asks for. */
export function highestBump(releases) {
  const kinds = Object.values(releases);
  return BUMPS.find((bump) => kinds.includes(bump));
}

/**
 * The changelog text for a set of changesets: one section per bump (major, minor, patch), one list
 * item per changeset. Extra paragraphs, tables and code blocks stay inside the item.
 */
export function changesetSections(changesets) {
  const sections = [];
  for (const bump of BUMPS) {
    const items = changesets
      .filter((c) => c.summary && highestBump(c.releases) === bump)
      .map((c) => {
        const [first, ...rest] = c.summary.split("\n");
        return ["- " + first, ...rest.map((line) => (line.trim() ? "  " + line : ""))].join("\n");
      });
    if (items.length) sections.push(`### ${BUMP_HEADINGS[bump]}\n\n${items.join("\n\n")}`);
  }
  return sections.join("\n\n");
}

/** The text under a stray `## [Unreleased]` heading (not used any more; entries are changesets). */
export function unreleasedBody(changelog) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.startsWith("## [Unreleased]"));
  if (start === -1) return "";
  const end = lines.findIndex((line, i) => i > start && /^## \[|^\[[^\]]+\]: /.test(line));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

/**
 * Adds `## [version] - date` with `body` above the newest release, and the matching compare link.
 */
export function releaseChangelog(changelog, version, date, body) {
  if (!body.trim()) throw new Error("There is nothing to release: no changeset has a description.");
  if (new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\]`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }

  const lines = changelog.split("\n");
  const firstRelease = lines.findIndex((line) => /^## \[\d/.test(line));
  const at = firstRelease === -1 ? lines.length : firstRelease;
  lines.splice(at, 0, `## [${version}] - ${date}`, "", body.trim(), "");

  const isLink = (line) => /^\[[^\]]+\]: /.test(line);
  const firstLink = lines.findIndex(isLink);
  if (firstLink !== -1) {
    const unreleased = lines[firstLink].startsWith("[Unreleased]: ");
    const previousLine = lines
      .slice(firstLink)
      .find((line) => isLink(line) && !line.startsWith("[Unreleased]: "));
    const previous = previousLine && /^\[([^\]]+)\]/.exec(previousLine)?.[1];
    const link = previous
      ? `[${version}]: ${REPO}/compare/v${previous}...v${version}`
      : `[${version}]: ${REPO}/releases/tag/v${version}`;
    if (unreleased) {
      lines.splice(firstLink, 1, `[Unreleased]: ${REPO}/compare/v${version}...HEAD`, link);
    } else {
      lines.splice(firstLink, 0, link);
    }
  }
  return lines.join("\n");
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
 * Checks to make before bumping anything (the version step cannot be undone half way): the
 * packages agree, bun.lock matches them, and there is at least one changeset to release.
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
  if (unreleasedBody(changelog)) {
    errors.push(
      "CHANGELOG.md has entries under Unreleased. Move them into a changeset (bun run changeset).",
    );
  }
  let changesets = [];
  try {
    changesets = readChangesets(root);
  } catch (error) {
    errors.push(error.message);
  }
  if (!changesets.some((c) => c.summary)) {
    errors.push("There are no changesets to release. Add one with: bun run changeset");
  }
  return errors;
}
