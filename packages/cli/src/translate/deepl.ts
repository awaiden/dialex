import type { TranslateProvider } from "dialexjs";

export interface DeepLProviderOptions {
  /** Defaults to the `DEEPL_API_KEY` environment variable. Keys ending in `:fx` use the free API. */
  apiKey?: string;
  formality?: "default" | "more" | "less" | "prefer_more" | "prefer_less";
  baseUrl?: string;
  /** Injected for tests. */
  fetch?: typeof fetch;
}

const BATCH_SIZE = 50;
const PLACEHOLDER = /\{[^{}]+\}|%\d*\$?[sdif]/g;

/** Maps a BCP 47 tag to DeepL's language codes. */
export function toDeepLLanguage(code: string, target: boolean): string {
  const [primary, ...rest] = code.split("-");
  const upper = [primary.toUpperCase(), ...rest.map((r) => r.toUpperCase())].join("-");
  if (!target) return primary.toUpperCase();
  if (rest.length === 0) {
    if (primary === "en") return "EN-US";
    if (primary === "pt") return "PT-PT";
  }
  return upper;
}

/** Replaces placeholders with `<x id="n"/>` tags that DeepL is told to leave alone. */
function protect(text: string): { text: string; placeholders: string[] } {
  const placeholders: string[] = [];
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const protectedText = escaped.replace(PLACEHOLDER, (match) => {
    placeholders.push(match.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    return `<x id="${placeholders.length - 1}"/>`;
  });
  return { text: protectedText, placeholders };
}

function restore(text: string, placeholders: string[]): string {
  return text
    .replace(/<x id="(\d+)"\s*\/>/g, (_, i) => placeholders[Number(i)] ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Translates with the DeepL API.
 * Reads `DEEPL_API_KEY` unless `apiKey` is given. Nothing is sent until `translate` is called.
 */
export function deeplProvider(options: DeepLProviderOptions = {}): TranslateProvider {
  return {
    name: "deepl",
    async translate(texts, from, to) {
      const apiKey = options.apiKey ?? process.env.DEEPL_API_KEY;
      if (!apiKey) throw new Error("DEEPL_API_KEY is not set (or pass apiKey to deeplProvider).");

      const doFetch = options.fetch ?? fetch;
      const baseUrl =
        options.baseUrl ??
        (apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");

      const results: string[] = [];
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const chunk = texts.slice(i, i + BATCH_SIZE).map(protect);
        const response = await doFetch(`${baseUrl}/v2/translate`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `DeepL-Auth-Key ${apiKey}`,
          },
          body: JSON.stringify({
            text: chunk.map((c) => c.text),
            source_lang: toDeepLLanguage(from, false),
            target_lang: toDeepLLanguage(to, true),
            tag_handling: "xml",
            ignore_tags: ["x"],
            ...(options.formality ? { formality: options.formality } : {}),
          }),
        });

        if (!response.ok) {
          const detail = (await response.text()).slice(0, 300);
          throw new Error(`DeepL API error ${response.status}: ${detail}`);
        }

        const data = (await response.json()) as { translations?: { text: string }[] };
        const translations = data.translations ?? [];
        if (translations.length !== chunk.length) {
          throw new Error(
            `DeepL returned ${translations.length} translations for ${chunk.length} strings.`,
          );
        }
        translations.forEach((t, index) =>
          results.push(restore(t.text, chunk[index].placeholders)),
        );
      }
      return results;
    },
  };
}
