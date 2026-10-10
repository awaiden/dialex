# Primeros pasos

Dialex es un framework de i18n construido en torno a diccionarios definidos en TypeScript. Un paso de compilación los convierte en un registro estático y en declaraciones de tipos, de modo que las búsquedas en tiempo de ejecución son simples accesos a objetos.

::: warning Antes de 1.0
Dialex está por debajo de 1.0, así que la API aún puede cambiar entre versiones menores. Los cambios incompatibles se indican en el [registro de cambios](./changelog.md) y salen en una versión menor; las versiones de parche siguen siendo compatibles. Fija la versión menor (`~0.5.0`) si necesitas una superficie estable.
:::

## Paquetes

| Paquete         | Propósito                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------- |
| `dialexjs`      | Runtime principal y adaptadores de frameworks                                                 |
| `@dialexjs/cli` | Binarios `dialex` / `dx` para generar el proyecto base, generar código y comprobar la paridad |

## Instalación

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

## Generar el proyecto base

```bash
dialex init
```

O de forma no interactiva:

```bash
dialex init --framework fastify --default-locale en --locales en,tr -y
```

Esto crea `dialex.config.ts`, un diccionario inicial `src/home.content.ts` añade `dialexjs` y `@dialexjs/cli` a tu `package.json` y un script `dx:generate` (`dx generate`). Consulta [`dialex init`](../cli/init.md).

## Define un diccionario

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

## Compila

```bash
dialex generate
```

Genera `src/dialex.generated.ts` (el registro de diccionarios) y `src/dialex-env.d.ts` (ampliación de tipos). Después elige tu [framework](../frameworks/README.md).
