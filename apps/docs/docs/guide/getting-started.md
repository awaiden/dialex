# Getting Started

Dialex is an i18n framework built around dictionaries defined in TypeScript. A compile step turns them into a static registry and type declarations, so runtime lookups are plain object access.

## Packages

| Package       | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `dialex`      | Core runtime, framework adapters, Vite plugin                        |
| `@dialex/cli` | `dialex` / `dx` binaries for scaffolding, codegen, and parity checks |

## Install

```bash
# bun
bun add dialex
bun add -d @dialex/cli

# npm
npm install dialex
npm install -D @dialex/cli

# pnpm
pnpm add dialex
pnpm add -D @dialex/cli
```

## Scaffold

```bash
dialex init
```

Or headless:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

This creates `dialex.config.ts`, a starter dictionary `src/home.content.ts`, and adds an `i18n:generate` script (`dialex generate`) to your `package.json`. See [`dialex init`](../cli/init.md).

## Define a dictionary

```ts
// src/home.content.ts
import { defineDictionary } from "dialex";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Dialex!",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex'e Hoş Geldiniz!",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
```

## Compile

```bash
dialex generate
```

Emits `src/i18n.generated.ts` (the dictionary registry) and `src/dialex-env.d.ts` (type augmentation). Then pick your [framework](../frameworks/README.md).
