import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { analyzeProject, createAnalysisCache } from "../src/analysis.js";

const dirs: string[] = [];

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-cache-"));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return dir;
}

/** Writes a file and moves its modification time forward, so the change is always visible. */
function rewrite(file: string, content: string) {
  fs.writeFileSync(file, content);
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(file, later, later);
}

const HOME = `export default { name: "home", dictionary: { en: { title: "Hi" }, tr: { title: "Selam" } } };\n`;
const config = { defaultLocale: "en", locales: ["en", "tr"] };

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("analyzeProject with a cache", () => {
  it("reuses parsed dictionaries that did not change", async () => {
    const root = project({ "src/home.content.ts": HOME, "src/app.ts": `t("home.title");\n` });
    const cache = createAnalysisCache();

    const first = await analyzeProject({ root, config, cache });
    const second = await analyzeProject({ root, config, cache });

    expect(second.dictionaries[0].df).toBe(first.dictionaries[0].df);
    expect(second.issues).toEqual(first.issues);
  });

  it("picks up an edited dictionary", async () => {
    const root = project({ "src/home.content.ts": HOME });
    const cache = createAnalysisCache();
    await analyzeProject({ root, config, cache, unused: false });

    rewrite(
      path.join(root, "src/home.content.ts"),
      `export default { name: "home", dictionary: { en: { title: "Hi", extra: "x" }, tr: { title: "Selam" } } };\n`,
    );
    const after = await analyzeProject({ root, config, cache, unused: false });

    expect(after.issues.map((i) => i.code)).toContain("missing-key");
  });

  it("picks up an edited source file and forgets deleted ones", async () => {
    const root = project({ "src/home.content.ts": HOME, "src/app.ts": `t("home.title");\n` });
    const cache = createAnalysisCache();
    const clean = await analyzeProject({ root, config, cache, unused: false });
    expect(clean.issues).toEqual([]);

    rewrite(path.join(root, "src/app.ts"), `t("home.missing");\n`);
    const broken = await analyzeProject({ root, config, cache, unused: false });
    expect(broken.issues.map((i) => i.code)).toEqual(["unknown-path"]);

    fs.rmSync(path.join(root, "src/app.ts"));
    const gone = await analyzeProject({ root, config, cache, unused: false });
    expect(gone.issues).toEqual([]);
    expect([...cache.sources.keys()]).toEqual([]);
  });

  it("matches an uncached run", async () => {
    const root = project({
      "src/home.content.ts": HOME,
      "src/app.ts": `getDictionary("nope"); t("home.title");\n`,
    });
    const cached = await analyzeProject({ root, config, cache: createAnalysisCache() });
    const plain = await analyzeProject({ root, config });
    expect(cached.issues).toEqual(plain.issues);
  });
});
