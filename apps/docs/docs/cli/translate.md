# dialex translate

Fills missing translations with a machine-translation provider that you configure. Nothing is sent anywhere unless a provider is set.

```bash
dialex translate --dry-run
dialex translate
dialex translate -l tr de
dialex translate -s en
```

| Option                      | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `-l, --locale <locales...>` | Target locales (default: every configured locale except the source)      |
| `-s, --source <locale>`     | Source locale (default: `translate.sourceLocale`, then `defaultLocale`)  |
| `--dry-run`                 | List what would be translated. Does not call the provider or write files |
| `-c, --config <path>`       | Custom config path                                                       |

## Configure a provider

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";
import { claudeProvider } from "@dialexjs/cli/translate";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr", "de"],
  translate: {
    provider: claudeProvider({ context: "Banking app. Use a formal register." }),
  },
});
```

### Built-in providers

| Provider                   | Credential                                                           | Options                                                                |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `claudeProvider(options?)` | `ANTHROPIC_API_KEY` (or `apiKey`)                                    | `model`, `batchSize` (default 40), `context`, `baseUrl`                |
| `deeplProvider(options?)`  | `DEEPL_API_KEY` (or `apiKey`). Keys ending in `:fx` use the free API | `formality`, `baseUrl`                                                 |
| `openaiProvider(options?)` | `OPENAI_API_KEY` (or `apiKey`; optional with a custom `baseUrl`)     | `model`, `batchSize` (default 40), `context`, `baseUrl`, `temperature` |
| `geminiProvider(options?)` | `GEMINI_API_KEY` or `GOOGLE_API_KEY` (or `apiKey`)                   | `model`, `batchSize` (default 40), `context`, `baseUrl`, `temperature` |

`openaiProvider` calls the OpenAI Chat Completions API. Set `baseUrl` to use an OpenAI-compatible server such as Azure OpenAI, Ollama or OpenRouter; the key is then optional. Each provider ships a default model (`claude-sonnet-5-5`, `gpt-4o-mini`, `gemini-2.5-flash`). Change it with `model`, or with the `OPENAI_MODEL` / `GEMINI_MODEL` environment variables.

The Claude, OpenAI and Gemini providers are tested against mocked HTTP only, not against the live services, so check the model names against each vendor's current list.

### Your own provider

A provider is any object with a `translate` function that returns one translation per input, in order:

```ts
translate: {
  provider: {
    name: "my-service",
    async translate(texts, from, to) {
      return await myService.translateAll(texts, from, to);
    },
  },
  sourceLocale: "en",
}
```

## What gets translated

A string is translated when the target locale has no value for it, or its value still starts with `[TODO]` (see [`check --fix`](./check.md#fix)). Existing translations are never overwritten. Function values are not translated. Identical source strings are sent once per locale.

## ICU messages

Strings that use [ICU](../guide/icu.md) plural or select syntax are only sent to providers that declare `supportsIcu: true` (`claudeProvider`, `openaiProvider` and `geminiProvider` do; `deeplProvider` does not). For other providers they are skipped and listed in the summary. Custom providers opt in with `supportsIcu: true`.

A translated ICU message is accepted only when it keeps the same arguments and types, every `select` key and every exact `=N` match. Plural categories may be added or removed, because languages need different ones.

## Safety checks

Placeholders such as `{name}`, `%s`, `%1$d` and HTML tags must survive translation. A result that drops or changes one is rejected, left unchanged, and listed in the summary, as is an empty result.

Review the changes in version control afterwards. Machine translation is a starting point, not a final answer.
