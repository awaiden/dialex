import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { runTranslate } from "../src/commands/translate.js";
import { claudeProvider } from "../src/translate/claude.js";
import { geminiProvider } from "../src/translate/gemini.js";
import { openaiProvider } from "../src/translate/openai.js";
import { getString, loadDictionaryFile } from "../src/utils/dictionary-edit.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A fetch mock that returns `reply(body)` and records each call. */
const mockFetch = (reply: (body: any, call: number) => Response | Promise<Response>) => {
  const calls: { url: string; init: RequestInit; body: any }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    calls.push({ url, init, body });
    return reply(body, calls.length - 1);
  });
  return { fn: fn as unknown as typeof fetch, calls };
};

const headersOf = (call: { init: RequestInit }) => call.init.headers as Record<string, string>;
const userTexts = (body: any): string[] =>
  JSON.parse(
    body.messages?.find((m: any) => m.role === "user")?.content ??
      body.contents?.[0]?.parts?.[0]?.text,
  ).texts;

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_MODEL",
];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// ---------------------------------------------------------------- OpenAI

const openaiReply = (content: unknown, extra: Record<string, unknown> = {}) =>
  json({
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) }, ...extra }],
  });

describe("openaiProvider", () => {
  it("calls Chat Completions with the key, model, JSON mode and the strings", async () => {
    const { fn, calls } = mockFetch(() => openaiReply({ translations: ["Merhaba"] }));
    const provider = openaiProvider({
      apiKey: "sk-test",
      model: "test-model",
      context: "Formal.",
      fetch: fn,
    });

    expect(await provider.translate(["Hello"], "en", "tr")).toEqual(["Merhaba"]);

    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(headersOf(calls[0]).authorization).toBe("Bearer sk-test");
    const { body } = calls[0];
    expect(body.model).toBe("test-model");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("from en to tr");
    expect(body.messages[0].content).toContain('{"translations": [...]}');
    expect(body.messages[0].content.endsWith("Formal.")).toBe(true);
    expect(userTexts(body)).toEqual(["Hello"]);
    expect("temperature" in body).toBe(false);
  });

  it("picks the model from the option, then OPENAI_MODEL, then the default", async () => {
    const used: string[] = [];
    const { fn } = mockFetch((body) => {
      used.push(body.model);
      return openaiReply(["x"]);
    });
    await openaiProvider({ apiKey: "k", fetch: fn }).translate(["a"], "en", "tr");
    process.env.OPENAI_MODEL = "from-env";
    await openaiProvider({ apiKey: "k", fetch: fn }).translate(["a"], "en", "tr");
    await openaiProvider({ apiKey: "k", model: "from-option", fetch: fn }).translate(
      ["a"],
      "en",
      "tr",
    );
    expect(used).toEqual(["gpt-4o-mini", "from-env", "from-option"]);
  });

  it("sends a temperature only when asked", async () => {
    const { fn, calls } = mockFetch(() => openaiReply(["x"]));
    await openaiProvider({ apiKey: "k", temperature: 0, fetch: fn }).translate(["a"], "en", "tr");
    expect(calls[0].body.temperature).toBe(0);
  });

  it("reads bare arrays and fenced JSON too, and batches in order", async () => {
    const { fn, calls } = mockFetch((body, i) =>
      i === 0
        ? json({
            choices: [{ finish_reason: "stop", message: { content: '```json\n["A","B"]\n```' } }],
          })
        : openaiReply(userTexts(body).map((t: string) => t.toUpperCase())),
    );
    const provider = openaiProvider({ apiKey: "k", batchSize: 2, fetch: fn });
    expect(await provider.translate(["a", "b", "c"], "en", "tr")).toEqual(["A", "B", "C"]);
    expect(calls.map((c) => userTexts(c.body))).toEqual([["a", "b"], ["c"]]);
  });

  it("works with a custom server and needs no key there", async () => {
    const { fn, calls } = mockFetch(() => openaiReply(["x"]));
    const provider = openaiProvider({ baseUrl: "http://localhost:11434/v1/", fetch: fn });
    await provider.translate(["a"], "en", "tr");

    expect(calls[0].url).toBe("http://localhost:11434/v1/chat/completions");
    expect("authorization" in headersOf(calls[0])).toBe(false);

    const withKey = mockFetch(() => openaiReply(["x"]));
    await openaiProvider({
      baseUrl: "http://localhost/v1",
      apiKey: "k",
      fetch: withKey.fn,
    }).translate(["a"], "en", "tr");
    expect(headersOf(withKey.calls[0]).authorization).toBe("Bearer k");
  });

  it("declares ICU support and a name", () => {
    const provider = openaiProvider({ apiKey: "k" });
    expect(provider.supportsIcu).toBe(true);
    expect(provider.name).toBe("openai");
  });

  it("fails clearly: no key, HTTP errors (key redacted), bad output, truncation, refusal", async () => {
    await expect(openaiProvider().translate(["a"], "en", "tr")).rejects.toThrow(/OPENAI_API_KEY/);

    const http = mockFetch(() => new Response("Incorrect API key: sk-leaky", { status: 401 }));
    const error = await openaiProvider({ apiKey: "sk-leaky", fetch: http.fn })
      .translate(["a"], "en", "tr")
      .catch((e) => e);
    expect(error.message).toBe("OpenAI API error 401: Incorrect API key: ***");

    const bad = (response: Response) =>
      openaiProvider({ apiKey: "k", fetch: mockFetch(() => response).fn }).translate(
        ["a"],
        "en",
        "tr",
      );
    await expect(bad(json({ choices: [{ message: { content: "Sure!" } }] }))).rejects.toThrow(
      /not valid JSON/,
    );
    await expect(bad(openaiReply(["x", "y"]))).rejects.toThrow(
      /unexpected shape \(expected 1 strings\)/,
    );
    await expect(
      bad(json({ choices: [{ finish_reason: "length", message: { content: '["x"' } }] })),
    ).rejects.toThrow(/cut off/);
    await expect(
      bad(json({ choices: [{ message: { refusal: "I can't help with that." } }] })),
    ).rejects.toThrow("OpenAI declined the request: I can't help with that.");
    await expect(bad(json({ choices: [] }))).rejects.toThrow("OpenAI returned an empty response.");
  });
});

// ---------------------------------------------------------------- Gemini

const geminiReply = (text: string | string[], extra: Record<string, unknown> = {}) =>
  json({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: (Array.isArray(text) ? text : [text]).map((t) => ({ text: t })) },
        ...extra,
      },
    ],
  });

describe("geminiProvider", () => {
  it("calls generateContent with the key in a header, not in the URL", async () => {
    const { fn, calls } = mockFetch(() => geminiReply('["Merhaba"]'));
    const provider = geminiProvider({
      apiKey: "g-secret",
      model: "test-model",
      context: "Formal.",
      fetch: fn,
    });

    expect(await provider.translate(["Hello"], "en", "tr")).toEqual(["Merhaba"]);

    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent",
    );
    expect(calls[0].url).not.toContain("g-secret");
    expect(headersOf(calls[0])["x-goog-api-key"]).toBe("g-secret");

    const { body } = calls[0];
    expect(body.systemInstruction.parts[0].text).toContain("from en to tr");
    expect(body.systemInstruction.parts[0].text.endsWith("Formal.")).toBe(true);
    expect(userTexts(body)).toEqual(["Hello"]);
    expect(body.generationConfig).toEqual({
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: { type: "ARRAY", items: { type: "STRING" } },
    });
  });

  it("uses GEMINI_API_KEY, then GOOGLE_API_KEY, and picks the model like OpenAI", async () => {
    const seen: { key: string; url: string }[] = [];
    const { fn } = mockFetch(() => geminiReply('["x"]'));
    const recording = (async (url: string, init: RequestInit) => {
      seen.push({ key: (init.headers as Record<string, string>)["x-goog-api-key"], url });
      return (fn as any)(url, init);
    }) as unknown as typeof fetch;

    process.env.GOOGLE_API_KEY = "google";
    await geminiProvider({ fetch: recording }).translate(["a"], "en", "tr");
    process.env.GEMINI_API_KEY = "gemini";
    process.env.GEMINI_MODEL = "env-model";
    await geminiProvider({ fetch: recording }).translate(["a"], "en", "tr");
    await geminiProvider({ apiKey: "opt", model: "models/prefixed", fetch: recording }).translate(
      ["a"],
      "en",
      "tr",
    );

    expect(seen.map((s) => s.key)).toEqual(["google", "gemini", "opt"]);
    expect(seen.map((s) => s.url.split("/models/")[1])).toEqual([
      "gemini-2.5-flash:generateContent",
      "env-model:generateContent",
      "prefixed:generateContent",
    ]);
  });

  it("joins multi-part replies, reads fenced JSON, and batches in order", async () => {
    const { fn, calls } = mockFetch((body, i) =>
      i === 0
        ? geminiReply(['```json\n["A",', '"B"]\n```'])
        : geminiReply(JSON.stringify(userTexts(body).map((t: string) => t.toUpperCase()))),
    );
    const provider = geminiProvider({ apiKey: "k", batchSize: 2, fetch: fn });
    expect(await provider.translate(["a", "b", "c"], "en", "tr")).toEqual(["A", "B", "C"]);
    expect(calls.map((c) => userTexts(c.body))).toEqual([["a", "b"], ["c"]]);
  });

  it("declares ICU support and a name", () => {
    const provider = geminiProvider({ apiKey: "k" });
    expect(provider.supportsIcu).toBe(true);
    expect(provider.name).toBe("gemini");
  });

  it("fails clearly: no key, HTTP errors (key redacted), blocks, truncation, bad output", async () => {
    await expect(geminiProvider().translate(["a"], "en", "tr")).rejects.toThrow(
      /GEMINI_API_KEY \(or GOOGLE_API_KEY\)/,
    );

    const http = mockFetch(() => new Response("API key g-leaky is not valid", { status: 400 }));
    const error = await geminiProvider({ apiKey: "g-leaky", fetch: http.fn })
      .translate(["a"], "en", "tr")
      .catch((e) => e);
    expect(error.message).toBe("Gemini API error 400: API key *** is not valid");

    const bad = (response: Response) =>
      geminiProvider({ apiKey: "k", fetch: mockFetch(() => response).fn }).translate(
        ["a"],
        "en",
        "tr",
      );
    await expect(bad(json({ promptFeedback: { blockReason: "SAFETY" } }))).rejects.toThrow(
      "Gemini blocked the request (SAFETY).",
    );
    await expect(bad(json({ candidates: [] }))).rejects.toThrow("Gemini returned no candidates.");
    await expect(bad(geminiReply('["x"', { finishReason: "MAX_TOKENS" }))).rejects.toThrow(
      /cut off/,
    );
    await expect(
      bad(json({ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] })),
    ).rejects.toThrow("Gemini returned no text (finishReason SAFETY).");
    await expect(bad(geminiReply("Sure!"))).rejects.toThrow(/not valid JSON/);
    await expect(bad(geminiReply('["x","y"]'))).rejects.toThrow(/expected 1 strings/);
  });
});

describe("claudeProvider truncation guard", () => {
  it("reports a cut-off reply instead of a confusing JSON error", async () => {
    const { fn } = mockFetch(() =>
      json({ stop_reason: "max_tokens", content: [{ type: "text", text: '["x"' }] }),
    );
    await expect(
      claudeProvider({ apiKey: "k", fetch: fn }).translate(["a"], "en", "tr"),
    ).rejects.toThrow(
      "Claude's response was cut off before it finished. Lower batchSize and try again.",
    );
  });
});

// ------------------------------------------- end to end through runTranslate

describe("providers through runTranslate against a local HTTP server", () => {
  let server: http.Server;
  let base: string;
  let seen: { url: string; headers: http.IncomingHttpHeaders; body: any }[];
  const dirs: string[] = [];

  /** Answers like each vendor would, "translating" by appending the target language. */
  beforeEach(async () => {
    seen = [];
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const body = JSON.parse(raw);
        seen.push({ url: req.url!, headers: req.headers, body });
        const to = /to (\w+)\./.exec(
          body.systemInstruction?.parts[0].text ?? body.messages?.[0].content,
        )![1];
        const translated = userTexts(body).map((t: string) => `${t} (${to})`);
        const payload = req.url!.includes("chat/completions")
          ? {
              choices: [
                {
                  finish_reason: "stop",
                  message: { content: JSON.stringify({ translations: translated }) },
                },
              ],
            }
          : {
              candidates: [
                {
                  finishReason: "STOP",
                  content: { parts: [{ text: JSON.stringify(translated) }] },
                },
              ],
            };
        res.setHeader("content-type", "application/json").end(JSON.stringify(payload));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  const project = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-llm-"));
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "dialex.config.ts"),
      `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`,
    );
    fs.writeFileSync(
      path.join(dir, "src/home.content.ts"),
      `export default {
  name: "home",
  dictionary: {
    en: { title: "Welcome", items: "{count, plural, one {# item} other {# items}}" },
    tr: {},
  },
};\n`,
    );
    return dir;
  };

  it.each([
    ["openai", (): any => openaiProvider({ baseUrl: `${base}/v1`, apiKey: "sk-test" })],
    ["gemini", (): any => geminiProvider({ baseUrl: `${base}/v1beta`, apiKey: "g-test" })],
  ])("%s fills a dictionary over real HTTP, including an ICU message", async (_name, make) => {
    const dir = project();
    const result = await runTranslate({ cwd: dir, provider: make(), locale: ["tr"] });

    // The stub appends " (tr)" to the text, which keeps the ICU structure valid only if the
    // branch text changes: "{count, plural, ...}" is left as is by the stub, so it is rejected.
    expect(seen).toHaveLength(1);
    expect(userTexts(seen[0].body).sort()).toEqual([
      "Welcome",
      "{count, plural, one {# item} other {# items}}",
    ]);
    expect(result.translated).toBeGreaterThanOrEqual(1);

    const df = (await loadDictionaryFile(path.join(dir, "src/home.content.ts")))!;
    expect(getString(df, "tr", ["title"])).toBe("Welcome (tr)");
  });

  it("sends the right credentials to each server", async () => {
    await openaiProvider({ baseUrl: `${base}/v1`, apiKey: "sk-test" }).translate(["a"], "en", "tr");
    await geminiProvider({ baseUrl: `${base}/v1beta`, apiKey: "g-test", model: "m" }).translate(
      ["a"],
      "en",
      "tr",
    );

    expect(seen[0].url).toBe("/v1/chat/completions");
    expect(seen[0].headers.authorization).toBe("Bearer sk-test");
    expect(seen[1].url).toBe("/v1beta/models/m:generateContent");
    expect(seen[1].headers["x-goog-api-key"]).toBe("g-test");
    expect(seen[1].url).not.toContain("g-test");
  });
});
