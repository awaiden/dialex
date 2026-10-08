# 🌍 Dialex

> **Next-Generation, Type-Safe Internationalization (i18n) Framework**  
> Zero runtime overhead, seamless full-stack DX, and compiler-driven type safety.

[![npm version](https://img.shields.io/npm/v/dialex.svg)](https://www.npmjs.com/package/dialex)
[![CI Status](https://github.com/awaiden/dialex/actions/workflows/ci.yml/badge.svg)](https://github.com/awaiden/dialex/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## 🚀 Why Dialex?

Modern web development demands internationalization that doesn't compromise on runtime performance, developer experience, or type safety. Traditional i18n libraries either scan filesystems on every request, incur heavy bundle bloat, or lack compile-time guarantees.

**Dialex** solves this with an Ahead-of-Time compiler model:

- ⚡ **Zero Runtime Scanning**: Server and edge runtimes consume pre-compiled static dictionaries with zero disk I/O.
- 🎯 **Total Type Safety**: Full autocomplete for dictionary names, keys, and locale signatures powered by automatic TypeScript interface augmentation.
- 🛠️ **Universal Architecture**: One unified API across **Next.js**, **React 19**, **Hono**, **Fastify**, **Express**, **Koa**, **NestJS**, **Elysia**, **SvelteKit**, **Astro**, **Vue / Nuxt**, **Angular**, **h3 / Nitro**, and any **Fetch API** runtime.
- 🔢 **Plurals & Formatting**: Typed `plural`, `number`, `date`, `relativeTime`, and `list` helpers built on `Intl`.
- 🪜 **Locale Fallbacks**: `tr-TR` → `tr` automatically, plus explicit chains via `fallbacks` in the config.
- 🧭 **Routing**: Locale-prefixed URL helpers, hreflang and sitemap generation, a Next.js middleware and `I18nLink`.
- 🚚 **Lazy Loading**: Per-dictionary code splitting for Vite apps with `lazy: true`.
- 📝 **ICU Messages**: `{count, plural, one {# item} other {# items}}` strings, formatted by `t()` with CLDR plural rules for every language.
- 🔑 **Key Paths**: A typed `t("home.nav.about")` alongside `getDictionary`.
- 🧰 **Developer-First CLI**: [`@dialex/cli`](https://www.npmjs.com/package/@dialex/cli) scaffolds projects with AST precision (**Magicast**), watches dictionary files with instantaneous codegen, and audits translation parity in CI.

---

## 📦 Packages

| Package                         | Version                                                                                           | Description                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`dialex`](./packages/core)     | [![npm](https://img.shields.io/npm/v/dialex.svg)](https://www.npmjs.com/package/dialex)           | Core runtime library, framework adapters, and Vite plugin                      |
| [`@dialex/cli`](./packages/cli) | [![npm](https://img.shields.io/npm/v/@dialex/cli.svg)](https://www.npmjs.com/package/@dialex/cli) | Standalone CLI (`dialex`, `dx`) for scaffolding, codegen, and CI parity checks |

---

## 🏁 Quick Start

### 1. Installation

```bash
# Using Bun
bun add dialex
bun add -d @dialex/cli

# Using npm
npm install dialex
npm install -D @dialex/cli

# Using pnpm
pnpm add dialex
pnpm add -D @dialex/cli
```

### 2. Scaffold with CLI

Run the interactive initializer to automatically detect your framework and configure your project:

```bash
bun x dialex init
```

Or run headlessly in automated setups:

```bash
bun x dialex init --framework fastify --default-locale en --locales en,tr -y
```

This generates `dialex.config.ts`, a starter dictionary `src/home.content.ts`, and adds the `"i18n:generate": "dialex generate"` script to your `package.json`.

---

## 📖 Dictionaries & Type Safety

Dictionaries are defined using `defineDictionary`:

```typescript
// src/home.content.ts
import { defineDictionary } from "dialex";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Dialex!",
    description: "Type-safe internationalization.",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex'e Hoş Geldiniz!",
    description: "Tip güvenli uluslararasılaştırma.",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
```

Whenever you run `dialex generate` (or during dev watch mode), Dialex compiles:

1. `src/i18n.generated.ts`: A statically imported registry of dictionaries.
2. `src/dialex-env.d.ts`: Ambient module declarations that register your dictionary schema with the TypeScript compiler:

```typescript
const dict = req.getDictionary("home");
// ✅ Autocompletion for:
// - dict.title
// - dict.description
// - dict.greeting("Alice")
```

---

## 🌐 Framework Integrations

### Next.js (App Router Path Routing)

Wrap your `next.config.mjs`:

```typescript
import { withI18n } from "dialex/next";

export default withI18n({
  // Your Next.js config
});
```

Add the middleware that keeps every page under a locale prefix:

```typescript
// middleware.ts
import { createI18nMiddleware } from "dialex/next/middleware";

export default createI18nMiddleware({ locales: ["en", "tr"], defaultLocale: "en" });

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

Use `I18nLink` from `dialex/next/link` for links that keep the current locale.

Server Components:

```typescript
// src/app/[locale]/page.tsx
import { getDictionary } from "dialex/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary("home", locale as any);

  return (
    <main>
      <h1>{dict.title}</h1>
      <p>{dict.greeting("User")}</p>
    </main>
  );
}
```

---

### Fastify

```typescript
import Fastify from "fastify";
import { i18nPlugin } from "dialex/fastify";
import dictionaries from "./src/i18n.generated.js";

const app = Fastify();

await app.register(i18nPlugin, {
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

---

### Koa

```typescript
import Koa from "koa";
import Router from "@koa/router";
import { i18n } from "dialex/koa";
import dictionaries from "./src/i18n.generated.js";

const app = new Koa();
const router = new Router();

app.use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

router.get("/:locale", (ctx) => {
  const dict = ctx.getDictionary("home");
  ctx.body = { title: dict.title, locale: ctx.locale };
});

app.use(router.routes());
app.listen(3000);
```

---

### Hono

```typescript
import { Hono } from "hono";
import { i18n } from "dialex/hono";
import dictionaries from "./src/i18n.generated.js";

const app = new Hono();
app.use("*", i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

---

### Express

```typescript
import express from "express";
import { i18n } from "dialex/express";
import dictionaries from "./src/i18n.generated.js";

const app = express();
app.use(i18n({ defaultLocale: "en", locales: ["en", "tr"], dictionaries }));

app.get("/:locale", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title, locale: req.locale });
});

app.listen(3000);
```

---

### NestJS

```typescript
import { Module, Controller, Get } from "@nestjs/common";
import { I18nModule, I18nLocale, I18nDictionary } from "dialex/nestjs";
import dictionaries from "./src/i18n.generated.js";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@I18nLocale() locale: string, @I18nDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}

@Module({
  imports: [I18nModule.forRoot({ dictionaries, defaultLocale: "en", locales: ["en", "tr"] })],
  controllers: [AppController],
})
export class AppModule {}
```

---

### Elysia, SvelteKit, Astro, Vue / Nuxt, Angular

Adapters for these ship as `dialex/elysia`, `dialex/sveltekit`, `dialex/astro`, `dialex/vue`, `dialex/nuxt` and `dialex/angular`. See the docs site (`apps/docs`) for setup.

---

### React 19 / Vite

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { i18nPlugin } from "dialex/vite";

export default defineConfig({
  plugins: [react(), i18nPlugin()],
});
```

```tsx
// src/App.tsx
import { useI18n, useDictionary } from "dialex/react";

export function App() {
  const { locale, setLocale } = useI18n();
  const dict = useDictionary("home");

  return (
    <div>
      <h1>{dict.title}</h1>
      <button onClick={() => setLocale(locale === "en" ? "tr" : "en")}>
        Switch Locale ({locale})
      </button>
    </div>
  );
}
```

---

## 🛠️ CLI Reference

### `dialex init`

Set up Dialex with interactive prompts or headless CLI flags.

```bash
bun x dialex init
```

### `dialex generate` (`gen`)

Statically compiles dictionary files to `src/i18n.generated.ts` and `src/dialex-env.d.ts`.

```bash
bun x dialex generate
bun x dialex generate --watch
```

### `dialex check` (`lint`)

Audits dictionaries and how your code uses them. Exits with code `1` on errors.

```bash
bun x dialex check
bun x dialex check --fix      # insert missing keys marked [TODO]
bun x dialex check --github   # GitHub Actions annotations
bun x dialex check --json     # machine-readable output
```

It reports missing keys (including nested ones), calls to dictionaries or `t("dict.path")` keys that do not exist, and warns about possibly unused keys and leftover `[TODO]` placeholders.

### `dialex export` / `dialex import`

Round-trip strings with translators as JSON, CSV or XLIFF 1.2, without editing TypeScript.

```bash
bun x dialex export -f xliff -o translations
bun x dialex import translations/tr.xlf
```

### `dialex translate`

Fills missing (or `[TODO]`) strings through a provider configured in `dialex.config.ts`. Claude, OpenAI (ChatGPT), Gemini and DeepL providers are built in (`@dialex/cli/translate`). `--dry-run` lists what would be translated without calling anything.

```bash
bun x dialex translate --dry-run
bun x dialex translate -l tr de
```

Full documentation lives in [`apps/docs`](./apps/docs) (VuePress): run `bun run docs:dev`. The site is available in English, Turkish, Spanish, German and Simplified Chinese; the translations were written by an AI assistant and are awaiting review by native speakers (see [`apps/docs/TRANSLATING.md`](./apps/docs/TRANSLATING.md)).

---

## 📁 Examples Repository

Check out runnable projects in [`examples/`](./examples):

- [`examples/next`](./examples/next): Next.js 15 App Router path routing (`app/[locale]`) with SSG
- [`examples/fastify`](./examples/fastify): Fastify 5 REST API with decorator support
- [`examples/koa`](./examples/koa): Koa 2 REST API with cascading middleware
- [`examples/hono`](./examples/hono): Lightweight Hono server
- [`examples/express`](./examples/express): Express 5 server
- [`examples/nestjs`](./examples/nestjs): Enterprise NestJS application with interceptors & decorators
- [`examples/react`](./examples/react): Vite + React 19 Client SPA

---

## 🧩 VS Code Extension

`packages/vscode` adds diagnostics, hover, go to definition, completion and quick fixes for translations. It reads your config and dictionaries without running them. See `apps/docs` (VS Code Extension) for install and usage.

---

## 🧪 Testing & Validation

Test your own code with `dialex/testing` (`createTestI18n`, `mockRequest`, `TestI18nProvider`); see the docs.

For this repository:

Run the complete test suite and build verification:

```bash
bun run ready # Runs vp check, vp test, and vp build across all workspaces
```

---

## 📄 License

MIT License © 2026 [awaiden](https://github.com/awaiden)
