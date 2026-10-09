import type { TranslateProvider } from "dialexjs";

import {
  buildSystemPrompt,
  parseTranslations,
  readApiError,
  translateInBatches,
  truncatedError,
} from "./llm.js";

export interface OpenAIProviderOptions {
  /** Defaults to the `OPENAI_API_KEY` environment variable. */
  apiKey?: string;
  /** Model ID. Defaults to the `OPENAI_MODEL` environment variable, then a built-in default. */
  model?: string;
  /** Strings per request. */
  batchSize?: number;
  /** Extra guidance appended to the prompt, e.g. "This is a banking app; use formal register." */
  context?: string;
  /**
   * API root, for OpenAI-compatible servers (Azure OpenAI, Ollama, OpenRouter, ...).
   * With a custom `baseUrl` an API key is optional.
   * @default "https://api.openai.com/v1"
   */
  baseUrl?: string;
  /**
   * Sampling temperature. Left out by default because some models only accept their default.
   */
  temperature?: number;
  /** Injected for tests. */
  fetch?: typeof fetch;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/**
 * Translates with the OpenAI Chat Completions API (the API behind ChatGPT), or any server that
 * speaks it. Reads `OPENAI_API_KEY` unless `apiKey` is given. Nothing is sent until `translate`
 * is called.
 */
export function openaiProvider(options: OpenAIProviderOptions = {}): TranslateProvider {
  const batchSize = options.batchSize ?? 40;

  return {
    name: "openai",
    supportsIcu: true,
    async translate(texts, from, to) {
      const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
      const customServer = options.baseUrl !== undefined;
      if (!apiKey && !customServer) {
        throw new Error("OPENAI_API_KEY is not set (or pass apiKey to openaiProvider).");
      }

      const doFetch = options.fetch ?? fetch;
      const url = `${(options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")}/chat/completions`;
      const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
      const system = buildSystemPrompt({ from, to, context: options.context, format: "object" });

      return translateInBatches(texts, batchSize, async (chunk) => {
        const response = await doFetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: JSON.stringify({ texts: chunk }) },
            ],
            // `json_object` is understood by OpenAI-compatible servers; `json_schema` is not.
            response_format: { type: "json_object" },
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          }),
        });

        if (!response.ok) throw await readApiError(response, "OpenAI", [apiKey]);

        const data = (await response.json()) as {
          choices?: {
            finish_reason?: string;
            message?: { content?: string | null; refusal?: string | null };
          }[];
        };
        const choice = data.choices?.[0];
        if (choice?.finish_reason === "length") throw truncatedError("OpenAI");
        if (choice?.message?.refusal) {
          throw new Error(`OpenAI declined the request: ${choice.message.refusal}`);
        }

        const content = choice?.message?.content;
        if (!content) throw new Error("OpenAI returned an empty response.");
        return parseTranslations(content, chunk.length, "OpenAI");
      });
    },
  };
}
