import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PACKAGES,
  checkRelease,
  lockedVersion,
  preflightErrors,
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

describe("releaseChangelog", () => {
  it("moves the Unreleased entries under the new version and keeps an empty Unreleased", () => {
    const out = releaseChangelog(CHANGELOG, "0.5.0", "2026-11-01");
    expect(out).toContain(
      "## [Unreleased]\n\n## [0.5.0] - 2026-11-01\n\n### Added\n\n- Something new.",
    );
    expect(unreleasedBody(out)).toBe("");
    expect(out.indexOf("## [0.5.0]")).toBeLessThan(out.indexOf("## [0.4.0]"));
  });

  it("updates the compare links", () => {
    const out = releaseChangelog(CHANGELOG, "0.5.0", "2026-11-01");
    expect(out).toContain("[Unreleased]: https://github.com/awaiden/dialex/compare/v0.5.0...HEAD");
    expect(out).toContain("[0.5.0]: https://github.com/awaiden/dialex/compare/v0.4.0...v0.5.0");
    expect(out).toContain("[0.4.0]: https://github.com/awaiden/dialex/compare/v0.3.0...v0.4.0");
    expect(out.match(/^\[Unreleased\]:/gm)?.length).toBe(1);
  });

  it("refuses an empty Unreleased section unless allowed", () => {
    const empty = CHANGELOG.replace("### Added\n\n- Something new.\n\n", "");
    expect(() => releaseChangelog(empty, "0.5.0", "2026-11-01")).toThrow(/empty/);
    expect(releaseChangelog(empty, "0.5.0", "2026-11-01", { allowEmpty: true })).toContain(
      "## [0.5.0] - 2026-11-01",
    );
  });

  it("refuses a version that already has a section", () => {
    expect(() => releaseChangelog(CHANGELOG, "0.4.0", "2026-11-01")).toThrow(/already has/);
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
  function repo(changelog, lockVersion = "0.4.0") {
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
    return dir;
  }

  it("passes when there is something to release and everything agrees", () => {
    expect(preflightErrors(repo(CHANGELOG))).toEqual([]);
  });

  it("stops before bumping when Unreleased is empty or bun.lock is stale", () => {
    const empty = CHANGELOG.replace("### Added\n\n- Something new.\n\n", "");
    expect(preflightErrors(repo(empty)).join("\n")).toMatch(/Unreleased section .* is empty/);
    expect(preflightErrors(repo(CHANGELOG, "0.3.0")).join("\n")).toMatch(
      /bun\.lock records core 0\.3\.0/,
    );
  });
});
