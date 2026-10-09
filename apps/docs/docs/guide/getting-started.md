# Getting Started

Dialex is an i18n framework built around dictionaries defined in TypeScript. A compile step turns them into a static registry and type declarations, so runtime lookups are plain object access.

## Packages

| Package         | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `dialexjs`      | Core runtime and framework adapters                                  |
| `@dialexjs/cli` | `dialex` / `dx` binaries for scaffolding, codegen, and parity checks |

## Install

```bash
# bun
bun add dialexjs
bun add -d @dialexjs/cli

# npm
npm install dialexjs
npm install -D @dialexjs/cli

# pnpm
pnpm add dialexjs
pnpm add -D @dialexjs/cli
```

## Scaffold

```bash
dialex init
```

Or headless:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

This creates `dialex.config.ts`, a starter dictionary `src/home.content.ts`, adds `dialexjs` and `@dialexjs/cli` to your `package.json`, and adds a `dx:generate` script (`dx generate`). See [`dialex init`](../cli/init.md).

## Define a dictionary

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

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

Emits `src/dialex.generated.ts` (the dictionary registry) and `src/dialex-env.d.ts` (type augmentation). Then pick your [framework](../frameworks/README.md).
