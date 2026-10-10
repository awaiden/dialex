# Erste Schritte

Dialex ist ein i18n-Framework rund um Wörterbücher, die in TypeScript definiert werden. Ein Kompilierschritt macht daraus eine statische Registry und Typdeklarationen, sodass Zugriffe zur Laufzeit gewöhnliche Objektzugriffe sind.

::: warning Vor 1.0
Dialex liegt unter 1.0, daher kann sich die API zwischen Minor-Versionen noch ändern. Breaking Changes stehen im [Changelog](./changelog.md) und erscheinen in einem Minor-Release; Patch-Releases bleiben kompatibel. Fixiere die Minor-Version (`~0.5.0`), wenn du eine stabile Oberfläche brauchst.
:::

## Pakete

| Paket           | Zweck                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- |
| `dialexjs`      | Kern-Laufzeit und Framework-Adapter                                                          |
| `@dialexjs/cli` | Die Befehle `dialex` / `dx` für Projektgerüst, Codegenerierung und Vollständigkeitsprüfungen |

## Installation

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

## Projektgerüst erstellen

```bash
dialex init
```

Oder ohne Rückfragen:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

Das erzeugt `dialex.config.ts` und ein Start-Wörterbuch `src/home.content.ts` fügt `dialexjs` und `@dialexjs/cli` zu deiner `package.json` hinzu und ergänzt ein Skript `dx:generate` (`dx generate`). Siehe [`dialex init`](../cli/init.md).

## Ein Wörterbuch definieren

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

## Kompilieren

```bash
dialex generate
```

Erzeugt `src/dialex.generated.ts` (die Wörterbuch-Registry) und `src/dialex-env.d.ts` (Typerweiterung). Wähle danach dein [Framework](../frameworks/README.md).
