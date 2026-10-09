import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { runExport } from "../src/commands/export.js";
import { parseCsv, parseEntries, runImport } from "../src/commands/import.js";
import { getString, hasPath, loadDictionaryFile } from "../src/utils/dictionary-edit.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const project = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-xliff-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "dialex.config.ts"),
    `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`,
  );
  fs.writeFileSync(
    path.join(dir, "src/home.content.ts"),
    `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    quote: 'Say "hi", <b>friend</b> & more',
    greeting: (name: string) => \`Hello, \${name}!\`,
    nav: { about: "About" },
  },
  tr: {
    title: "Hoş Geldiniz",
    greeting: (name: string) => \`Merhaba, \${name}!\`,
  },
});
`,
  );
  return dir;
};

const read = (dir: string, rel: string) => fs.readFileSync(path.join(dir, rel), "utf-8");
const load = async (dir: string) =>
  (await loadDictionaryFile(path.join(dir, "src/home.content.ts")))!;

describe("export", () => {
  it("writes one flat JSON file per locale and counts skipped functions", async () => {
    const dir = project();
    const result = await runExport({ cwd: dir, format: "json", out: "out" });

    expect(result.files.sort()).toEqual(["out/en.json", "out/tr.json"]);
    expect(result.skippedFunctions).toBe(1);
    expect(JSON.parse(read(dir, "out/en.json"))).toEqual({
      "home.title": "Welcome",
      "home.quote": 'Say "hi", <b>friend</b> & more',
      "home.nav.about": "About",
    });
    expect(JSON.parse(read(dir, "out/tr.json"))).toEqual({ "home.title": "Hoş Geldiniz" });
  });

  it("writes CSV with quoting and a locale column per language", async () => {
    const dir = project();
    await runExport({ cwd: dir, format: "csv", out: "out" });
    const rows = parseCsv(read(dir, "out/translations.csv"));
    expect(rows[0]).toEqual(["key", "en", "tr"]);
    expect(rows.find((r) => r[0] === "home.quote")).toEqual([
      "home.quote",
      'Say "hi", <b>friend</b> & more',
      "",
    ]);
  });

  it("writes XLIFF 1.2 with escaped text and the source language", async () => {
    const dir = project();
    const result = await runExport({ cwd: dir, format: "xliff", out: "out" });
    expect(result.files).toEqual(["out/tr.xlf"]);

    const xlf = read(dir, "out/tr.xlf");
    expect(xlf).toContain('source-language="en" target-language="tr"');
    expect(xlf).toContain("Say &quot;hi&quot;, &lt;b&gt;friend&lt;/b&gt; &amp; more");
    expect(xlf).toContain(
      '<trans-unit id="home.title"><source>Welcome</source><target>Hoş Geldiniz</target>',
    );
    expect(xlf).toContain('<trans-unit id="home.nav.about"><source>About</source></trans-unit>');
  });

  it("rejects unknown formats", async () => {
    await expect(runExport({ cwd: project(), format: "yaml" as any })).rejects.toThrow(
      /Unsupported format/,
    );
  });
});

describe("import", () => {
  it("updates, adds, and ignores unknown keys; leaves functions alone", async () => {
    const dir = project();
    fs.writeFileSync(
      path.join(dir, "tr.json"),
      JSON.stringify({
        "home.title": "Merhaba",
        "home.nav.about": "Hakkında",
        "home.greeting": "should not overwrite a function",
        "home.nonexistent": "x",
        "other.key": "y",
      }),
    );

    const result = await runImport({ cwd: dir, file: "tr.json" });
    expect(result).toMatchObject({ created: 1, updated: 1 });
    expect(result.skipped).toEqual(["tr:home.greeting"]);
    expect(result.unknown.sort()).toEqual(["home.nonexistent", "other.key"]);

    const df = await load(dir);
    expect(getString(df, "tr", ["title"])).toBe("Merhaba");
    expect(getString(df, "tr", ["nav", "about"])).toBe("Hakkında");
    expect(read(dir, "src/home.content.ts")).toContain(
      "greeting: (name: string) => `Merhaba, ${name}!`",
    );
  });

  it("adds unknown keys only with allowNew", async () => {
    const dir = project();
    fs.writeFileSync(path.join(dir, "tr.json"), JSON.stringify({ "home.brand": "Marka" }));
    await runImport({ cwd: dir, file: "tr.json", allowNew: true });
    expect(hasPath(await load(dir), "tr", ["brand"])).toBe(true);
  });

  it("accepts locale-keyed JSON", () => {
    expect(
      parseEntries(
        JSON.stringify({ tr: { "home.title": "A" }, de: { "home.title": "B" } }),
        "json",
        undefined,
      ),
    ).toEqual([
      { locale: "tr", key: "home.title", value: "A" },
      { locale: "de", key: "home.title", value: "B" },
    ]);
  });

  it("round-trips CSV with special characters", async () => {
    const dir = project();
    await runExport({ cwd: dir, format: "csv", out: "out" });
    const csv = read(dir, "out/translations.csv").replace(
      /^(home\.quote,".*"),$/m,
      '$1,"Selam, ""dost"""',
    );
    fs.writeFileSync(path.join(dir, "out/translations.csv"), csv);

    await runImport({ cwd: dir, file: "out/translations.csv" });
    expect(getString(await load(dir), "tr", ["quote"])).toBe('Selam, "dost"');
  });

  it("round-trips XLIFF including entities", async () => {
    const dir = project();
    await runExport({ cwd: dir, format: "xliff", out: "out" });
    const xlf = read(dir, "out/tr.xlf").replace(
      "<source>About</source></trans-unit>",
      "<source>About</source><target>Hakkında &amp; daha</target></trans-unit>",
    );
    fs.writeFileSync(path.join(dir, "out/tr.xlf"), xlf);

    const result = await runImport({ cwd: dir, file: "out/tr.xlf" });
    expect(result.created).toBe(1);
    expect(getString(await load(dir), "tr", ["nav", "about"])).toBe("Hakkında & daha");
  });

  it("requires a locale for single-locale JSON when it cannot be inferred", () => {
    expect(() => parseEntries(JSON.stringify({ "home.title": "A" }), "json", undefined)).toThrow(
      /--locale/,
    );
  });

  it("supports json option for export and import", async () => {
    const dir = project();
    const lines: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => void lines.push(args.join(" "));
    try {
      const exportRes = await runExport({ cwd: dir, format: "json", out: "out", json: true });
      expect(exportRes.success).toBe(true);
      const jsonExport = JSON.parse(lines.join("\n"));
      expect(jsonExport.success).toBe(true);
      expect(jsonExport.keys).toBe(3);

      lines.length = 0;
      const importRes = await runImport({
        cwd: dir,
        file: "out/en.json",
        locale: "en",
        json: true,
      });
      expect(importRes.success).toBe(true);
      const jsonImport = JSON.parse(lines.join("\n"));
      expect(jsonImport.success).toBe(true);
      expect(jsonImport.updated).toBe(3);
    } finally {
      console.log = origLog;
    }
  });
});
