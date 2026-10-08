/**
 * Plumbing shared by the chat-model providers (Claude, OpenAI, Gemini): one system prompt, one
 * way to read the model's JSON reply, batching, and API error reporting.
 */

export interface PromptOptions {
  from: string;
  to: string;
  /** Extra guidance, e.g. "This is a banking app; use formal register." */
  context?: string;
  /**
   * How the model should shape its reply. APIs with a JSON mode that only allows objects
   * (OpenAI) need `"object"`; the others can return a bare array.
   */
  format?: "array" | "object";
}

/** The instruction every chat provider gives the model. Keep providers on this one prompt. */
export function buildSystemPrompt({ from, to, context, format = "array" }: PromptOptions): string {
  return [
    `You translate user-interface strings from ${from} to ${to}.`,
    "The user message is a JSON object with a `texts` array.",
    format === "array"
      ? "Reply with ONLY a JSON array of translated strings: same length, same order, no commentary."
      : 'Reply with ONLY a JSON object {"translations": [...]} whose array holds the translated strings: same length, same order, no commentary.',
    "Keep placeholders such as {name}, %s, %d, HTML tags, URLs, and emoji exactly as written.",
    "Some strings are ICU MessageFormat, e.g. {count, plural, one {# item} other {# items}}.",
    "For those, keep the structure, argument names, types, and select keys unchanged, keep # as is,",
    "and translate only the text inside the branches.",
    `Give plural messages the plural categories that ${to} needs (CLDR), keeping any =0 / =1 branches and "other".`,
    context,
  ]
    .filter(Boolean)
    .join("\n");
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Reads a model's reply: a JSON array of strings, or `{ "translations": [...] }`, optionally in a
 * Markdown code fence. Throws if it is not valid JSON or does not hold `expected` strings.
 */
export function parseTranslations(text: string, expected: number, vendor: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error(`${vendor} returned a response that is not valid JSON.`);
  }

  const list =
    Array.isArray(parsed) || parsed === null || typeof parsed !== "object"
      ? parsed
      : (parsed as { translations?: unknown }).translations;

  if (
    !Array.isArray(list) ||
    list.length !== expected ||
    !list.every((s) => typeof s === "string")
  ) {
    throw new Error(`${vendor} returned an unexpected shape (expected ${expected} strings).`);
  }
  return list as string[];
}

/** Sends `texts` in chunks of `batchSize`, keeping the order of the results. */
export async function translateInBatches(
  texts: string[],
  batchSize: number,
  requestChunk: (chunk: string[]) => Promise<string[]>,
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    results.push(...(await requestChunk(texts.slice(i, i + batchSize))));
  }
  return results;
}

/** `"<vendor> API error <status>: <start of the body>"`, with any secrets blanked out. */
export async function readApiError(
  response: Response,
  vendor: string,
  secrets: (string | undefined)[] = [],
): Promise<Error> {
  let detail = (await response.text()).slice(0, 300);
  for (const secret of secrets) {
    if (secret) detail = detail.split(secret).join("***");
  }
  return new Error(`${vendor} API error ${response.status}: ${detail}`);
}

const TRUNCATED = (vendor: string) =>
  `${vendor}'s response was cut off before it finished. Lower batchSize and try again.`;

export const truncatedError = (vendor: string) => new Error(TRUNCATED(vendor));
