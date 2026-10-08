import type { TranslateProvider } from "dialexjs";
import {
  buildSystemPrompt,
  parseTranslations,
  readApiError,
  translateInBatches,
  truncatedError,
} from "./llm.js";

export interface GeminiProviderOptions {
  /** Defaults to the `GEMINI_API_KEY` environment variable, then `GOOGLE_API_KEY`. */
  apiKey?: string;
  /** Model ID. Defaults to the `GEMINI_MODEL` environment variable, then a built-in default. */
  model?: string;
  /** Strings per request. */
  batchSize?: number;
  /** Extra guidance appended to the prompt, e.g. "This is a banking app; use formal register." */
  context?: string;
  /** @default "https://generativelanguage.googleapis.com/v1beta" */
  baseUrl?: string;
  /** Sampling temperature. @default 0 */
  temperature?: number;
  /** Injected for tests. */
  fetch?: typeof fetch;
}

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Translates with the Google Gemini API.
 * Reads `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) unless `apiKey` is given. The key is sent in a
 * header, never in the URL. Nothing is sent until `translate` is called.
 */
export function geminiProvider(options: GeminiProviderOptions = {}): TranslateProvider {
  const batchSize = options.batchSize ?? 40;

  return {
    name: "gemini",
    supportsIcu: true,
    async translate(texts, from, to) {
      const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY (or GOOGLE_API_KEY) is not set (or pass apiKey to geminiProvider).",
        );
      }

      const doFetch = options.fetch ?? fetch;
      const model = (options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL).replace(
        /^models\//,
        "",
      );
      const url = `${(options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")}/models/${encodeURIComponent(model)}:generateContent`;
      const system = buildSystemPrompt({ from, to, context: options.context });

      return translateInBatches(texts, batchSize, async (chunk) => {
        const response = await doFetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: JSON.stringify({ texts: chunk }) }] }],
            generationConfig: {
              temperature: options.temperature ?? 0,
              responseMimeType: "application/json",
              responseSchema: { type: "ARRAY", items: { type: "STRING" } },
            },
          }),
        });

        if (!response.ok) throw await readApiError(response, "Gemini", [apiKey]);

        const data = (await response.json()) as {
          promptFeedback?: { blockReason?: string };
          candidates?: {
            finishReason?: string;
            content?: { parts?: { text?: string }[] };
          }[];
        };

        if (data.promptFeedback?.blockReason) {
          throw new Error(`Gemini blocked the request (${data.promptFeedback.blockReason}).`);
        }
        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error("Gemini returned no candidates.");
        if (candidate.finishReason === "MAX_TOKENS") throw truncatedError("Gemini");

        const text = (candidate.content?.parts ?? []).map((part) => part.text ?? "").join("");
        if (!text) {
          throw new Error(
            `Gemini returned no text${candidate.finishReason ? ` (finishReason ${candidate.finishReason})` : ""}.`,
          );
        }
        return parseTranslations(text, chunk.length, "Gemini");
      });
    },
  };
}
