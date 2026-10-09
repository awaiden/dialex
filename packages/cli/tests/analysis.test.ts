import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { analyzeProject, scanReferences, type AnalysisIssue } from "../src/analysis.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const project = (files: Record<string, string>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-analysis-"));
  dirs.push(dir);
  for (const [rel, code] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), code);
  }
  return dir;
};

const config = { defaultLocale: "en", locales: ["en", "tr"] };
const home = `export default {
  name: "home",
  dictionary: {
    en: {
      title: "Welcome",
      nav: { about: "About" },
    },
    tr: {
      title: "Hoş Geldiniz",
    },
  },
};
`;
const codes = (issues: AnalysisIssue[]) => issues.map((i) => i.code);

describe("scanReferences", () => {
  it("finds dictionary names and key paths with offsets of their contents", () => {
    const text = `const a = getDictionary("home"); const b = t('home.nav.about'); useDictionary(\`cart\`);`;
    const refs = scanReferences(text);
    expect(refs.map((r) => [r.kind, r.value])).toEqual([
      ["dictionary", "home"],
      ["path", "home.nav.about"],
      ["dictionary", "cart"],
    ]);
    for (const ref of refs) expect(text.slice(ref.start, ref.end)).toBe(ref.value);
  });

  it("ignores t() calls that are method calls or part of other identifiers", () => {
    expect(
      scanReferences(`obj.t("a.b"); sort("a.b"); format("a.b"); @t("a.b")`).map((r) => r.value),
    ).toEqual(["a.b"]);
    expect(scanReferences(`foo.t("home.title")`)).toEqual([]);
  });
});

describe("analyzeProject (static)", () => {
  it("reports missing keys with a range on the locale and the key to copy from", async () => {
    const dir = project({ "src/home.content.ts": home });
    const { issues } = await analyzeProject({ root: dir, config, src: [] });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      level: "error",
      code: "missing-key",
      message: 'Locale "tr" is missing key "nav.about"',
      dictionary: "home",
      locale: "tr",
      path: ["nav", "about"],
      sourceLocale: "en",
      file: path.join(dir, "src/home.content.ts"),
    });
    // points at `tr` (line 8, zero-based 7)
    expect(issues[0].range?.start).toEqual({ line: 7, column: 4 });
  });

  it("reports unknown dictionaries and paths with ranges inside the string", async () => {
    const dir = project({
      "src/home.content.ts": home.replace(
        '      title: "Hoş Geldiniz",\n',
        '      title: "Hoş Geldiniz",\n      nav: { about: "Hakkında" },\n',
      ),
      "src/app.ts": `const a = getDictionary("nope");\nconst b = t("home.nav.missing");\n`,
    });
    const { issues } = await analyzeProject({ root: dir, config });

    const unknown = issues.filter((i) => i.code.startsWith("unknown"));
    expect(unknown.map((i) => [i.code, i.message])).toEqual([
      ["unknown-dictionary", 'Unknown dictionary "nope"'],
      ["unknown-path", 'Unknown translation path "home.nav.missing"'],
    ]);
    expect(unknown[0].range).toEqual({
      start: { line: 0, column: 25 },
      end: { line: 0, column: 29 },
    });
    expect(unknown[1].range?.start.line).toBe(1);
    expect(unknown[1]).toMatchObject({ dictionary: "home", path: ["nav", "missing"] });
  });

  it("can switch off unused-key warnings and source scanning", async () => {
    const dir = project({
      "src/home.content.ts": home.replace(
        '      title: "Hoş Geldiniz",\n',
        '      title: "Hoş Geldiniz",\n      nav: { about: "Hakkında" },\n',
      ),
      "src/app.ts": `getDictionary("home").title;\n`,
    });
    expect(codes((await analyzeProject({ root: dir, config })).issues)).toEqual(["unused-key"]);
    expect((await analyzeProject({ root: dir, config, unused: false })).issues).toEqual([]);

    const none = await analyzeProject({ root: dir, config, src: [] });
    expect(none.sourceFilesScanned).toBe(0);
    expect(none.issues).toEqual([]);
  });

  it("locates TODO placeholders and ICU problems at the key", async () => {
    const source = `export default {
  name: "cart",
  dictionary: {
    en: { items: "{count, plural, one {# item} other {# items}}", note: "Note" },
    tr: { items: "{total, plural, other {# ürün}}", note: "[TODO] Note" },
  },
};
`;
    const dir = project({ "src/cart.content.ts": source });
    const { issues } = await analyzeProject({ root: dir, config, src: [] });
    const byCode = Object.fromEntries(issues.map((i) => [i.code, i]));

    // The `tr` line is zero-based line 4; each issue should point at its key on that line.
    const trLine = source.split("\n")[4];
    expect(byCode["icu-args-mismatch"].range?.start).toEqual({
      line: 4,
      column: trLine.indexOf("items"),
    });
    expect(byCode["icu-args-mismatch"].path).toEqual(["items"]);
    expect(byCode["todo-placeholder"].range?.start).toEqual({
      line: 4,
      column: trLine.indexOf("note"),
    });
  });

  it("reports missing configured locales over the dictionary", async () => {
    const dir = project({ "src/home.content.ts": home });
    const { issues } = await analyzeProject({
      root: dir,
      config: { ...config, locales: ["en", "tr", "de"] },
      src: [],
    });
    const missing = issues.find((i) => i.code === "missing-locale")!;
    expect(missing).toMatchObject({ message: 'Missing configured locale "de"', locale: "de" });
    expect(missing.range?.start.line).toBe(2);
  });

  it("honors ignore globs (for nested projects)", async () => {
    const dir = project({
      "src/home.content.ts": home,
      "inner/src/other.content.ts": home.replace('"home"', '"other"'),
    });
    const all = await analyzeProject({ root: dir, config, src: [] });
    expect(all.dictionaries.map((d) => d.name).sort()).toEqual(["home", "other"]);

    const scoped = await analyzeProject({ root: dir, config, src: [], ignore: ["inner/**"] });
    expect(scoped.dictionaries.map((d) => d.name)).toEqual(["home"]);
  });

  it("exposes the analyzed dictionaries for tooling", async () => {
    const dir = project({ "src/home.content.ts": home });
    const { dictionaries } = await analyzeProject({ root: dir, config, src: [] });
    expect(dictionaries[0]).toMatchObject({
      name: "home",
      locales: ["en", "tr"],
      paths: ["title", "nav.about"],
    });
    expect(dictionaries[0].leaves.get("en")!.get("title")).toEqual({
      kind: "string",
      value: "Welcome",
    });
    expect(dictionaries[0].df).toBeDefined();
  });
});

describe("analyzeProject: dictionaries the syntax tree cannot describe", () => {
  const dynamic = `import { shared } from "./shared";
export default {
  name: "dyn",
  dictionary: { en: { ...shared, extra: "1" }, tr: { ...shared } },
};
`;

  it("never runs project code in static mode and says what was skipped", async () => {
    const marker = path.join(os.tmpdir(), `pg-analysis-marker-${Date.now()}`);
    const dir = project({
      "src/dyn.content.ts": `import fs from "node:fs";
fs.writeFileSync(${JSON.stringify(marker)}, "executed");
export default { name: "dyn", dictionary: { en: { ...{} }, tr: {} } };
`,
    });
    const { issues } = await analyzeProject({ root: dir, config, src: [] });

    expect(fs.existsSync(marker)).toBe(false);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "info", code: "unanalyzable" });
  });

  it("imports them when runtime is enabled (CLI behavior)", async () => {
    const dir = project({
      "src/shared.ts": `export const shared = { a: "A" };\n`,
      "src/dyn.content.ts": dynamic,
    });
    const { issues, dictionaries } = await analyzeProject({
      root: dir,
      config,
      src: [],
      runtime: true,
    });

    expect(dictionaries[0].df).toBeUndefined();
    expect(issues.map((i) => i.message)).toEqual(['Locale "tr" is missing key "extra"']);
  });

  it("reports syntax errors in static mode and import failures at runtime", async () => {
    const dir = project({ "src/bad.content.ts": `export default {{{\n` });
    const statik = await analyzeProject({ root: dir, config, src: [] });
    expect(statik.issues[0]).toMatchObject({ level: "error", code: "invalid-dictionary" });
    expect(statik.issues[0].message).toMatch(/^Failed to parse dictionary:/);

    const runtime = await analyzeProject({ root: dir, config, src: [], runtime: true });
    expect(runtime.issues[0].message).toMatch(/^Failed to import dictionary:/);
  });

  it("reports a default export that is not a dictionary (runtime)", async () => {
    const dir = project({ "src/odd.content.ts": `export default 42;\n` });
    const { issues } = await analyzeProject({ root: dir, config, src: [], runtime: true });
    expect(issues[0].message).toBe(
      "Default export does not appear to be a valid defineDictionary output.",
    );
  });
});
