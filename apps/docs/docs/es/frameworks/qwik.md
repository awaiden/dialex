# Qwik

`dialexjs/qwik` enlaza los hooks de Qwik con tus diccionarios. Qwik serializa el estado de los componentes en el HTML y reanuda en el cliente, y los diccionarios contienen funciones que no se pueden serializar, por lo que permanecen en un módulo propio. Solo el locale activo, una cadena, viaja en la página.

## Instalación

Instala el runtime y la CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Configuración

Crea `dialex.config.ts` con tus locales (o ejecuta `dialex init`, que también añade los paquetes y un diccionario inicial):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Escribe un diccionario junto al código que lo usa. Cada locale tiene las mismas claves:

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "One dictionary, every language",
    greeting: (name: string) => `Hello, ${name}!`,
    items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}",
  },
  tr: {
    title: "Tek sözlük, her dil",
    greeting: (name: string) => `Merhaba, ${name}!`,
    items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}",
  },
});
```

Compila los diccionarios en `dialex.generated.ts` y las declaraciones de tipos. Ejecútalo de nuevo cuando cambie un diccionario, o deja `dx generate --watch` en marcha:

```bash
npx dx generate
```

Enlaza los hooks una sola vez, en un módulo, e impórtalos desde allí:

```ts
// src/i18n.ts
import { createDialexQwik } from "dialexjs/qwik";

import { dialex } from "./dialex.generated";

export const { useDialexProvider, useDialex, setLocale, useDictionary, useT } = createDialexQwik({
  ...dialex,
});
```

Llama a `useDialexProvider()` en el layout raíz:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";

import { useDialexProvider } from "../i18n";

export default component$(() => {
  useDialexProvider();
  return <Slot />;
});
```

## Usar diccionarios

`useDictionary(name)` devuelve un accessor del diccionario del locale actual, de modo que JSX lee `home().title`, y `useT()` devuelve una función `t("dictionary.key", values?)`. Los componentes que los leen se vuelven a renderizar cuando cambia el locale:

```tsx
import { component$ } from "@builder.io/qwik";

import { useDictionary, useT } from "../i18n";

export default component$(() => {
  const home = useDictionary("home");
  const t = useT();

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: 2 })}</p>
    </>
  );
});
```

Los valores se comprueban por tipo a partir del mensaje ICU, por lo que `count` arriba debe ser un número.

## Cambiar el locale

`useDialex()` devuelve el estado del proveedor, y `setLocale(state, locale)` lo cambia. `setLocale` es una función simple, así que un `onClick$` puede usarla sin capturar nada que no se pueda serializar:

```tsx
import { component$ } from "@builder.io/qwik";

import { locales } from "../dialex.generated";
import { setLocale, useDialex } from "../i18n";

export const LanguageSwitcher = component$(() => {
  const dialex = useDialex();

  return (
    <select value={dialex.locale} onChange$={(_, element) => setLocale(dialex, element.value)}>
      {locales.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
});
```

`setLocale` recuerda la elección en la cookie `locale` y mantiene `<html lang>` sincronizado.

## Resolver el locale en el servidor

Resuelve el locale a partir de la petición con [`dialexjs/web`](./web.md) en un `routeLoader$` y pásalo al proveedor. El primer renderizado en el servidor y el cliente reanudado coinciden entonces:

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { createDialexHandler } from "dialexjs/web";

import { dialex } from "../dialex.generated";
import { useDialexProvider } from "../i18n";

const resolveDialex = createDialexHandler({ ...dialex });

export const useLocale = routeLoader$(async ({ request }) => {
  const { locale } = await resolveDialex(request);
  return locale;
});

export default component$(() => {
  const locale = useLocale();
  useDialexProvider({ initialLocale: locale.value });
  return <Slot />;
});
```

## API

`createDialexQwik({ ...dialex })` acepta los `dictionaries`, `config` y `loaders` generados, además de `persist` (`"cookie"`, `"localStorage"` o `false`) y `storageKey`. Devuelve:

| Exportación                            | Descripción                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `useDialexProvider({ initialLocale })` | Proporciona el locale a los componentes inferiores. Llámalo una sola vez, en el layout raíz                    |
| `useDialex()`                          | Devuelve el estado del proveedor, `{ locale }`. Lee `locale`; cámbialo con `setLocale`                         |
| `setLocale(state, locale)`             | Cambia el locale, lo recuerda y mantiene `<html lang>` sincronizado                                            |
| `getPersistedLocale()`                 | El locale recordado en este navegador, cuando la app lo admite. `undefined` en el servidor                     |
| `useDictionary(name)`                  | Un accessor del diccionario del locale actual, siguiendo la cadena de fallback. Llámalo en JSX: `home().title` |
| `useT()`                               | Una función `t("dictionary.key", values?)` ligada al locale actual                                             |

## Buenas prácticas

- Crea los hooks con `createDialexQwik` en un módulo e impórtalos desde él. No llames a `createDialexQwik` dentro de un componente, porque los diccionarios no deben formar parte del estado del componente.
- Lee `useDialex().locale` en el componente que lo necesita, no en el layout, para que solo ese componente se renderice de nuevo al cambiar.
- Pasa `initialLocale` desde un `routeLoader$` en páginas renderizadas en el servidor, para que un visitante con un locale recordado no vea un destello del idioma predeterminado.
- Llama al accessor en JSX (`home().title`) en lugar de copiar `home()` a una variable una sola vez. Qwik no actualiza las lecturas simples de propiedades de un objeto copiado cuando cambia el locale.

## Solución de problemas

- **Los hooks no encuentran el proveedor**: el componente se renderiza fuera de él. Llama a `useDialexProvider()` en un layout por encima del componente.
- **Qwik informa de un valor que no se puede serializar**: un diccionario o el resultado de `useT()` fue capturado por una closure `$`, por ejemplo un `onClick$`. Lee el texto que necesitas mientras el componente se renderiza, y pasa solo valores simples a la closure.
- **Las claves no se autocompletan**: ejecuta `dx generate` e incluye `dialex-env.d.ts` en tu `tsconfig`. La CLI añade las declaraciones de `dialexjs/qwik` cuando `@builder.io/qwik` está en `package.json`.
