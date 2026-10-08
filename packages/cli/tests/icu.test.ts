import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { TranslateProvider } from "dialexjs";
import { runCheck } from "../src/commands/check.js";
import { runImport } from "../src/commands/import.js";
import { runTranslate } from "../src/commands/translate.js";
import { claudeProvider } from "../src/translate/claude.js";
import { deeplProvider } from "../src/translate/deepl.js";
import { preservesPlaceholders } from "../src/translate/placeholders.js";
import { checkIcu, type LocaleStrings } from "../src/utils/icu-check.js";
import { getString, loadDictionaryFile } from "../src/utils/dictionary-edit.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const project = (
  dictionary: string,
  config = `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`,
) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-icu-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "dialex.config.ts"), config);
  fs.writeFileSync(path.join(dir, "src/cart.content.ts"), dictionary);
  return dir;
};

const strings = (data: Record<string, Record<string, string>>): LocaleStrings =>
  new Map(
    Object.entries(data).map(([locale, entries]) => [locale, new Map(Object.entries(entries))]),
  );

const ITEMS_EN = "{count, plural, one {# item} other {# items}}";
const ITEMS_TR = "{count, plural, one {# ürün} other {# ürün}}";

describe("checkIcu", () => {
  it("accepts matching messages", () => {
    expect(
      checkIcu("cart", strings({ en: { items: ITEMS_EN }, tr: { items: ITEMS_TR } }), "en"),
    ).toEqual([]);
  });

  it("errors on invalid structured ICU and warns for plain placeholders", () => {
    const findings = checkIcu(
      "cart",
      strings({ en: { a: "{count, plural, one {x}}", b: "{{mustache}}", c: "Hello {name}" } }),
      "en",
    );
    expect(findings.map((f) => [f.key, f.level, f.code])).toEqual([
      ["cart.a", "error", "invalid-icu"],
      ["cart.b", "warning", "invalid-icu"],
    ]);
    expect(findings[0].message).toContain('Invalid ICU message "cart.a" (en)');
  });

  it("flags locales whose arguments differ from the default locale", () => {
    const [finding] = checkIcu(
      "cart",
      strings({
        en: { items: ITEMS_EN, hi: "Hi {name}" },
        tr: { items: "{n, plural, other {# ürün}}", hi: "Selam {name}" },
      }),
      "en",
    );
    expect(finding).toMatchObject({
      level: "error",
      code: "icu-args-mismatch",
      locale: "tr",
      key: "cart.items",
    });
    expect(finding.message).toContain("expected count:plural, found n:plural");
  });

  it("uses another locale as reference when the default locale lacks the key", () => {
    const findings = checkIcu(
      "cart",
      strings({ en: {}, tr: { x: "{a}" }, de: { x: "{b}" } }),
      "en",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ locale: "de", code: "icu-args-mismatch" });
  });

  it("warns when a plural lacks categories the locale needs", () => {
    const ru = "{n, plural, one {# файл} other {# файла}}";
    const findings = checkIcu("cart", strings({ ru: { files: ru } }), "ru");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      level: "warning",
      code: "icu-plural-categories",
      locale: "ru",
    });
    expect(findings[0].message).toContain('"few", "many"');

    // Turkish and English only need one/other
    expect(
      checkIcu("cart", strings({ tr: { files: ITEMS_TR }, en: { files: ITEMS_EN } }), "en"),
    ).toEqual([]);
  });

  it("checks ordinal categories separately", () => {
    const findings = checkIcu(
      "d",
      strings({ en: { n: "{n, selectordinal, one {#st} other {#th}}" } }),
      "en",
    );
    expect(findings[0].message).toContain('"two", "few"');
  });

  it("ignores invalid locale tags", () => {
    expect(checkIcu("d", strings({ "not a locale!!": { n: ITEMS_EN } }), "en")).toEqual([]);
  });
});

describe("dialex check with ICU messages", () => {
  const dictionary = (en: string, tr: string) => `export default {
  name: "cart",
  dictionary: {
    en: { items: ${JSON.stringify(en)} },
    tr: { items: ${JSON.stringify(tr)} },
  },
};\n`;

  it("passes valid messages", async () => {
    const result = await runCheck({
      cwd: project(dictionary(ITEMS_EN, ITEMS_TR)),
      exitOnError: false,
    });
    expect(result.success).toBe(true);
    expect(result.totalWarnings).toBe(0);
  });

  it("fails on invalid ICU and on mismatched arguments", async () => {
    const invalid = await runCheck({
      cwd: project(dictionary(ITEMS_EN, "{count, plural, one {x}}")),
      exitOnError: false,
    });
    expect(invalid.success).toBe(false);
    expect(invalid.diagnostics[0].errors[0]).toContain('Invalid ICU message "cart.items" (tr)');

    const mismatch = await runCheck({
      cwd: project(dictionary(ITEMS_EN, "{total, plural, other {#}}")),
      exitOnError: false,
    });
    expect(mismatch.diagnostics[0].errors[0]).toContain("uses different arguments");
  });
});

describe("dialex import with ICU messages", () => {
  const dictionary = `export default {
  name: "cart",
  dictionary: {
    en: { items: ${JSON.stringify(ITEMS_EN)}, title: "Cart" },
    tr: { title: "Sepet" },
  },
};\n`;
  const load = async (dir: string) =>
    (await loadDictionaryFile(path.join(dir, "src/cart.content.ts")))!;

  it("rejects invalid ICU and changed arguments, accepts valid translations", async () => {
    const dir = project(dictionary);
    const file = path.join(dir, "tr.json");

    fs.writeFileSync(file, JSON.stringify({ "cart.items": "{count, plural, one {x}}" }));
    let result = await runImport({ cwd: dir, file });
    expect(result.rejected[0]).toContain("invalid ICU");

    fs.writeFileSync(file, JSON.stringify({ "cart.items": "{total, plural, other {# ürün}}" }));
    result = await runImport({ cwd: dir, file });
    expect(result.rejected[0]).toContain('arguments differ from "en"');
    expect(getString(await load(dir), "tr", ["items"])).toBeUndefined();

    fs.writeFileSync(file, JSON.stringify({ "cart.items": ITEMS_TR }));
    result = await runImport({ cwd: dir, file });
    expect(result.rejected).toEqual([]);
    expect(getString(await load(dir), "tr", ["items"])).toBe(ITEMS_TR);
  });
});

describe("ICU-aware placeholder protection", () => {
  it("accepts translated branch text and different plural categories", () => {
    expect(preservesPlaceholders(ITEMS_EN, ITEMS_TR)).toBe(true);
    expect(
      preservesPlaceholders(
        "{n, plural, one {# file} other {# files}}",
        "{n, plural, one {# файл} few {# файла} many {# файлов} other {# файла}}",
      ),
    ).toBe(true);
  });

  it("rejects renamed or retyped arguments and lost exact matches or select keys", () => {
    expect(preservesPlaceholders(ITEMS_EN, "{total, plural, other {#}}")).toBe(false);
    expect(preservesPlaceholders(ITEMS_EN, "{count, select, other {x}}")).toBe(false);
    expect(
      preservesPlaceholders("{n, plural, =0 {none} other {#}}", "{n, plural, other {#}}"),
    ).toBe(false);
    expect(
      preservesPlaceholders(
        "{g, select, f {She} other {They}}",
        "{g, select, kadın {O} other {Onlar}}",
      ),
    ).toBe(false);
    expect(preservesPlaceholders(ITEMS_EN, "{count, plural, one {x}")).toBe(false);
  });

  it("keeps the brace rule for non-ICU strings", () => {
    expect(preservesPlaceholders("Hi {name}", "Selam {name}")).toBe(true);
    expect(preservesPlaceholders("Hi {name}", "Selam {isim}")).toBe(false);
  });
});

describe("translate with ICU messages", () => {
  const dictionary = `export default {
  name: "cart",
  dictionary: {
    en: { items: ${JSON.stringify(ITEMS_EN)}, title: "Cart" },
    tr: {},
  },
};\n`;
  const stub = (supportsIcu: boolean) => {
    const calls: string[][] = [];
    const provider: TranslateProvider = {
      name: "stub",
      supportsIcu,
      async translate(texts) {
        calls.push(texts);
        return texts.map((t) => (t === ITEMS_EN ? ITEMS_TR : "Sepet"));
      },
    };
    return { provider, calls };
  };

  it("sends ICU messages to providers that support them and checks the result", async () => {
    const dir = project(dictionary);
    const { provider, calls } = stub(true);
    const result = await runTranslate({ cwd: dir, provider, locale: ["tr"] });
    expect(calls[0].sort()).toEqual(["Cart", ITEMS_EN].sort());
    expect(result.translated).toBe(2);
  });

  it("keeps ICU messages away from providers that do not support them", async () => {
    const dir = project(dictionary);
    const { provider, calls } = stub(false);
    const result = await runTranslate({ cwd: dir, provider, locale: ["tr"] });
    expect(calls[0]).toEqual(["Cart"]);
    expect(result.translated).toBe(1);
    expect(result.rejected).toEqual([
      "tr:cart.items (provider does not support ICU plural/select messages)",
    ]);
  });

  it("rejects a translation that breaks the ICU structure", async () => {
    const dir = project(dictionary);
    const provider: TranslateProvider = {
      supportsIcu: true,
      translate: async (texts) =>
        texts.map((t) => (t === ITEMS_EN ? "{total, plural, other {# ürün}}" : "Sepet")),
    };
    const result = await runTranslate({ cwd: dir, provider, locale: ["tr"] });
    expect(result.rejected).toEqual(["tr:cart.items (placeholders changed)"]);
  });
});

describe("providers and ICU", () => {
  it("declares ICU support only for Claude, and tells it how to treat ICU messages", async () => {
    expect(claudeProvider({ apiKey: "k" }).supportsIcu).toBe(true);
    expect(deeplProvider({ apiKey: "k" }).supportsIcu).toBeFalsy();

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ content: [{ type: "text", text: '["x"]' }] }), {
          status: 200,
        }),
    );
    await claudeProvider({ apiKey: "k", fetch: fetchMock as any }).translate(["a"], "en", "ru");
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.system).toContain("ICU MessageFormat");
    expect(body.system).toContain("plural categories that ru needs");
  });
});
