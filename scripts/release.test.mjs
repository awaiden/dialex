import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PACKAGES,
  changesetSections,
  checkRelease,
  highestBump,
  lockedVersion,
  parseChangeset,
  preflightErrors,
  readChangesets,
  releaseChangelog,
  unreleasedBody,
} from "./lib/release.mjs";

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

### Added

- Something new.

## [0.4.0] - 2026-10-09

### Fixed

- Old fix.

[Unreleased]: https://github.com/awaiden/dialex/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/awaiden/dialex/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/awaiden/dialex/releases/tag/v0.3.0
`;

describe("parseChangeset and readChangesets", () => {
  it("reads packages, bumps and the summary", () => {
    const parsed = parseChangeset(`---
"dialexjs": minor
'@dialexjs/cli': patch
---

Typed arguments.

A second paragraph.
`);
    expect(parsed.releases).toEqual({ dialexjs: "minor", "@dialexjs/cli": "patch" });
    expect(parsed.summary).toBe("Typed arguments.\n\nA second paragraph.");
    expect(highestBump(parsed.releases)).toBe("minor");
  });

  it("rejects a missing frontmatter or an unknown bump", () => {
    expect(() => parseChangeset("no frontmatter")).toThrow(/frontmatter/);
    expect(() => parseChangeset('---\n"dialexjs": huge\n---\nx')).toThrow(/Unknown bump/);
  });

  it("lists pending changesets and ignores the README", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-changesets-"));
    fs.mkdirSync(path.join(dir, ".changeset"));
    fs.writeFileSync(path.join(dir, ".changeset", "README.md"), "# docs");
    fs.writeFileSync(path.join(dir, ".changeset", "config.json"), "{}");
    fs.writeFileSync(
      path.join(dir, ".changeset", "b-fix.md"),
      '---\n"dialexjs": patch\n---\nFixed it.',
    );
    fs.writeFileSync(
      path.join(dir, ".changeset", "a-feature.md"),
      '---\n"dialexjs": minor\n---\nAdded it.',
    );
    expect(readChangesets(dir).map((c) => c.name)).toEqual(["a-feature.md", "b-fix.md"]);
    expect(readChangesets(path.join(dir, "missing"))).toEqual([]);
  });
});

describe("changesetSections", () => {
  it("groups by the largest bump and keeps multi-paragraph entries inside their list item", () => {
    const text = changesetSections([
      { name: "a.md", releases: { dialexjs: "patch" }, summary: "Fixed a bug." },
      {
        name: "b.md",
        releases: { dialexjs: "minor", cli: "patch" },
        summary: "New feature.\n\n| a | b |\n| - | - |",
      },
      { name: "c.md", releases: { dialexjs: "major" }, summary: "Breaking." },
      { name: "d.md", releases: { dialexjs: "minor" }, summary: "" },
    ]);
    expect(text).toBe(
      "### Major Changes\n\n- Breaking.\n\n### Minor Changes\n\n- New feature.\n\n  | a | b |\n  | - | - |\n\n### Patch Changes\n\n- Fixed a bug.",
    );
  });
});

describe("releaseChangelog", () => {
  it("adds the new section above the newest release and updates the compare links", () => {
    const out = releaseChangelog(CHANGELOG, "0.5.0", "2026-11-01", "### Minor Changes\n\n- New.");
    expect(out.indexOf("## [0.5.0] - 2026-11-01")).toBeLessThan(out.indexOf("## [0.4.0]"));
    expect(out).toContain("## [0.5.0] - 2026-11-01\n\n### Minor Changes\n\n- New.\n\n## [0.4.0]");
    expect(out).toContain("[Unreleased]: https://github.com/awaiden/dialex/compare/v0.5.0...HEAD");
    expect(out).toContain("[0.5.0]: https://github.com/awaiden/dialex/compare/v0.4.0...v0.5.0");
    expect(out).toContain("[0.4.0]: https://github.com/awaiden/dialex/compare/v0.3.0...v0.4.0");
  });

  it("works without an Unreleased section or link", () => {
    const bare = CHANGELOG.replace(/## \[Unreleased\][\s\S]*?(?=## \[0\.4\.0\])/, "").replace(
      /\[Unreleased\]:.*\n/,
      "",
    );
    const out = releaseChangelog(bare, "0.5.0", "2026-11-01", "- New.");
    expect(out).toContain("[0.5.0]: https://github.com/awaiden/dialex/compare/v0.4.0...v0.5.0");
    expect(out).not.toContain("Unreleased");
    expect(out.indexOf("## [0.5.0]")).toBeLessThan(out.indexOf("## [0.4.0]"));
  });

  it("refuses an empty body and a version that already has a section", () => {
    expect(() => releaseChangelog(CHANGELOG, "0.5.0", "2026-11-01", "  ")).toThrow(
      /nothing to release/,
    );
    expect(() => releaseChangelog(CHANGELOG, "0.4.0", "2026-11-01", "- x")).toThrow(/already has/);
  });
});

describe("lockedVersion", () => {
  it("reads the workspace entry, not any package that shares the version", () => {
    const lock = `"workspaces": {
    "packages/core": {
      "name": "dialexjs",
      "version": "0.4.0",
    },
    "packages/cli": {
      "name": "@dialexjs/cli",
      "version": "0.3.0",
    },
  },
  "packages": { "left-pad": ["left-pad@0.4.0"] }`;
    expect(lockedVersion(lock, "core")).toBe("0.4.0");
    expect(lockedVersion(lock, "cli")).toBe("0.3.0");
    expect(lockedVersion(lock, "mcp")).toBeUndefined();
  });
});

describe("checkRelease", () => {
  function repo({
    versions = {},
    lock = {},
    changelog = CHANGELOG.replace("[Unreleased]\n\n### Added\n\n- Something new.", "[Unreleased]"),
  } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-release-"));
    const workspaces = [];
    for (const name of PACKAGES) {
      fs.mkdirSync(path.join(dir, "packages", name), { recursive: true });
      const version = versions[name] ?? "0.4.0";
      fs.writeFileSync(
        path.join(dir, "packages", name, "package.json"),
        JSON.stringify({ name, version }),
      );
      workspaces.push(
        `    "packages/${name}": {\n      "name": "${name}",\n      "version": "${lock[name] ?? version}",\n    },`,
      );
    }
    fs.writeFileSync(
      path.join(dir, "bun.lock"),
      `{\n  "workspaces": {\n${workspaces.join("\n")}\n  },\n}\n`,
    );
    fs.writeFileSync(path.join(dir, "CHANGELOG.md"), changelog);
    return dir;
  }

  it("passes when everything agrees", () => {
    expect(checkRelease(repo(), "v0.4.0").errors).toEqual([]);
  });

  it("catches differing package versions, a wrong tag, a stale lock and a missing changelog entry", () => {
    expect(checkRelease(repo({ versions: { mcp: "0.3.9" } })).errors[0]).toMatch(/differ/);
    expect(checkRelease(repo(), "v0.9.9").errors.join("\n")).toMatch(/tag is 0\.9\.9/);
    expect(checkRelease(repo({ lock: { cli: "0.3.0" } })).errors.join("\n")).toMatch(
      /bun\.lock records cli 0\.3\.0/,
    );
    const noEntry = repo({ changelog: "# Changelog\n\n## [Unreleased]\n" });
    expect(checkRelease(noEntry).errors.join("\n")).toMatch(/no entry for 0\.4\.0/);
  });
});

describe("preflightErrors", () => {
  function repo({
    changelog = "# Changelog\n\n## [0.4.0] - 2026-10-09\n",
    lockVersion = "0.4.0",
    changeset = true,
  } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-preflight-"));
    const workspaces = [];
    for (const name of PACKAGES) {
      fs.mkdirSync(path.join(dir, "packages", name), { recursive: true });
      fs.writeFileSync(
        path.join(dir, "packages", name, "package.json"),
        JSON.stringify({ name, version: "0.4.0" }),
      );
      workspaces.push(
        `    "packages/${name}": {\n      "name": "${name}",\n      "version": "${lockVersion}",\n    },`,
      );
    }
    fs.writeFileSync(
      path.join(dir, "bun.lock"),
      `{\n  "workspaces": {\n${workspaces.join("\n")}\n  },\n}\n`,
    );
    fs.writeFileSync(path.join(dir, "CHANGELOG.md"), changelog);
    fs.mkdirSync(path.join(dir, ".changeset"));
    if (changeset) {
      fs.writeFileSync(
        path.join(dir, ".changeset", "x.md"),
        '---\n"dialexjs": minor\n---\nSomething.',
      );
    }
    return dir;
  }

  it("passes when there is a changeset and everything agrees", () => {
    expect(preflightErrors(repo())).toEqual([]);
  });

  it("stops before bumping when there is no changeset, bun.lock is stale or entries sit under Unreleased", () => {
    expect(preflightErrors(repo({ changeset: false })).join("\n")).toMatch(/no changesets/);
    expect(preflightErrors(repo({ lockVersion: "0.3.0" })).join("\n")).toMatch(
      /bun\.lock records core 0\.3\.0/,
    );
    const stray = repo({
      changelog: "# Changelog\n\n## [Unreleased]\n\n- old style entry\n\n## [0.4.0] - x\n",
    });
    expect(preflightErrors(stray).join("\n")).toMatch(/under Unreleased/);
  });
});
