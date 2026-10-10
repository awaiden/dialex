# Solid

`dialexjs/solid` proporciona un provider de contexto y accesores de grano fino para SolidJS. Un diccionario es un accesor, así que JSX lee `home().title` y, al cambiar el locale, solo se actualizan los nodos de texto que lo usan.

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
import { DialexProvider } from "dialexjs/solid";
import { render } from "solid-js/web";

import App from "./App";
import { dialex } from "./dialex.generated";

render(
  () => (
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  ),
  document.getElementById("root")!,
);
```

## Usar diccionarios

`useDictionary(name)` devuelve un accesor. Llámalo en JSX o dentro de un efecto para que la lectura quede registrada:

```tsx
import { useDictionary, useT } from "dialexjs/solid";
import { createSignal } from "solid-js";

export default function Home() {
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = createSignal(2);

  return (
    <>
      <h1>{home().title}</h1>
      <p>{home().greeting("Alex")}</p>
      <p>{t("home.items", { count: count() })}</p>
      <button onClick={() => setCount((n) => n + 1)}>+1</button>
    </>
  );
}
```

`useT(...names)` devuelve una función `t("dictionary.key", values?)`. Los valores se comprueban a partir del mensaje ICU, así que `count` arriba debe ser un número.

## Cambiar el locale

`useDialex()` devuelve el accesor `locale` y `setLocale`. El provider recuerda la elección en la cookie `locale` y mantiene `<html lang>` sincronizado:

```tsx
import { useDialex } from "dialexjs/solid";
import { For } from "solid-js";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <select value={locale()} onChange={(event) => setLocale(event.currentTarget.value)}>
      <For each={locales}>{(code) => <option value={code}>{code.toUpperCase()}</option>}</For>
    </select>
  );
}
```

## API

| Exportación                    | Descripción                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<DialexProvider {...dialex}>` | Proporciona el locale y los diccionarios al árbol. Props: los `dictionaries`, `config` y `loaders` generados, más `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` o `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                  | Devuelve `{ locale, setLocale, store }`. `locale` es un accesor. Lanza un error fuera de un `DialexProvider`                                                                                                                                   |
| `useDictionary(name)`          | Un accesor del diccionario del locale actual, siguiendo la cadena de reserva. Se actualiza al cambiar el locale y cuando se carga un diccionario diferido                                                                                      |
| `useT(...names)`               | Una función `t("dictionary.key", values?)` que sigue al locale actual. Indica los diccionarios para cargarlos con carga diferida                                                                                                               |

## Carga diferida

Con `lazy: true` o `"locale"` en `dialex.config.ts`, `useDictionary` está vacío hasta que el diccionario se carga y luego actualiza el accesor. Precarga lo que necesita la siguiente vista con `preloadDictionaries`:

```ts
import { preloadDictionaries } from "dialexjs/solid";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Buenas prácticas

- Lee el accesor donde lo usas (`{home().title}`), no una vez al principio del componente en una variable simple. Un valor copiado del accesor no se actualiza cuando cambia el locale.
- Llama a `useDictionary` y `useT` mientras se crea el componente (en su nivel superior), porque leen el contexto de Solid. No los llames en manejadores de eventos.
- Usa `<For>` y `<Show>` para listas y condiciones, con texto del diccionario dentro; las cadenas de Dialex son valores simples y funcionan con cualquier componente de flujo de control de Solid.
- Usa mensajes ICU para texto con números o elecciones, y pasa valores reactivos (`count()`) para que el mensaje se vuelva a renderizar cuando cambien.

## Solución de problemas

- **`useDialex must be used within a DialexProvider`**: el componente se renderiza fuera del provider. Envuelve la raíz en `<DialexProvider {...dialex}>`.
- **El texto no cambia al cambiar el locale**: el accesor se leyó una vez fuera de JSX o de un efecto. Llama a `home()` donde se renderiza el texto.
- **Las claves no se autocompletan**: ejecuta `dx generate` e incluye `dialex-env.d.ts` en tu `tsconfig`. La CLI añade las declaraciones de `dialexjs/solid` cuando `solid-js` está en `package.json`.
