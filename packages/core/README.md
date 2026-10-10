<p align="center">
  <img src="https://raw.githubusercontent.com/awaiden/dialex/main/assets/logo.png" alt="Dialex" width="96" height="96" />
</p>

# dialex

> Type-safe, zero-boilerplate internationalization (i18n) framework for React, Next.js, Hono, Express, Fastify, Koa, NestJS, Elysia, SvelteKit, Astro, Vue / Nuxt, and Vite.

[![npm version](https://img.shields.io/npm/v/dialexjs.svg)](https://www.npmjs.com/package/dialexjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Status: pre-1.0.** The API can still change between minor versions. Breaking changes are listed in the [changelog](https://github.com/awaiden/dialex/blob/main/packages/core/CHANGELOG.md) and ship in a minor release; patch releases stay compatible. Pin the minor version (`~0.5.0`) if you need a stable surface.

---

## ✨ Features

- 🏎️ **Zero Runtime Overhead in Production**: Standalone Ahead-of-Time (AOT) compilation eliminates filesystem reading on server runtimes.
- 🔒 **End-to-End Type Safety**: Full autocomplete for dictionary keys and strict locale typing via TypeScript interface augmentation.
- 🌐 **Full-Stack Ecosystem**: First-class adapters for **Next.js** (App Router & Pages Router), **Fastify**, **Koa**, **Hono**, **Express**, **NestJS**, **Elysia**, **SvelteKit**, **Astro**, **Vue / Nuxt**, and **React / Vite**.
- 🧩 **No Bundler Plugin**: `dx generate` compiles your dictionaries and config into `dialex.generated.ts`; `dx generate --watch` or the VS Code extension keeps it current, and HMR works through ordinary imports.
- 🎯 **Interpolation Functions**: Dictionaries support typed functions `(name: string) => string` with full type inference.
- 🛠️ **CLI Tooling**: Companion CLI [`@dialexjs/cli`](https://www.npmjs.com/package/@dialexjs/cli) with `dialex init`, `dialex generate`, and `dialex check`.

---

## 📦 Installation

```bash
# npm
npm install dialexjs
npm install -D @dialexjs/cli

# bun
bun add dialexjs
bun add -d @dialexjs/cli

# pnpm
pnpm add dialexjs
pnpm add -D @dialexjs/cli
```

---

## 🚀 Quick Start

### 1. Define Dictionaries (`src/home.content.ts`)

```typescript
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Dialex",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex'e Hoş Geldiniz",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
```

### 2. Standalone Server Usage (Hono / Express / Fastify / Koa / NestJS)

Compile dictionaries once with `dialex generate`:

```bash
bun x dialex generate
```

#### Hono

```typescript
import { dialex } from "dialexjs/hono";
import { Hono } from "hono";

import dictionaries from "./src/dialex.generated.js";

const app = new Hono();
app.use("*", dialex({ dictionaries }));

app.get("/", (c) => {
  const dict = c.var.getDictionary("home");
  return c.json({ title: dict.title });
});
```

#### Fastify

```typescript
import { dialexPlugin } from "dialexjs/fastify";
import Fastify from "fastify";

import dictionaries from "./src/dialex.generated.js";

const app = Fastify();
await app.register(dialexPlugin, { dictionaries });

app.get("/", (req) => {
  const dict = req.getDictionary("home");
  return { title: dict.title };
});
```

#### Express

```typescript
import { dialex } from "dialexjs/express";
import express from "express";

import dictionaries from "./src/dialex.generated.js";

const app = express();
app.use(dialex({ dictionaries }));

app.get("/", (req, res) => {
  const dict = req.getDictionary("home");
  res.json({ title: dict.title });
});
```

#### Next.js (App Router Path Routing)

```typescript
// src/dialex.ts
import { createDialexServer } from "dialexjs/server";

import { dialex } from "./dialex.generated";
export const { getDictionary, getT } = createDialexServer(dialex);
```

```typescript
// src/app/[locale]/page.tsx
import { getDictionary } from "../../dialex";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary("home", locale as any);
  return <h1>{dict.title}</h1>;
}
```

---

## 🧩 Entry Points

| Import                                                                                              | Purpose                                                                                       |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `dialexjs`                                                                                          | `defineDictionary`, `defineConfig`, `plural`/`number`/`date`/`relativeTime`/`list`, `createT` |
| `dialexjs/react`, `dialexjs/vue`, `dialexjs/nuxt`, `dialexjs/angular`                               | Providers, `useDictionary`, `useT`, Nuxt module                                               |
| `dialexjs/next/middleware`, `dialexjs/next/link`, `dialexjs/server`                                 | Next.js middleware and link, server helpers                                                   |
| `dialexjs/express`, `fastify`, `koa`, `hono`, `elysia`, `nestjs`, `sveltekit`, `astro`, `h3`, `web` | Server and runtime adapters                                                                   |
| `dialexjs/routing`                                                                                  | `localizePath`, `stripLocale`, hreflang and sitemap helpers                                   |
| `dialexjs/testing`, `dialexjs/testing/react`, `dialexjs/testing/vue`                                | Test helpers                                                                                  |

See the documentation site (`apps/docs`) for guides and the API reference.

---

## 📝 Changelog

See what changed in each release in the [changelog](https://github.com/awaiden/dialex/blob/main/CHANGELOG.md), or on [GitHub Releases](https://github.com/awaiden/dialex/releases).

## 📄 License

MIT © [awaiden](https://github.com/awaiden)
