---
name: dialex
description: Guide for internationalizing JavaScript and TypeScript apps with Dialex. Use when adding translations, creating content dictionaries, configuring locales, or using Dialex with frameworks like Next.js, React, Express, Hono, Fastify, SvelteKit, and Nuxt.
---

# Dialex Internationalization

Dialex is a high-performance, type-safe internationalization toolchain for JavaScript and TypeScript.

## Core Concepts

1. **Content Dictionaries (`*.content.ts`)**: Co-located dictionary files defining translations across locales with type safety.
2. **Static Parity & Check (`dialex check`)**: Dialex validates that every translation key exists across all defined locales at compile time or in CI.
3. **ICU MessageFormat Support**: Full pluralization and select syntax (`{count, plural, one {# item} other {# items}}`) with argument verification.
4. **Adapter Integrations**: Native middleware and helpers for Next.js, React, Express, Fastify, Hono, Koa, NestJS, SvelteKit, Astro, Vue, and Nuxt.

## Creating Dictionaries

Dictionaries use `defineDictionary`:

```typescript
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Dialex",
    greeting: (name: string) => `Hello, ${name}!`,
    cart: "{count, plural, one {# item} other {# items}}",
    nav: {
      about: "About Us",
      contact: "Contact",
    },
  },
  tr: {
    title: "Dialex'e Hoş Geldiniz",
    greeting: (name: string) => `Merhaba, ${name}!`,
    cart: "{count, plural, other {# öğe}}",
    nav: {
      about: "Hakkımızda",
      contact: "İletişim",
    },
  },
});
```

Key rules:

- Keys must match across all configured locales.
- Functions (dynamic parameters) receive arguments and return strings.
- ICU messages must preserve the same placeholder variables across all locales.

## Using Translations in Code

### React & Next.js

```tsx
import { useDictionary, useT } from "dialexjs/react";

export function Header() {
  const t = useT();
  const dict = useDictionary("home");

  return (
    <header>
      <h1>{dict.title}</h1>
      <p>{t("home.nav.about")}</p>
    </header>
  );
}
```

### Server Middleware (Express / Hono / Fastify)

```typescript
import { Hono } from "hono";
import { dialex } from "dialexjs/hono";
import dictionaries from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialex({ dictionaries }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
```

## CLI Commands

- `dialex generate` (`dialex gen`): Generates type definitions and registry bundle `dialex.generated.ts`. Pass `--json` for structured output.
- `dialex check` (`dialex lint`): Verifies dictionary parity and code references.
  - `--fix`: Automatically inserts missing keys with `[TODO]` placeholder prefix.
  - `--json`: Machine-readable output for tooling and AI agents.
  - `--github`: Outputs GitHub Actions annotations.
- `dialex export`: Exports strings to `json`, `csv`, or `xliff` (supports `--json`).
- `dialex import <file>`: Imports translated files back into dictionaries (supports `--json`).
- `dialex translate`: Fills missing keys using configured AI/translation providers (supports `--dry-run` and `--json`).

## Configuration (`dialex.config.ts`)

```typescript
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr", "de"],
  include: "**/*.content.ts",
});
```
