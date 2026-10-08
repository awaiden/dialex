import type { TranslateProvider } from "dialexjs";
import {
  buildSystemPrompt,
  parseTranslations,
  readApiError,
  translateInBatches,
  truncatedError,
} from "./llm.js";

export interface ClaudeProviderOptions {
  /** Defaults to the `ANTHROPIC_API_KEY` environment variable. */
  apiKey?: string;
  /** Anthropic model ID. */
  model?: string;
  /** Strings per request. */
  batchSize?: number;
  /** Extra guidance appended to the prompt, e.g. "This is a banking app; use formal register." */
  context?: string;
  baseUrl?: string;
  /** Injected for tests. */
  fetch?: typeof fetch;
}

const DEFAULT_MODEL = "claude-sonnet-5-5";

/**
 * Translates with the Anthropic Messages API.
 * Reads `ANTHROPIC_API_KEY` unless `apiKey` is given. Nothing is sent until `translate` is called.
 */
export function claudeProvider(options: ClaudeProviderOptions = {}): TranslateProvider {
  const batchSize = options.batchSize ?? 40;

  return {
    name: "claude",
    supportsIcu: true,
    async translate(texts, from, to) {
      const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey)
        throw new Error("ANTHROPIC_API_KEY is not set (or pass apiKey to claudeProvider).");

      const doFetch = options.fetch ?? fetch;
      const url = `${options.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;
      const system = buildSystemPrompt({ from, to, context: options.context });

      return translateInBatches(texts, batchSize, async (chunk) => {
        const response = await doFetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: options.model ?? DEFAULT_MODEL,
            max_tokens: 8192,
            system,
            messages: [{ role: "user", content: JSON.stringify({ texts: chunk }) }],
          }),
        });

        if (!response.ok) throw await readApiError(response, "Anthropic", [apiKey]);

        const data = (await response.json()) as {
          content?: { type: string; text?: string }[];
          stop_reason?: string;
        };
        if (data.stop_reason === "max_tokens") throw truncatedError("Claude");

        const text = (data.content ?? [])
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join("");
        return parseTranslations(text, chunk.length, "Claude");
      });
    },
  };
}
