# Locale Fallbacks

When a dictionary has no content for the requested locale, Dialex walks a fallback chain instead of jumping straight to the default:

1. the locale itself (`pt-BR`)
2. its explicit fallbacks from the config, in order
3. its subtag truncations (`pt-BR` → `pt`)
4. the truncations of the explicit fallbacks
5. `defaultLocale`

If nothing matches, the first locale defined in the dictionary is used.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "es", "pt"],
  fallbacks: {
    "pt-BR": ["pt", "es"],
    gl: ["es"],
  },
});
```

For example, a request for `tr-TR` with a Turkish dictionary resolves `tr` automatically, with no configuration. A request for `gl` with no Galician content resolves `es`.

A warning is logged whenever content comes from a different locale than the one requested.

## Adapters

Server adapters also accept `fallbacks` directly, which is useful when you pass `dictionaries` instead of relying on the config file:

```ts
app.use(dialex({ dictionaries, locales: ["en", "es"], fallbacks: { pt: ["es"] } }));
```

Fallbacks apply to dictionary lookups. [Locale detection](./locale-detection.md) still only returns locales listed in `locales`.
