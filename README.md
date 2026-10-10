<p align="center">
  <img src="assets/logo.svg" alt="Dialex" width="96" height="96" />
</p>

# 🌍 Dialex

> **Next-Generation, Type-Safe Internationalization (i18n) Framework**  
> Zero runtime overhead, seamless full-stack DX, and compiler-driven type safety.

[![npm version](https://img.shields.io/npm/v/dialexjs.svg)](https://www.npmjs.com/package/dialexjs)
[![CI Status](https://github.com/awaiden/dialex/actions/workflows/ci.yml/badge.svg)](https://github.com/awaiden/dialex/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **Status: pre-1.0.** The API can still change between minor versions. Breaking changes are listed in the [changelog](./CHANGELOG.md) and ship in a minor release; patch releases stay compatible. Pin the minor version (`~0.5.0`) if you need a stable surface.

---

## 🚀 Why Dialex?

Modern web development demands internationalization that doesn't compromise on runtime performance, developer experience, or type safety. Traditional i18n libraries either scan filesystems on every request, incur heavy bundle bloat, or lack compile-time guarantees.

**Dialex** solves this with an Ahead-of-Time compiler model:

- ⚡ **Zero Runtime Scanning**: Server and edge runtimes consume pre-compiled static dictionaries with zero disk I/O.
- 🎯 **Total Type Safety**: Full autocomplete for dictionary names, keys, and locale signatures powered by automatic TypeScript interface augmentation.
- 🛠️ **Universal Architecture**: One unified API across **Next.js**, **React 19**, **Hono**, **Fastify**, **Express**, **Koa**, **NestJS**, **Elysia**, **SvelteKit**, **Astro**, **Vue / Nuxt**, **Angular**, **h3 / Nitro**, and any **Fetch API** runtime.
- 🔢 **Plurals & Formatting**: Typed `plural`, `number`, `date`, `relativeTime`, and `list` helpers built on `Intl`.
- 🪜 **Locale Fallbacks**: `tr-TR` → `tr` automatically, plus explicit chains via `fallbacks` in the config.
- 🧭 **Routing**: Locale-prefixed URL helpers, hreflang and sitemap generation, a Next.js middleware and `DialexLink`.
- 🚚 **Lazy Loading**: Per-dictionary code splitting for Vite apps with `lazy: true`.
- 📝 **ICU Messages**: `{count, plural, one {# item} other {# items}}` strings, formatted by `t()` with CLDR plural rules for every language.
- 🔑 **Key Paths**: A typed `t("home.nav.about")` alongside `getDictionary`.
- 🧰 **Developer-First CLI**: [`@dialexjs/cli`](https://www.npmjs.com/package/@dialexjs/cli) scaffolds projects with AST precision (**Magicast**), watches dictionary files with instantaneous codegen, and audits translation parity in CI.

---

## 📦 Packages

| Package                           | Version                                                                                               | Description                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`dialexjs`](./packages/core)     | [![npm](https://img.shields.io/npm/v/dialexjs.svg)](https://www.npmjs.com/package/dialexjs)           | Core runtime library, framework adapters, and Vite plugin                      |
| [`@dialexjs/cli`](./packages/cli) | [![npm](https://img.shields.io/npm/v/@dialexjs/cli.svg)](https://www.npmjs.com/package/@dialexjs/cli) | Standalone CLI (`dialex`, `dx`) for scaffolding, codegen, and CI parity checks |
| [`@dialexjs/mcp`](./packages/mcp) | [![npm](https://img.shields.io/npm/v/@dialexjs/mcp.svg)](https://www.npmjs.com/package/@dialexjs/mcp) | Model Context Protocol (MCP) server for AI assistants and agent skills         |

---

## 🏁 Quick Start

### 1. Installation

```bash
# Using Bun
bun add dialexjs
bun add -d @dialexjs/cli

# Using npm
npm install dialexjs
npm install -D @dialexjs/cli

# Using pnpm
pnpm add dialexjs
pnpm add -D @dialexjs/cli
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

This generates `dialex.config.ts`, a starter dictionary `src/home.content.ts`, adds `dialexjs` and `@dialexjs/cli` to your `package.json`, and adds the `"dx:generate": "dx generate"` script (then run your package manager's install).

---

## 📖 Dictionaries & Type Safety

Dictionaries are defined using `defineDictionary`:

```typescript
// src/home.content.ts
import { defineDictionary } from "dialexjs";

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

1. `src/dialex.generated.ts`: A statically imported registry of dictionaries.
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

Generate the dictionaries with `dx generate`, then bind them once for server code:

```typescript
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";

import { dialex } from "./dialex.generated";

export const { getDictionary, getT } = createDialexServer(dialex);
```

Add the middleware that keeps every page under a locale prefix:

```typescript
// proxy.ts (named middleware.ts before Next.js 16)
import { createDialexMiddleware } from "dialexjs/next/middleware";

export default createDialexMiddleware({ locales: ["en", "tr"], defaultLocale: "en" });

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

Use `DialexLink` from `dialexjs/next/link` for links that keep the current locale.

Server Components:

```typescript
// src/app/[locale]/page.tsx
import { getDictionary } from "../../dialex";

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
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import { dialex } from "./src/dialex.generated.js";

const app = Fastify();

await app.register(dialexPlugin, { ...dialex });

app.get("/:locale", async (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title, locale: req.locale };
});

await app.listen({ port: 3000 });
```

---

### Koa

```typescript
import Router from "@koa/router";
import { dialexKoa } from "dialexjs/koa";
import Koa from "koa";

import { dialex } from "./src/dialex.generated.js";

const app = new Koa();
const router = new Router();

app.use(dialexKoa({ ...dialex }));

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
import { dialexHono } from "dialexjs/hono";
import { Hono } from "hono";

import { dialex } from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialexHono({ ...dialex }));

app.get("/:locale", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title, locale: c.var.locale });
});

export default app;
```

---

### Express

```typescript
import { dialexExpress } from "dialexjs/express";
import express from "express";

import { dialex } from "./src/dialex.generated.js";

const app = express();
app.use(dialexExpress({ ...dialex }));

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
import { DialexModule, DialexLocale, DialexDictionary } from "dialexjs/nestjs";

import { dialex } from "./src/dialex.generated.js";

@Controller()
export class AppController {
  @Get(":locale")
  getHome(@DialexLocale() locale: string, @DialexDictionary("home") dict: any) {
    return { title: dict.title, locale };
  }
}

@Module({
  imports: [DialexModule.forRoot({ ...dialex })],
  controllers: [AppController],
})
export class AppModule {}
```

---

### Elysia, SvelteKit, Astro, Vue / Nuxt, Angular

Adapters for these ship as `dialexjs/elysia`, `dialexjs/sveltekit`, `dialexjs/astro`, `dialexjs/vue`, `dialexjs/nuxt` and `dialexjs/angular`. See the docs site (`apps/docs`) for setup.

---

### React 19 / Vite

Run `dx generate` (or keep `dx generate --watch` running, or use the VS Code extension), then give the provider the generated dictionaries. There is no bundler plugin:

```tsx
// src/main.tsx
import { DialexProvider } from "dialexjs/react";

import { dialex } from "./dialex.generated";

createRoot(document.getElementById("root")!).render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
);
```

```tsx
// src/App.tsx
import { useDialex, useDictionary } from "dialexjs/react";

export function App() {
  const { locale, setLocale } = useDialex();
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

Statically compiles dictionary files to `src/dialex.generated.ts` and `src/dialex-env.d.ts`.

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

Fills missing (or `[TODO]`) strings through a provider configured in `dialex.config.ts`. Claude, OpenAI (ChatGPT), Gemini and DeepL providers are built in (`@dialexjs/cli/translate`). `--dry-run` lists what would be translated without calling anything.

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

Test your own code with `dialexjs/testing` (`createTestDialex`, `mockRequest`, `TestDialexProvider`); see the docs.

For this repository:

Run the complete test suite and build verification:

```bash
bun run ready # Runs vp check, vp test, and vp build across all workspaces
```

---

## 📝 Changelog

See what changed in each release in the [changelog](https://github.com/awaiden/dialex/blob/main/CHANGELOG.md), or on [GitHub Releases](https://github.com/awaiden/dialex/releases).

## 🤖 How it is built

Dialex is developed with AI assistance. The maintainer sets the direction and makes the design decisions, and the code is written together with [Claude Code](https://claude.com/claude-code). Commits that were written this way carry a `Co-Authored-By` trailer.

Nothing is released on trust: every change runs through formatting, linting, type checks, the unit and type tests, the example builds, a packed-tarball smoke test and the documentation checks (see [CONTRIBUTING.md](./CONTRIBUTING.md)). Bug reports about generated code are welcome and handled like any other.

## 📄 License

MIT License © 2026 [awaiden](https://github.com/awaiden)
