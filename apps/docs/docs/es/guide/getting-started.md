# Primeros pasos

Dialex es un framework de i18n construido en torno a diccionarios definidos en TypeScript. Un paso de compilación los convierte en un registro estático y en declaraciones de tipos, de modo que las búsquedas en tiempo de ejecución son simples accesos a objetos.

## Paquetes

| Paquete       | Propósito                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------- |
| `dialex`      | Runtime principal, adaptadores de frameworks, plugin de Vite                                  |
| `@dialex/cli` | Binarios `dialex` / `dx` para generar el proyecto base, generar código y comprobar la paridad |

## Instalación

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

## Generar el proyecto base

```bash
dialex init
```

O de forma no interactiva:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

Esto crea `dialex.config.ts`, un diccionario inicial `src/home.content.ts` y añade un script `i18n:generate` (`dialex generate`) a tu `package.json`. Consulta [`dialex init`](../cli/init.md).

## Define un diccionario

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

## Compila

```bash
dialex generate
```

Genera `src/i18n.generated.ts` (el registro de diccionarios) y `src/dialex-env.d.ts` (ampliación de tipos). Después elige tu [framework](../frameworks/README.md).
