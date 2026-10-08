import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_STATIC_CONFIG,
  parseStaticConfig,
  readStaticConfig,
} from "../src/utils/static-config.js";

describe("parseStaticConfig", () => {
  it("reads defineConfig calls", () => {
    const { config, notes } = parseStaticConfig(`
import { defineConfig } from "dialex";
export default defineConfig({
  defaultLocale: "tr",
  locales: ["tr", "en"],
  include: ["src/**/*.content.ts", \`lib/**/*.content.ts\`],
  fallbacks: { "pt-BR": ["pt", "es"] },
  prefixDefault: false,
  lazy: true,
});`);
    expect(notes).toEqual([]);
    expect(config).toEqual({
      defaultLocale: "tr",
      locales: ["tr", "en"],
      include: ["src/**/*.content.ts", "lib/**/*.content.ts"],
      fallbacks: { "pt-BR": ["pt", "es"] },
      prefixDefault: false,
      lazy: true,
    });
  });

  it("reads plain objects, satisfies expressions, and keeps defaults for missing keys", () => {
    expect(parseStaticConfig(`export default { locales: ["en", "de"] };`).config).toEqual({
      ...DEFAULT_STATIC_CONFIG,
      locales: ["en", "de"],
    });
    expect(
      parseStaticConfig(`export default { defaultLocale: "de" } satisfies Config;`).config
        .defaultLocale,
    ).toBe("de");
  });

  it("does not execute code: non-literal values are ignored and reported", () => {
    const { config, notes } = parseStaticConfig(`
const locales = getLocales();
export default defineConfig({ defaultLocale: process.env.LOCALE, locales, include: "src/**/*.content.ts", translate: { provider: claudeProvider() } });`);
    expect(config.defaultLocale).toBe("en");
    expect(config.locales).toEqual([]);
    expect(config.include).toBe("src/**/*.content.ts");
    expect(notes).toEqual([
      '"defaultLocale" could not be read statically (not a literal).',
      '"locales" could not be read statically (not a literal).',
    ]);
  });

  it("rejects wrongly typed literals", () => {
    const { config, notes } = parseStaticConfig(
      `export default { locales: "en", prefixDefault: "no", fallbacks: { pt: "es" } };`,
    );
    expect(config.locales).toEqual([]);
    expect(config.prefixDefault).toBe(true);
    expect(notes).toHaveLength(3);
  });

  it("handles JSON, syntax errors, and files that do not export an object", () => {
    expect(
      parseStaticConfig(`{ "defaultLocale": "fr", "locales": ["fr"] }`, "dialex.config.json")
        .config,
    ).toMatchObject({
      defaultLocale: "fr",
      locales: ["fr"],
    });
    expect(parseStaticConfig(`{ not json`, "dialex.config.json").notes[0]).toMatch(
      /Could not parse/,
    );
    expect(parseStaticConfig(`export default {{{`).notes[0]).toMatch(/Could not parse/);
    expect(parseStaticConfig(`export default makeConfig();`).notes[0]).toMatch(
      /does not export a config object literal/,
    );
  });
});

describe("readStaticConfig", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });
  const dir = (files: Record<string, string>) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "pg-static-config-"));
    dirs.push(d);
    for (const [name, code] of Object.entries(files)) fs.writeFileSync(path.join(d, name), code);
    return d;
  };

  it("prefers dialex.config over i18n.config and finds any extension", () => {
    const d = dir({
      "i18n.config.ts": `export default { defaultLocale: "xx" };`,
      "dialex.config.mjs": `export default { defaultLocale: "tr" };`,
    });
    const result = readStaticConfig(d);
    expect(result.config.defaultLocale).toBe("tr");
    expect(path.basename(result.file!)).toBe("dialex.config.mjs");
  });

  it("honors an explicit config path and returns defaults when there is none", () => {
    const d = dir({ "custom.ts": `export default { defaultLocale: "es" };` });
    expect(readStaticConfig(d, "custom.ts").config.defaultLocale).toBe("es");
    expect(readStaticConfig(dir({})).config).toEqual(DEFAULT_STATIC_CONFIG);
  });
});
