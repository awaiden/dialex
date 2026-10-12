import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  ARTIFACT_PATH,
  parseStaticConfig,
  readArtifact,
  resolveConfig,
  writeConfig,
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

describe("resolveConfig", () => {
  const literal = `export default { defaultLocale: "tr", locales: ["tr", "en"], lint: { rules: { "unused-key": "off" } } };\n`;

  it("does not execute a config of plain literals, even when asked to run it", () => {
    const dir = project({
      "dialex.config.ts": `import { missing } from "not-installed";\nexport default { defaultLocale: "tr", locales: ["tr", "en"], lint: { rules: { "unused-key": "off" } } };\n`,
    });
    const run = resolveConfig(dir, { mode: "run" });
    const stat = resolveConfig(dir, { mode: "static" });
    expect(run.config).toEqual(stat.config);
    // read from the syntax tree, so the unresolvable import never mattered
    expect(run).toMatchObject({ mode: "static", complete: true, file: "dialex.config.ts" });
    expect(run.notes).toEqual([]);
    expect(run.config.lint.rules).toEqual({ "unused-key": "off" });
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
    expect(run).toMatchObject({ mode: "run", complete: true });
    expect(run.config.locales).toEqual(["en", "de"]);
    expect(run.config.defaultLocale).toBe("de");
  });

  it("reads the environment when it has to run the file", () => {
    process.env.DIALEX_TEST_LOCALE = "fr";
    const dir = project({
      "dialex.config.ts": `export default { defaultLocale: process.env.DIALEX_TEST_LOCALE, locales: ["fr"] };\n`,
    });
    try {
      expect(resolveConfig(dir, { mode: "run" }).config.defaultLocale).toBe("fr");
    } finally {
      delete process.env.DIALEX_TEST_LOCALE;
    }
  });

  it("reports a config that throws and uses the defaults", () => {
    const dir = project({
      "dialex.config.ts": `export default { ...(() => { throw new Error("boom"); })() };\n`,
    });
    const resolved = resolveConfig(dir, { mode: "run" });
    expect(resolved.complete).toBe(false);
    expect(resolved.notes[0]).toContain("boom");
    expect(resolved.config.defaultLocale).toBe("en");
  });

  it("defaults when there is no config file", () => {
    const resolved = resolveConfig(project({}), { mode: "run" });
    expect(resolved.file).toBeNull();
    expect(resolved.config.defaultLocale).toBe("en");
  });

  it("matches what the static parser reports for the same text", () => {
    const dir = project({ "dialex.config.ts": literal });
    expect(resolveConfig(dir, { mode: "static" }).config).toEqual(
      parseStaticConfig(literal).config,
    );
  });
});

describe("writeConfig", () => {
  it("writes the file every time, so an edit is always seen", () => {
    const dir = project({ "dialex.config.ts": `export default { locales: ["en"] };\n` });

    writeConfig(dir, { mode: "run" });
    expect(fs.existsSync(path.join(dir, ARTIFACT_PATH))).toBe(true);
    expect(readArtifact(dir)?.config.locales).toEqual(["en"]);

    fs.writeFileSync(
      path.join(dir, "dialex.config.ts"),
      `export default { locales: ["en", "tr"] };\n`,
    );
    writeConfig(dir, { mode: "run" });
    expect(readArtifact(dir)?.config.locales).toEqual(["en", "tr"]);

    // a file that appears with higher priority wins, with nothing to invalidate
    fs.writeFileSync(path.join(dir, "i18n.config.ts"), `export default { locales: ["de"] };\n`);
    writeConfig(dir, { mode: "run" });
    expect(readArtifact(dir)?.file).toBe("dialex.config.ts");
  });

  it("does not run project code for a static request", () => {
    const marker = path.join(os.tmpdir(), `dialex-ran-${process.pid}`);
    const dir = project({
      "dialex.config.ts": `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(marker)}, "x");\nexport default { ...{ locales: ["en"] } };\n`,
    });
    try {
      const { config } = writeConfig(dir, { mode: "static" });
      expect(config.complete).toBe(false);
      expect(fs.existsSync(marker)).toBe(false);

      writeConfig(dir, { mode: "run" });
      expect(fs.existsSync(marker)).toBe(true);
    } finally {
      fs.rmSync(marker, { force: true });
    }
  });
});
