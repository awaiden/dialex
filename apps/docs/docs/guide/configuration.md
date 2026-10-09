# Configuration

Dialex loads `dialex.config.*` (or `i18n.config.*`) from the project root; `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, and `.json` are supported.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| Option          | Type                          | Default             | Description                                                                                                                               |
| --------------- | ----------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | Locale used when none can be resolved                                                                                                     |
| `locales`       | `string[]`                    | —                   | Supported locales; enables locale type narrowing and parity checks. When omitted, `dx generate` uses the locales your dictionaries define |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Glob(s) for dictionary files                                                                                                              |
| `configFile`    | `string`                      | —                   | Custom config path                                                                                                                        |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Explicit [fallback chains](./fallbacks.md) per locale                                                                                     |
| `prefixDefault` | `boolean`                     | `true`              | Whether the default locale also gets a URL prefix. Read by `DialexLink` and the [routing helpers](./routing.md)                           |
| `lazy`          | `boolean`                     | `false`             | Load dictionaries on demand (client bundles). See [Lazy Loading](./lazy-loading.md)                                                       |
| `translate`     | `{ provider, sourceLocale? }` | —                   | Provider for [`dialex translate`](../cli/translate.md)                                                                                    |

The file is optional: without it every default above applies. `dx generate` copies the settings the runtime needs (not `translate`) into `dialex.generated.ts`, so rerun it after changing the file.
