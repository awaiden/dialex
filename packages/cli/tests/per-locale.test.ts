import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { runCheck } from "../src/commands/check.js";
import { generateDictionaries, renderGenerated } from "../src/commands/generate.js";
import { parseStaticConfig } from "../src/utils/static-config.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const PLAIN = `import { defineDictionary } from "dialexjs";
export default defineDictionary("home", {
  en: { title: "Welcome", greet: (name: string) => \`Hi \${name}\` },
  tr: { title: "Selam", greet: (name: string) => \`Selam \${name}\` },
});
`;
const SHARED = `import { plural } from "dialexjs";
import { defineDictionary } from "dialexjs";
export default defineDictionary("cart", {
  en: { items: (n: number) => plural(n, { one: "item", other: "items" }) },
  tr: { items: (n: number) => \`\${n} ürün\` },
});
`;

function project(files: Record<string, string>, config = `export default { lazy: "locale" };\n`) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-perlocale-"));
  dirs.push(dir);
  for (const [rel, text] of Object.entries({ "dialex.config.ts": config, ...files })) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

const names = (dir: string) => {
  const folder = path.join(dir, "src/dialex.locales");
  return fs.existsSync(folder) ? fs.readdirSync(folder).sort() : [];
};

describe('lazy: "locale" output', () => {
  it("writes one module per dictionary and locale, and loaders that point at them", () => {
    const dir = project({ "src/home.content.ts": PLAIN });
    const { content, extraFiles, notes } = renderGenerated(dir);

    expect(extraFiles.map((f) => path.basename(f.path))).toEqual(["home.en.ts", "home.tr.ts"]);
    expect(extraFiles[0].content).toContain("export default {");
    expect(extraFiles[0].content).toContain('title: "Welcome"');
    expect(extraFiles[0].content).not.toContain("Selam");
    expect(extraFiles[1].content).toContain('title: "Selam"');
    expect(notes).toEqual([]);

    expect(content).toContain('"home": {');
    expect(content).toContain('"en": () => import("./dialex.locales/home.en.js"),');
    expect(content).toContain('"tr": () => import("./dialex.locales/home.tr.js"),');
    expect(content).not.toMatch(/^import /m);
    expect(content).toContain('"lazy": "locale" as const');
    expect(content).toContain("export const dialex = { dictionaries, config, loaders };");
  });

  it("uses extensionless imports under bundler resolution, like the rest of the file", () => {
    const dir = project({
      "src/home.content.ts": PLAIN,
      "tsconfig.json": `{ "compilerOptions": { "moduleResolution": "bundler" } }`,
    });
    expect(renderGenerated(dir).content).toContain('import("./dialex.locales/home.en")');
  });

  it("loads a dictionary whole, and says why, when a locale uses something defined in its file", () => {
    const dir = project({ "src/home.content.ts": PLAIN, "src/cart.content.ts": SHARED });
    const { content, extraFiles, notes } = renderGenerated(dir);
    expect(extraFiles.map((f) => path.basename(f.path))).toEqual(["home.en.ts", "home.tr.ts"]);
    expect(content).toContain('"cart": () => import("./cart.content.js"),');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("src/cart.content.ts is loaded whole");
    expect(notes[0]).toContain('"plural"');
  });

  it("still loads whole files with lazy: true", () => {
    const dir = project({ "src/home.content.ts": PLAIN }, `export default { lazy: true };\n`);
    const { content, extraFiles } = renderGenerated(dir);
    expect(extraFiles).toEqual([]);
    expect(content).toContain('"home": () => import("./home.content.js"),');
  });

  it('reads lazy: "locale" from the config without running it', () => {
    expect(parseStaticConfig(`export default { lazy: "locale" };`).config.lazy).toBe("locale");
    const { notes } = parseStaticConfig(`export default { lazy: "yes" };`);
    expect(notes.join(" ")).toMatch(/lazy/);
    const dir = project({ "src/home.content.ts": PLAIN });
    expect(renderGenerated(dir, { static: true }).extraFiles).toHaveLength(2);
  });
});

describe("generating per-locale files", () => {
  it("writes them, and removes the ones that are no longer needed", () => {
    const dir = project({ "src/home.content.ts": PLAIN });
    generateDictionaries(dir);
    expect(names(dir)).toEqual(["home.en.ts", "home.tr.ts"]);

    // a locale disappears
    fs.writeFileSync(
      path.join(dir, "src/home.content.ts"),
      `export default { name: "home", dictionary: { en: { title: "Welcome" } } };\n`,
    );
    generateDictionaries(dir);
    expect(names(dir)).toEqual(["home.en.ts"]);

    // leaving locale mode removes the folder altogether
    fs.writeFileSync(path.join(dir, "dialex.config.ts"), `export default { lazy: true };\n`);
    generateDictionaries(dir);
    expect(fs.existsSync(path.join(dir, "src/dialex.locales"))).toBe(false);
  });

  it("is not picked up as dictionaries by a broad include", () => {
    const dir = project(
      { "src/home.content.ts": PLAIN },
      `export default { lazy: "locale", include: "src/**/*.ts" };\n`,
    );
    generateDictionaries(dir);
    expect(renderGenerated(dir).files.map((f) => path.basename(f))).not.toContain("home.en.ts");
  });
});

describe("dx check and the per-locale files", () => {
  const check = (dir: string, extra = {}) =>
    runCheck({ cwd: dir, json: true, exitOnError: false, ...extra });

  it("reports a missing or edited per-locale file and --fix restores it", async () => {
    const dir = project({ "src/home.content.ts": PLAIN });
    generateDictionaries(dir);
    expect((await check(dir)).success).toBe(true);

    fs.rmSync(path.join(dir, "src/dialex.locales/home.tr.ts"));
    const missing = await check(dir);
    expect(missing.success).toBe(false);
    expect(JSON.stringify(missing)).toContain("home.tr.ts");

    fs.writeFileSync(path.join(dir, "src/dialex.locales/home.en.ts"), "export default {};\n");
    expect((await check(dir)).success).toBe(false);

    const fixed = await check(dir, { fix: true });
    expect(fixed.success).toBe(true);
    expect(names(dir)).toEqual(["home.en.ts", "home.tr.ts"]);
    expect((await check(dir)).success).toBe(true);
  });

  it("stays quiet when the project never generated anything", async () => {
    const dir = project({ "src/home.content.ts": PLAIN });
    expect((await check(dir)).success).toBe(true);
  });
});
