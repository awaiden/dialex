import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { normalizeGenerated, runCheck } from "../src/commands/check.js";
import { generateDictionaries, renderGenerated } from "../src/commands/generate.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const home = (extra = "") =>
  `export default { name: "home", dictionary: { en: { title: "Welcome"${extra} }, tr: { title: "Selam"${extra} } } };\n`;

function project(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-stale-"));
  dirs.push(dir);
  for (const [rel, code] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), code);
  }
  return dir;
}

const check = (cwd: string, extra = {}) =>
  runCheck({ cwd, json: true, exitOnError: false, ...extra });

describe("renderGenerated", () => {
  it("needs no config file: defaults apply and locales come from the dictionaries", () => {
    const dir = project({ "src/home.content.ts": home() });
    const rendered = renderGenerated(dir);
    expect(rendered.configFile).toBeUndefined();
    expect(rendered.content).toContain('"defaultLocale": "en"');
    expect(rendered.content).toContain('"locales": [\n    "en",\n    "tr"\n  ]');
    expect(rendered.content).toContain('"prefixDefault": true');
    expect(rendered.content).toContain("export const dialex = { dictionaries, config };");
    expect(rendered.dtsContent).toContain('locales: "en" | "tr"');
  });

  it("lets an explicit config win over defaults and inferred locales", () => {
    const dir = project({
      "src/home.content.ts": home(),
      "dialex.config.ts": `export default { defaultLocale: "tr", locales: ["tr"], prefixDefault: false, fallbacks: { "pt-BR": ["pt"] } };\n`,
    });
    const { content, configFile } = renderGenerated(dir);
    expect(configFile).toMatch(/dialex\.config\.ts$/);
    expect(content).toContain('"defaultLocale": "tr"');
    expect(content).toContain('"locales": [\n    "tr"\n  ]');
    expect(content).toContain('"prefixDefault": false');
    expect(content).toContain('"pt-BR"');
  });

  it("never puts translate settings into the generated config", () => {
    const dir = project({
      "src/home.content.ts": home(),
      "dialex.config.ts": `export default { translate: { provider: { translate: async () => [] } } };\n`,
    });
    expect(renderGenerated(dir).content).not.toContain("translate");
  });

  it("lazy mode emits dynamic loaders and no static imports", () => {
    const dir = project({
      "src/home.content.ts": `import { defineDictionary } from "dialexjs";\nexport default defineDictionary("home", { en: { a: "x" } });\n`,
      "dialex.config.ts": `export default { lazy: true };\n`,
    });
    const { content } = renderGenerated(dir);
    expect(content).toContain('"home": () => import("./home.content.js")');
    expect(content).not.toMatch(/^import /m);
    expect(content).toContain("export const dialex = { dictionaries, config, loaders };");
    expect(content).toContain('"lazy": true');
  });

  it("is deterministic and sorted", () => {
    const dir = project({ "src/b.content.ts": home(), "src/a.content.ts": home() });
    expect(renderGenerated(dir).files.map((f) => path.basename(f))).toEqual([
      "a.content.ts",
      "b.content.ts",
    ]);
    expect(renderGenerated(dir).content).toBe(renderGenerated(dir).content);
  });
});

describe("dx check and generated files", () => {
  it("is quiet when the generated files are current or were never generated", async () => {
    const dir = project({ "src/home.content.ts": home() });
    expect((await check(dir)).success).toBe(true); // never generated: not an error
    generateDictionaries(dir);
    expect((await check(dir)).success).toBe(true);
  });

  it("reports a stale generated file and --fix rewrites it", async () => {
    const dir = project({ "src/home.content.ts": home() });
    generateDictionaries(dir);
    fs.writeFileSync(path.join(dir, "src/nav.content.ts"), home().replace('"home"', '"nav"'));

    const stale = await check(dir);
    expect(stale.success).toBe(false);
    expect(stale.diagnostics.map((d) => d.file)).toContain(path.join("src", "dialex.generated.ts"));
    expect(JSON.stringify(stale)).toContain("dx generate");

    const fixed = await check(dir, { fix: true });
    expect(fixed.success).toBe(true);
    expect(fixed.fixed).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(dir, "src/dialex.generated.ts"), "utf-8")).toContain("nav");
    expect((await check(dir)).success).toBe(true);
  });
});

describe("static generation (editor extension)", () => {
  it("reads the config without running it", () => {
    const marker = path.join(os.tmpdir(), `dialex-ran-${Date.now()}`);
    const dir = project({
      "src/home.content.ts": home(),
      "dialex.config.ts": `import fs from "node:fs";
fs.writeFileSync(${JSON.stringify(marker)}, "ran");
export default { defaultLocale: "tr", locales: ["tr", "en"] };
`,
    });

    const { content } = renderGenerated(dir, { static: true });
    expect(fs.existsSync(marker)).toBe(false); // the config file was not executed
    expect(content).toContain('"defaultLocale": "tr"');
    expect(content).toContain('"locales": [\n    "tr",\n    "en"\n  ]');
    expect(renderGenerated(dir, { static: true }).content).toBe(
      renderGenerated(dir, { static: true }).content,
    );
  });

  it("falls back to defaults for settings it cannot read statically", () => {
    const dir = project({
      "src/home.content.ts": home(),
      "dialex.config.ts": `export default { defaultLocale: process.env.LOCALE ?? "tr" };\n`,
    });
    expect(renderGenerated(dir, { static: true }).content).toContain('"defaultLocale": "en"');
  });
});

describe("dx generate --watch", () => {
  const waitFor = async (check: () => boolean, ms = 4000) => {
    const start = Date.now();
    while (!check()) {
      if (Date.now() - start > ms) throw new Error("timed out waiting for the watcher");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  it("regenerates when a dictionary is added, edited and removed", async () => {
    const dir = project({ "src/home.content.ts": home() });
    generateDictionaries(dir);
    const generated = path.join(dir, "src/dialex.generated.ts");
    const read = () => fs.readFileSync(generated, "utf-8");

    const { startGenerateWatcher } = await import("../src/commands/generate.js");
    const watcher = startGenerateWatcher(dir, {}, () => void generateDictionaries(dir), 20);
    try {
      await new Promise<void>((resolve) => watcher.on("ready", () => resolve()));

      fs.writeFileSync(path.join(dir, "src/extra.content.ts"), home().replace('"home"', '"extra"'));
      await waitFor(() => read().includes("extra.content.js"));

      fs.writeFileSync(
        path.join(dir, "dialex.config.ts"),
        `export default { defaultLocale: "tr" };\n`,
      );
      await waitFor(() => read().includes('"defaultLocale": "tr"'));

      fs.rmSync(path.join(dir, "src/extra.content.ts"));
      await waitFor(() => !read().includes("extra.content.js"));
    } finally {
      await watcher.close();
    }
  });

  it("ignores unrelated files and its own output", async () => {
    const dir = project({ "src/home.content.ts": home() });
    generateDictionaries(dir);
    let runs = 0;

    const { startGenerateWatcher } = await import("../src/commands/generate.js");
    const watcher = startGenerateWatcher(dir, {}, () => void runs++, 20);
    try {
      await new Promise<void>((resolve) => watcher.on("ready", () => resolve()));
      fs.writeFileSync(path.join(dir, "src/app.ts"), "export {};\n");
      fs.writeFileSync(path.join(dir, "README.md"), "# hi\n");
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(runs).toBe(0);
    } finally {
      await watcher.close();
    }
  });
});

describe("dx check and formatters", () => {
  it("accepts generated files a formatter has rewritten, but still catches real changes", async () => {
    const dir = project({ "src/home.content.ts": home() });
    generateDictionaries(dir);
    const file = path.join(dir, "src/dialex.generated.ts");

    // What Prettier/oxfmt do: unquote simple keys, reflow, add trailing commas, change quotes.
    const raw = fs.readFileSync(file, "utf-8");
    const formatted = raw
      .replace(/"(\w+)":/g, "$1:")
      .replace(/locales:\s*\[[^\]]*\]/, 'locales: ["en", "tr"]')
      .replace(/lazy: false\n/, "lazy: false,\n")
      .replace(/import (\w+) from "([^"]+)";/g, "import $1 from '$2';");
    expect(formatted).not.toBe(raw);
    fs.writeFileSync(file, formatted);
    expect((await check(dir)).success).toBe(true);

    // A real change (another dictionary) is still reported.
    fs.writeFileSync(path.join(dir, "src/nav.content.ts"), home().replace('"home"', '"nav"'));
    expect((await check(dir)).success).toBe(false);
  });

  it("normalizes quotes, quoted keys, whitespace and trailing commas only", () => {
    expect(normalizeGenerated(`const a = { "b": [1, 2,], c: 'x' };`)).toBe(
      normalizeGenerated(`const a = {\n  b: [1, 2],\n  c: "x",\n};`),
    );
    expect(normalizeGenerated(`const a = 1;`)).not.toBe(normalizeGenerated(`const a = 2;`));
  });
});

describe("generated locales and Locale type", () => {
  it("exports the locales as a readonly tuple and their union", () => {
    const dir = project({ "src/home.content.ts": home() });
    const { content } = renderGenerated(dir);
    expect(content).toContain('export const locales = ["en","tr"] as const;');
    expect(content).toContain("export type Locale = (typeof locales)[number];");
  });

  it("uses the configured locales, also in lazy mode", () => {
    const dir = project({
      "src/home.content.ts": `import { defineDictionary } from "dialexjs";\nexport default defineDictionary("home", { en: { a: "x" }, tr: { a: "y" } });\n`,
      "dialex.config.ts": `export default { locales: ["tr"], lazy: true };\n`,
    });
    expect(renderGenerated(dir).content).toContain('export const locales = ["tr"] as const;');
  });

  it("falls back to string when no locales are known", () => {
    const dir = project({});
    const { content } = renderGenerated(dir);
    expect(content).toContain("export const locales: readonly string[] = [];");
    expect(content).toContain("export type Locale = string;");
  });
});
