import { describe, expect, it } from "vite-plus/test";

import {
  buildSystemPrompt,
  parseTranslations,
  readApiError,
  translateInBatches,
} from "../src/translate/llm.js";

describe("buildSystemPrompt", () => {
  it("names the languages and carries the placeholder and ICU rules", () => {
    const prompt = buildSystemPrompt({ from: "en", to: "ru" });
    expect(prompt).toContain("from en to ru");
    expect(prompt).toContain("placeholders such as {name}, %s, %d");
    expect(prompt).toContain("ICU MessageFormat");
    expect(prompt).toContain("plural categories that ru needs");
  });

  it("asks for a bare array by default and an object when requested", () => {
    expect(buildSystemPrompt({ from: "en", to: "tr" })).toContain("ONLY a JSON array");
    const object = buildSystemPrompt({ from: "en", to: "tr", format: "object" });
    expect(object).toContain('{"translations": [...]}');
    expect(object).not.toContain("ONLY a JSON array");
  });

  it("appends the caller's context last, and only when given", () => {
    const withContext = buildSystemPrompt({
      from: "en",
      to: "de",
      context: "Banking app; formal.",
    });
    expect(withContext.endsWith("Banking app; formal.")).toBe(true);
    expect(buildSystemPrompt({ from: "en", to: "de" })).not.toContain("Banking");
  });
});

describe("parseTranslations", () => {
  it("reads a bare array, an object with translations, and fenced JSON", () => {
    expect(parseTranslations('["a","b"]', 2, "X")).toEqual(["a", "b"]);
    expect(parseTranslations('{"translations":["a","b"]}', 2, "X")).toEqual(["a", "b"]);
    expect(parseTranslations('```json\n["a"]\n```', 1, "X")).toEqual(["a"]);
    expect(parseTranslations('```\n{"translations":["a"]}\n```', 1, "X")).toEqual(["a"]);
  });

  it("names the vendor when the reply is not JSON", () => {
    expect(() => parseTranslations("Sure! Here you go", 1, "Gemini")).toThrow(
      "Gemini returned a response that is not valid JSON.",
    );
  });

  it("rejects the wrong length, non-strings, and unrelated shapes", () => {
    const shape = (text: string) => () => parseTranslations(text, 2, "OpenAI");
    expect(shape('["a"]')).toThrow("OpenAI returned an unexpected shape (expected 2 strings).");
    expect(shape('["a", 1]')).toThrow(/unexpected shape/);
    expect(shape('{"items":["a","b"]}')).toThrow(/unexpected shape/);
    expect(shape("null")).toThrow(/unexpected shape/);
    expect(shape('"a"')).toThrow(/unexpected shape/);
  });
});

describe("translateInBatches", () => {
  it("splits into chunks of batchSize and keeps the order", async () => {
    const chunks: string[][] = [];
    const result = await translateInBatches(["a", "b", "c", "d", "e"], 2, async (chunk) => {
      chunks.push(chunk);
      return chunk.map((t) => t.toUpperCase());
    });
    expect(chunks).toEqual([["a", "b"], ["c", "d"], ["e"]]);
    expect(result).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("does nothing for an empty input and runs chunks one after another", async () => {
    expect(await translateInBatches([], 5, async () => ["x"])).toEqual([]);

    let running = 0;
    let peak = 0;
    await translateInBatches(["a", "b", "c"], 1, async (chunk) => {
      peak = Math.max(peak, ++running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return chunk;
    });
    expect(peak).toBe(1);
  });
});

describe("readApiError", () => {
  it("reports the status and the start of the body", async () => {
    const error = await readApiError(new Response("x".repeat(500), { status: 429 }), "OpenAI");
    expect(error.message).toBe(`OpenAI API error 429: ${"x".repeat(300)}`);
  });

  it("blanks out secrets the server echoed back", async () => {
    const response = new Response(
      "Incorrect API key provided: sk-secret-123. Also sk-secret-123.",
      { status: 401 },
    );
    const error = await readApiError(response, "OpenAI", ["sk-secret-123", undefined]);
    expect(error.message).toBe("OpenAI API error 401: Incorrect API key provided: ***. Also ***.");
  });
});
