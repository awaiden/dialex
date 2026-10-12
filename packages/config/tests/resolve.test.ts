import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  ARTIFACT_PATH,
  ensureConfig,
  hashBytes,
  isFresh,
  parseStaticConfig,
  readArtifact,
  resolveConfig,
} from "../src/index.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

function project(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-config-"));
  dirs.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

describe("hashBytes", () => {
  it("is FNV-1a 64 (the same value the native reader computes)", () => {
    expect(hashBytes(new Uint8Array())).toBe("cbf29ce484222325");
    expect(hashBytes(new TextEncoder().encode("a"))).toBe("af63dc4c8601ec8c");
    expect(hashBytes(new TextEncoder().encode("foobar"))).toBe("85944171f73967e8");
  });
});

describe("resolveConfig", () => {
  const literal = `export default { defaultLocale: "tr", locales: ["tr", "en"], lint: { rules: { "unused-key": "off" } } };\n`;

  it("does not execute a config of plain literals, even when asked to run it", () => {
    const marker = path.join(os.tmpdir(), `dialex-literal-${process.pid}`);
    const dir = project({
      "dialex.config.ts": `import { missing } from "not-installed";\nexport default { defaultLocale: "tr", locales: ["tr", "en"], lint: { rules: { "unused-key": "off" } } };\n`,
    });
    try {
      const run = resolveConfig(dir, { mode: "run" });
      const stat = resolveConfig(dir, { mode: "static" });
      expect(run.config).toEqual(stat.config);
      // read from the syntax tree, so the unresolvable import never mattered
      expect(run).toMatchObject({ mode: "static", complete: true, file: "dialex.config.ts" });
      expect(run.notes).toEqual([]);
      expect(run.config.lint.rules).toEqual({ "unused-key": "off" });
    } finally {
      fs.rmSync(marker, { force: true });
    }
  });

  it("only running the file sees through spreads and computed values", () => {
    const dir = project({
      "base.ts": `export const base = { locales: ["en", "de"] };\n`,
      "dialex.config.ts": `import { base } from "./base";\nexport default { ...base, defaultLocale: "de" };\n`,
    });
    const stat = resolveConfig(dir, { mode: "static" });
    expect(stat.complete).toBe(false);
    expect(stat.config.locales).toEqual([]);

    const run = resolveConfig(dir, { mode: "run" });
    expect(run.config.locales).toEqual(["en", "de"]);
    expect(run.config.defaultLocale).toBe("de");
    // the imported helper is an input too
    expect(run.inputs.files.map((f) => f.path).sort()).toEqual(["base.ts", "dialex.config.ts"]);
  });

  it("records the environment variables the config read", () => {
    process.env.DIALEX_TEST_LOCALE = "fr";
    const dir = project({
      "dialex.config.ts": `export default { defaultLocale: process.env.DIALEX_TEST_LOCALE, locales: ["fr"] };\n`,
    });
    try {
      const resolved = resolveConfig(dir, { mode: "run" });
      expect(resolved.config.defaultLocale).toBe("fr");
      expect(resolved.inputs.env).toMatchObject({ DIALEX_TEST_LOCALE: "fr" });
    } finally {
      delete process.env.DIALEX_TEST_LOCALE;
    }
  });

  it("defaults when there is no config file", () => {
    const dir = project({});
    const resolved = resolveConfig(dir, { mode: "run" });
    expect(resolved.file).toBeNull();
    expect(resolved.config.defaultLocale).toBe("en");
    expect(resolved.inputs.missing).toContain("dialex.config.ts");
  });

  it("matches what the static parser reports for the same text", () => {
    const dir = project({ "dialex.config.ts": literal });
    expect(resolveConfig(dir, { mode: "static" }).config).toEqual(
      parseStaticConfig(literal).config,
    );
  });
});

describe("ensureConfig", () => {
  const first = `export default { locales: ["en"] };\n`;

  it("writes the artifact, reuses it, and rewrites it when an input changes", () => {
    const dir = project({ "dialex.config.ts": first });

    const written = ensureConfig(dir, { mode: "run" });
    expect(written.reused).toBe(false);
    expect(fs.existsSync(path.join(dir, ARTIFACT_PATH))).toBe(true);
    expect(readArtifact(dir)?.config.locales).toEqual(["en"]);

    expect(ensureConfig(dir, { mode: "run" }).reused).toBe(true);

    fs.writeFileSync(
      path.join(dir, "dialex.config.ts"),
      `export default { locales: ["en", "tr"] };\n`,
    );
    expect(isFresh(dir, readArtifact(dir)!)).toBe(false);
    const again = ensureConfig(dir, { mode: "run" });
    expect(again.reused).toBe(false);
    expect(again.config.config.locales).toEqual(["en", "tr"]);
  });

  it("goes stale when a higher-priority config file appears", () => {
    const dir = project({ "i18n.config.ts": `export default { locales: ["en"] };\n` });
    expect(ensureConfig(dir, { mode: "run" }).config.file).toBe("i18n.config.ts");

    fs.writeFileSync(path.join(dir, "dialex.config.ts"), `export default { locales: ["de"] };\n`);
    const after = ensureConfig(dir, { mode: "run" });
    expect(after.reused).toBe(false);
    expect(after.config.file).toBe("dialex.config.ts");
    expect(after.config.config.locales).toEqual(["de"]);
  });

  it("goes stale when an environment variable it read changes", () => {
    const dir = project({
      "dialex.config.ts": `export default { defaultLocale: process.env.DIALEX_TEST_ENV ?? "en" };\n`,
    });
    delete process.env.DIALEX_TEST_ENV;
    expect(ensureConfig(dir, { mode: "run" }).config.config.defaultLocale).toBe("en");
    expect(ensureConfig(dir, { mode: "run" }).reused).toBe(true);

    process.env.DIALEX_TEST_ENV = "tr";
    try {
      const after = ensureConfig(dir, { mode: "run" });
      expect(after.reused).toBe(false);
      expect(after.config.config.defaultLocale).toBe("tr");
    } finally {
      delete process.env.DIALEX_TEST_ENV;
    }
  });

  it("does not run project code for a static request, and a run request completes it", () => {
    const marker = path.join(os.tmpdir(), `dialex-ran-${process.pid}`);
    const dir = project({
      "dialex.config.ts": `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(marker)}, "x");\nexport default { ...{ locales: ["en"] } };\n`,
    });
    try {
      const stat = ensureConfig(dir, { mode: "static" });
      expect(stat.config.complete).toBe(false);
      expect(fs.existsSync(marker)).toBe(false);

      // an incomplete static artifact cannot serve a request to run the file
      const run = ensureConfig(dir, { mode: "run" });
      expect(run.reused).toBe(false);
      expect(run.config.mode).toBe("run");
      expect(fs.existsSync(marker)).toBe(true);

      // and an editor may then read the run artifact
      expect(ensureConfig(dir, { mode: "static" }).reused).toBe(true);
    } finally {
      fs.rmSync(marker, { force: true });
    }
  });
});
