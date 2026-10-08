# Erste Schritte

Dialex ist ein i18n-Framework rund um Wörterbücher, die in TypeScript definiert werden. Ein Kompilierschritt macht daraus eine statische Registry und Typdeklarationen, sodass Zugriffe zur Laufzeit gewöhnliche Objektzugriffe sind.

## Pakete

| Paket         | Zweck                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------- |
| `dialex`      | Kern-Laufzeit, Framework-Adapter, Vite-Plugin                                                |
| `@dialex/cli` | Die Befehle `dialex` / `dx` für Projektgerüst, Codegenerierung und Vollständigkeitsprüfungen |

## Installation

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

## Projektgerüst erstellen

```bash
dialex init
```

Oder ohne Rückfragen:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

Das erzeugt `dialex.config.ts` und ein Start-Wörterbuch `src/home.content.ts` und fügt deiner `package.json` ein Skript `i18n:generate` (`dialex generate`) hinzu. Siehe [`dialex init`](../cli/init.md).

## Ein Wörterbuch definieren

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

## Kompilieren

```bash
dialex generate
```

Erzeugt `src/i18n.generated.ts` (die Wörterbuch-Registry) und `src/dialex-env.d.ts` (Typerweiterung). Wähle danach dein [Framework](../frameworks/README.md).
