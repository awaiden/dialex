import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { TranslateProvider } from "dialex";
import { runTranslate } from "../src/commands/translate.js";
import { claudeProvider } from "../src/translate/claude.js";
import { deeplProvider, toDeepLLanguage } from "../src/translate/deepl.js";
import { extractPlaceholders, preservesPlaceholders } from "../src/translate/placeholders.js";
import { getString, loadDictionaryFile } from "../src/utils/dictionary-edit.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const project = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-translate-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "dialex.config.ts"),
    `export default { defaultLocale: "en", locales: ["en", "tr", "de"] };\n`,
  );
  fs.writeFileSync(
    path.join(dir, "src/home.content.ts"),
    `import { defineDictionary } from "dialex";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    welcome: "Hello, {name}!",
    save: "Save",
    cancel: "Save",
    greeting: (name: string) => \`Hi \${name}\`,
  },
  tr: {
    title: "Hoş Geldiniz",
    save: "[TODO] Save",
  },
});
`,
  );
  return dir;
};

const load = async (dir: string) =>
  (await loadDictionaryFile(path.join(dir, "src/home.content.ts")))!;

/** Provider that records calls and "translates" by appending the target locale. */
const stub = (overrides: Partial<Record<string, string>> = {}) => {
  const calls: { texts: string[]; from: string; to: string }[] = [];
  const provider: TranslateProvider = {
    name: "stub",
    async translate(texts, from, to) {
      calls.push({ texts, from, to });
      return texts.map((t) => overrides[t] ?? `${t} (${to})`);
    },
  };
  return { provider, calls };
};

describe("placeholders", () => {
  it("extracts braces, printf-style, and tags", () => {
    expect(extractPlaceholders("Hi {name}, you have %d <b>new</b> %1$s")).toEqual([
      "{name}",
      "%d",
      "<b>",
      "</b>",
      "%1$s",
    ]);
  });

  it("requires every source placeholder to survive", () => {
    expect(preservesPlaceholders("Hello {name}", "Merhaba {name}")).toBe(true);
    expect(preservesPlaceholders("Hello {name}", "Merhaba {isim}")).toBe(false);
    expect(preservesPlaceholders("{a} {a}", "{a}")).toBe(false);
    expect(preservesPlaceholders("plain", "düz")).toBe(true);
  });
});

describe("runTranslate", () => {
  it("fills missing keys and [TODO] placeholders, leaves real translations and functions alone", async () => {
    const dir = project();
    const { provider, calls } = stub({ "Hello, {name}!": "Merhaba, {name}!" });

    const result = await runTranslate({ cwd: dir, provider, locale: ["tr"] });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ from: "en", to: "tr" });
    // "Save" appears twice in the source but is sent once
    expect(calls[0].texts.sort()).toEqual(["Hello, {name}!", "Save"]);
    expect(result.translated).toBe(3); // welcome, save ([TODO]), cancel

    const df = await load(dir);
    expect(getString(df, "tr", ["title"])).toBe("Hoş Geldiniz");
    expect(getString(df, "tr", ["welcome"])).toBe("Merhaba, {name}!");
    expect(getString(df, "tr", ["save"])).toBe("Save (tr)");
    expect(getString(df, "tr", ["cancel"])).toBe("Save (tr)");
    expect(fs.readFileSync(path.join(dir, "src/home.content.ts"), "utf-8")).toContain("greeting:");
  });

  it("translates every configured non-source locale by default", async () => {
    const dir = project();
    const { provider, calls } = stub();
    await runTranslate({ cwd: dir, provider });
    expect(calls.map((c) => c.to).sort()).toEqual(["de", "tr"]);
    expect(getString(await load(dir), "de", ["title"])).toBe("Welcome (de)");
  });

  it("rejects translations that change placeholders", async () => {
    const dir = project();
    const { provider } = stub({ "Hello, {name}!": "Merhaba, {isim}!" });
    const result = await runTranslate({ cwd: dir, provider, locale: ["tr"] });

    expect(result.rejected).toEqual(["tr:home.welcome (placeholders changed)"]);
    expect(getString(await load(dir), "tr", ["welcome"])).toBeUndefined();
  });

  it("dry run lists pending strings without calling the provider or writing", async () => {
    const dir = project();
    const before = fs.readFileSync(path.join(dir, "src/home.content.ts"), "utf-8");
    const { provider, calls } = stub();

    const result = await runTranslate({ cwd: dir, provider, locale: ["tr"], dryRun: true });
    expect(calls).toHaveLength(0);
    expect(result.dryRun).toBe(true);
    expect(result.pending.map((p) => p.key).sort()).toEqual([
      "home.cancel",
      "home.save",
      "home.welcome",
    ]);
    expect(fs.readFileSync(path.join(dir, "src/home.content.ts"), "utf-8")).toBe(before);
  });

  it("explains how to configure a provider when none is set", async () => {
    await expect(runTranslate({ cwd: project() })).rejects.toThrow(/claudeProvider/);
  });

  it("uses the provider from dialex.config.ts", async () => {
    const dir = project();
    fs.writeFileSync(
      path.join(dir, "dialex.config.ts"),
      `export default {
  defaultLocale: "en",
  locales: ["en", "tr"],
  translate: { provider: { name: "inline", translate: async (texts) => texts.map((t) => t + " [cfg]") } },
};\n`,
    );
    const result = await runTranslate({ cwd: dir });
    expect(result.translated).toBe(3);
    expect(getString(await load(dir), "tr", ["welcome"])).toBe("Hello, {name}! [cfg]");
  });

  it("rejects when the provider returns the wrong number of results", async () => {
    const provider: TranslateProvider = { translate: async () => ["only one"] };
    await expect(runTranslate({ cwd: project(), provider, locale: ["tr"] })).rejects.toThrow(
      /returned 1 translations/,
    );
  });
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("claudeProvider", () => {
  const reply = (texts: string[], fenced = false) =>
    jsonResponse({
      content: [
        {
          type: "text",
          text: fenced ? "```json\n" + JSON.stringify(texts) + "\n```" : JSON.stringify(texts),
        },
      ],
    });

  it("calls the Messages API with the key, model, and strings", async () => {
    const fetchMock = vi.fn(async () => reply(["Merhaba"], true));
    const provider = claudeProvider({
      apiKey: "sk-test",
      model: "test-model",
      fetch: fetchMock as any,
    });

    expect(await provider.translate(["Hello"], "en", "tr")).toEqual(["Merhaba"]);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-test");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.system).toContain("from en to tr");
    expect(JSON.parse(body.messages[0].content)).toEqual({ texts: ["Hello"] });
  });

  it("splits large inputs into batches", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { texts } = JSON.parse(JSON.parse(init.body as string).messages[0].content);
      return reply(texts.map((t: string) => t.toUpperCase()));
    });
    const provider = claudeProvider({ apiKey: "k", batchSize: 2, fetch: fetchMock as any });
    expect(await provider.translate(["a", "b", "c"], "en", "tr")).toEqual(["A", "B", "C"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails clearly without a key, on HTTP errors, and on malformed output", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await expect(claudeProvider().translate(["a"], "en", "tr")).rejects.toThrow(
        /ANTHROPIC_API_KEY/,
      );
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }

    const http = claudeProvider({
      apiKey: "k",
      fetch: (async () => jsonResponse({ error: "bad" }, 401)) as any,
    });
    await expect(http.translate(["a"], "en", "tr")).rejects.toThrow(/401/);

    const notJson = claudeProvider({
      apiKey: "k",
      fetch: (async () =>
        jsonResponse({ content: [{ type: "text", text: "Sure! Here you go" }] })) as any,
    });
    await expect(notJson.translate(["a"], "en", "tr")).rejects.toThrow(/not valid JSON/);

    const wrongLength = claudeProvider({
      apiKey: "k",
      fetch: (async () => reply(["x", "y"])) as any,
    });
    await expect(wrongLength.translate(["a"], "en", "tr")).rejects.toThrow(/unexpected shape/);
  });
});

describe("deeplProvider", () => {
  it("maps language codes", () => {
    expect(toDeepLLanguage("en", false)).toBe("EN");
    expect(toDeepLLanguage("en", true)).toBe("EN-US");
    expect(toDeepLLanguage("pt", true)).toBe("PT-PT");
    expect(toDeepLLanguage("pt-BR", true)).toBe("PT-BR");
    expect(toDeepLLanguage("tr", true)).toBe("TR");
  });

  it("protects placeholders and special characters across the round trip", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { text } = JSON.parse(init.body as string);
      // Echo with a prefix, as DeepL would keep the <x/> tags in place
      return jsonResponse({ translations: text.map((t: string) => ({ text: `Selam ${t}` })) });
    });
    const provider = deeplProvider({ apiKey: "abc:fx", fetch: fetchMock as any });

    const [out] = await provider.translate(["Hi {name}, 5 < 6 & %d"], "en", "tr");
    expect(out).toBe("Selam Hi {name}, 5 < 6 & %d");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api-free.deepl.com/v2/translate");
    expect((init.headers as Record<string, string>).authorization).toBe("DeepL-Auth-Key abc:fx");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      source_lang: "EN",
      target_lang: "TR",
      tag_handling: "xml",
      ignore_tags: ["x"],
    });
    expect(body.text[0]).toBe('Hi <x id="0"/>, 5 &lt; 6 &amp; <x id="1"/>');
  });

  it("uses the paid endpoint for non-free keys and requires a key", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ translations: [{ text: "x" }] }));
    await deeplProvider({ apiKey: "pro-key", fetch: fetchMock as any }).translate(
      ["a"],
      "en",
      "de",
    );
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://api.deepl.com/v2/translate",
    );

    const saved = process.env.DEEPL_API_KEY;
    delete process.env.DEEPL_API_KEY;
    try {
      await expect(deeplProvider().translate(["a"], "en", "de")).rejects.toThrow(/DEEPL_API_KEY/);
    } finally {
      if (saved !== undefined) process.env.DEEPL_API_KEY = saved;
    }
  });
});
