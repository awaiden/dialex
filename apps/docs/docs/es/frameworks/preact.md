# Preact

`dialexjs/preact` ofrece un proveedor de contexto y hooks para Preact 10 y posteriores. No necesita `preact/compat`, así que funciona en apps que usan la API simple de Preact.

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

Envuelve la aplicación en `DialexProvider` y expande en él la exportación `dialex` generada:

```tsx
// src/index.tsx
import { DialexProvider } from "dialexjs/preact";
import { render } from "preact";

import { App } from "./app";
import { dialex } from "./dialex.generated";

render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
  document.getElementById("app")!,
);
```

## Usar diccionarios

`useDictionary(name)` devuelve el diccionario del locale actual, y `useT(...names)` devuelve una función `t("dictionary.key", values?)`:

```tsx
import { useDictionary, useT } from "dialexjs/preact";
import { useState } from "preact/hooks";

export function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.greeting("Alex")}</p>
      <p>{t("home.items", { count })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

Los valores se comprueban por tipo a partir del mensaje ICU, por lo que `count` arriba debe ser un número.

## Cambiar el locale

`useDialex()` devuelve el `locale` activo y `setLocale`. El proveedor recuerda la elección en la cookie `locale` y mantiene `<html lang>` sincronizado:

```tsx
import { useDialex } from "dialexjs/preact";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale} onChange={(event) => setLocale(event.currentTarget.value)}>
      {locales.map((code) => (
        <option value={code}>{code.toUpperCase()}</option>
      ))}
    </select>
  );
}
```

## Renderizado en el servidor

Con `preact-render-to-string` o un framework como Fresh, pasa el locale que resolvió el servidor como `initialLocale`, para que el marcado y el primer renderizado del cliente coincidan. Usa [`dialexjs/web`](./web.md) para resolverlo a partir de la petición:

```tsx
import { DialexProvider } from "dialexjs/preact";
import { createDialexHandler } from "dialexjs/web";
import { renderToString } from "preact-render-to-string";

import { App } from "./app";
import { dialex } from "./dialex.generated";

const resolveDialex = createDialexHandler({ ...dialex });

export async function render(request: Request) {
  const { locale } = await resolveDialex(request);
  return renderToString(
    <DialexProvider {...dialex} initialLocale={locale}>
      <App />
    </DialexProvider>,
  );
}
```

## API

| Exportación                    | Descripción                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Proporciona el locale y los diccionarios al árbol. Props: los `dictionaries`, `config` y `loaders` generados, más `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` o `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | Devuelve `{ locale, setLocale, store }`. Lanza un error fuera de un `DialexProvider`                                                                                                                                                           |
| `useDictionary(name)`          | El diccionario del locale actual, siguiendo la cadena de fallback. El componente se vuelve a renderizar al cambiar el locale y cuando carga un diccionario diferido                                                                            |
| `useT(...names)`               | Una función `t("dictionary.key", values?)` ligada al locale actual. Nombra los diccionarios para cargarlos con carga diferida                                                                                                                  |
| `useDialexConfig()`            | La `config` generada (`locales`, `defaultLocale`, `prefixDefault`)                                                                                                                                                                             |

## Carga diferida

Con `lazy: true` o `"locale"` en `dialex.config.ts`, `useDictionary` devuelve un objeto vacío hasta que el diccionario se ha cargado, y el componente se vuelve a renderizar cuando llega. Precarga lo que necesita la siguiente vista con `preloadDictionaries`:

```ts
import { preloadDictionaries } from "dialexjs/preact";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Buenas prácticas

- Renderiza `DialexProvider` una sola vez, en la raíz. Todos los componentes por debajo comparten el mismo locale y los mismos diccionarios cargados.
- Pasa `initialLocale` cuando renderices en el servidor. Sin él, el servidor renderiza el locale predeterminado y el recordado se aplica tras el montaje.
- Llama a los hooks en el nivel superior del componente, como con cualquier hook de Preact.
- Usa `useT("home")` para texto con números o elecciones, y lee cadenas simples de `useDictionary("home")`.

## Solución de problemas

- **`useDialex must be used within a DialexProvider`**: el componente se renderiza fuera del provider. Envuelve la raíz en `<DialexProvider {...dialex}>`.
- **El texto muestra un instante el idioma predeterminado al cargar**: el locale recordado se aplica tras el montaje. Resuélvelo en el servidor y pásalo como `initialLocale`.
- **Las claves no se autocompletan**: ejecuta `dx generate` e incluye `dialex-env.d.ts` en tu `tsconfig`. La CLI añade las declaraciones de `dialexjs/preact` cuando `preact` está en `package.json`.
