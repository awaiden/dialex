import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, afterEach } from "vite-plus/test";

import { runCheck } from "../src/commands/check.js";

describe("CLI check command", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-check-test-"));

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("succeeds when all keys and locales match", async () => {
    const configCode = `
export default {
  defaultLocale: "en",
  locales: ["en", "tr"],
};
`;
    const contentCode = `
export default {
  name: "settings",
  dictionary: {
    en: { save: "Save", cancel: "Cancel" },
    tr: { save: "Kaydet", cancel: "İptal" },
  },
};
`;
    fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "i18n.config.ts"), configCode, "utf-8");
    fs.writeFileSync(path.join(tempDir, "src/settings.content.ts"), contentCode, "utf-8");

    const result = await runCheck({ cwd: tempDir, exitOnError: false });
    expect(result.success).toBe(true);
    expect(result.totalIssues).toBe(0);
  });

  it("reports missing keys across locales", async () => {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-check-test2-"));
    const contentCode = `
export default {
  name: "settings",
  dictionary: {
    en: { save: "Save", cancel: "Cancel" },
    tr: { save: "Kaydet" }, // Missing cancel!
  },
};
`;
    fs.mkdirSync(path.join(dir2, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir2, "src/settings.content.ts"), contentCode, "utf-8");

    const result = await runCheck({ cwd: dir2, exitOnError: false });
    fs.rmSync(dir2, { recursive: true, force: true });
    expect(result.success).toBe(false);
    expect(result.totalIssues).toBeGreaterThan(0);
    expect(result.diagnostics[0].errors.some((e) => e.includes('missing key "cancel"'))).toBe(true);
  });
});

describe("CLI check command: references, fixes, and output modes", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  const project = (files: Record<string, string>) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-check-ref-"));
    dirs.push(dir);
    for (const [rel, code] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), code, "utf-8");
    }
    return dir;
  };

  const config = `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`;
  const home = `export default {
  name: "home",
  dictionary: {
    en: { title: "Welcome", nav: { about: "About" }, greeting: (n) => \`Hi \${n}\` },
    tr: { title: "Hoş Geldiniz", nav: { about: "Hakkında" }, greeting: (n) => \`Selam \${n}\` },
  },
};
`;

  it("detects missing nested keys", async () => {
    const dir = project({
      "dialex.config.ts": config,
      "src/home.content.ts": home.replace('nav: { about: "Hakkında" }, ', ""),
    });
    const result = await runCheck({ cwd: dir, exitOnError: false });
    expect(result.success).toBe(false);
    expect(result.diagnostics[0].errors).toContain('Locale "tr" is missing key "nav.about"');
  });

  it("reports unknown dictionaries and translation paths with line numbers", async () => {
    const dir = project({
      "dialex.config.ts": config,
      "src/home.content.ts": home,
      "src/app.ts": `const a = getDictionary("home");
const b = getDictionary("nope");
const c = t("home.title");
const d = t("home.nav.missing");
const e = t("other.lib.key");
`,
    });
    const result = await runCheck({ cwd: dir, exitOnError: false });
    const app = result.diagnostics.find((d) => d.file.endsWith("app.ts"))!;
    expect(app.errors).toEqual([
      'Unknown dictionary "nope"',
      'Unknown translation path "home.nav.missing"',
    ]);
    expect(app.annotations.map((a) => a.line)).toEqual([2, 4]);
  });

  it("warns about possibly unused keys and never-referenced dictionaries, without failing", async () => {
    const dir = project({
      "dialex.config.ts": config,
      "src/home.content.ts": home,
      "src/other.content.ts": `export default { name: "other", dictionary: { en: { x: "1" }, tr: { x: "1" } } };\n`,
      "src/app.ts": `const d = getDictionary("home"); console.log(d.title, d.greeting);\n`,
    });
    const result = await runCheck({ cwd: dir, exitOnError: false });
    expect(result.success).toBe(true);
    const warnings = result.diagnostics.flatMap((d) => d.warnings);
    expect(warnings).toContain('Key "nav.about" is possibly unused');
    expect(warnings).toContain('Dictionary "other" is never referenced');
    expect(warnings.some((w) => w.includes('"title"'))).toBe(false);
  });

  it("does not report unused keys when there is no source code to scan", async () => {
    const dir = project({ "dialex.config.ts": config, "src/home.content.ts": home });
    const result = await runCheck({ cwd: dir, exitOnError: false });
    expect(result.totalWarnings).toBe(0);
  });

  it("--fix inserts missing keys marked [TODO], then the check passes with warnings", async () => {
    const file = "src/home.content.ts";
    const dir = project({
      "dialex.config.ts": config,
      [file]: home
        .replace('nav: { about: "Hakkında" }, ', "")
        .replace(/greeting: \(n\) => `Selam \$\{n\}`,?/, ""),
    });

    const result = await runCheck({ cwd: dir, exitOnError: false, fix: true });
    expect(result.fixed).toBe(2);
    expect(result.success).toBe(true);

    const out = fs.readFileSync(path.join(dir, file), "utf-8");
    expect(out).toContain('"[TODO] About"');
    expect(out).toContain("greeting: (n) => `Hi ${n}`");
    expect(result.diagnostics.flatMap((d) => d.warnings)).toContain(
      'Locale "tr" key "nav.about" still has a [TODO] placeholder',
    );
  });

  it("--fix creates a missing configured locale", async () => {
    const dir = project({
      "dialex.config.ts": `export default { defaultLocale: "en", locales: ["en", "tr", "de"] };\n`,
      "src/home.content.ts": home,
    });
    const result = await runCheck({ cwd: dir, exitOnError: false, fix: true });
    expect(result.success).toBe(true);
    expect(fs.readFileSync(path.join(dir, "src/home.content.ts"), "utf-8")).toContain("de:");
  });

  it("--json prints only JSON and --github prints annotations", async () => {
    const dir = project({
      "dialex.config.ts": config,
      "src/home.content.ts": home,
      "src/app.ts": `const b = getDictionary("nope");\n`,
    });
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => void lines.push(args.join(" "));
    try {
      await runCheck({ cwd: dir, exitOnError: false, json: true });
      const json = JSON.parse(lines.join("\n"));
      expect(json.success).toBe(false);
      expect(json.totalIssues).toBe(1);

      lines.length = 0;
      await runCheck({ cwd: dir, exitOnError: false, github: true });
    } finally {
      console.log = original;
    }
    expect(lines).toContain(
      '::error file=src/app.ts,line=1,title=dialex::Unknown dictionary "nope"',
    );
  });
});
