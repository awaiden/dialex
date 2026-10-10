# Svelte

`dialexjs/svelte` da a los componentes de Svelte 4 y 5 un store del locale y los diccionarios como stores. Funciona en aplicaciones Vite simples y en componentes de SvelteKit. Usa `svelte/store` y el contexto de Svelte, así que no hay runas ni pasos de compilación que configurar. Para la detección del locale en el servidor con SvelteKit, consulta [SvelteKit](./sveltekit.md).

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

Llama a `provideDialex` una vez, en el script de tu componente raíz, con la exportación `dialex` generada:

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "./dialex.generated";
  import Home from "./lib/Home.svelte";

  provideDialex({ ...dialex });
</script>

<Home />
```

## Usar diccionarios

`useDictionary(name)` devuelve un store con el diccionario del locale actual. Ponle el prefijo `$` en la plantilla. Las claves están tipadas y se autocompletan desde tus diccionarios:

```svelte
<!-- src/lib/Home.svelte -->
<script lang="ts">
  import { useDictionary } from "dialexjs/svelte";

  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<p>{$home.greeting("Alex")}</p>
```

## Mensajes ICU y plurales

`useT(...names)` devuelve un store con una función `t`. Llámala como `$t("home.items", { count })`; `count` se comprueba a partir del mensaje. Con [carga diferida](../guide/lazy-loading.md), indica los diccionarios que lees para que se carguen:

```svelte
<script lang="ts">
  import { useT } from "dialexjs/svelte";

  const t = useT("home");
  let count = $state(2);
</script>

<p>{$t("home.items", { count })}</p>
<button onclick={() => count++}>+1</button>
```

## Cambiar el locale

`useDialex()` devuelve el store `locale` y `setLocale`. El provider recuerda la elección en la cookie `locale`, actualiza `<html lang>` y todos los stores `$` la siguen:

```svelte
<script lang="ts">
  import { useDialex } from "dialexjs/svelte";

  import { locales } from "../dialex.generated";

  const { locale, setLocale } = useDialex();
</script>

<select value={$locale} onchange={(event) => setLocale(event.currentTarget.value)}>
  {#each locales as code (code)}
    <option value={code}>{code.toUpperCase()}</option>
  {/each}
</select>
```

## API

| Exportación                            | Descripción                                                                                                                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDialex(source, options?)`      | Hace que Dialex esté disponible para el componente y todo lo que hay debajo. Llámalo una vez en el componente raíz. Opciones: `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` o `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                          | Devuelve `{ locale, setLocale, store }`. `locale` es un store de lectura. Lanza un error fuera de un componente bajo `provideDialex`                                                                                                                       |
| `useDictionary(name)`                  | Un store de lectura con el diccionario del locale actual, siguiendo la cadena de reserva                                                                                                                                                                   |
| `useT(...names)`                       | Un store de lectura con `t("dictionary.key", values?)` para el locale actual                                                                                                                                                                               |
| `createSvelteDialex(source, options?)` | El núcleo reactivo sin el contexto de Svelte, para módulos simples y pruebas. Devuelve `{ locale, setLocale, store, dictionary(name), translator(...names) }`                                                                                              |

## Renderizado en el servidor y SvelteKit

En SvelteKit, resuelve el locale en `hooks.server.ts` con [`dialexHandle`](./sveltekit.md), devuélvelo desde el `+layout.server.ts` raíz y pásalo como `initialLocale`, para que el servidor y el primer render del cliente coincidan:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "../dialex.generated";

  let { data, children } = $props();

  provideDialex({ ...dialex }, { initialLocale: data.locale });
</script>

{@render children()}
```

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => ({ locale: locals.locale });
```

## Carga diferida

Con `lazy: true` o `"locale"` en `dialex.config.ts`, `useDictionary` devuelve un objeto vacío hasta que llega el diccionario y luego actualiza el store. Precarga lo que necesita la siguiente página:

```ts
import { preloadDictionaries } from "dialexjs/svelte";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Pruebas

Prueba el núcleo reactivo sin renderizar un componente. `createSvelteDialex` toma la misma exportación `dialex` y devuelve stores que puedes leer con `get`:

```ts
import { createSvelteDialex } from "dialexjs/svelte";
import { get } from "svelte/store";
import { expect, it } from "vitest";

import { dialex } from "./dialex.generated";

it("switches to Turkish", () => {
  const app = createSvelteDialex({ ...dialex }, { persist: false });
  const home = app.dictionary("home");

  expect(get(home).title).toBe("One dictionary, every language");
  app.setLocale("tr");
  expect(get(home).title).toBe("Tek sözlük, her dil");
});
```

## Buenas prácticas

- Llama a `provideDialex` solo en el componente raíz. Los componentes inferiores usan `useDictionary` y `useT`; un segundo `provideDialex` inicia un locale independiente.
- Llama a `useDictionary` y `useT` en el nivel superior del script de un componente, porque usan el contexto de Svelte. No los llames dentro de manejadores de eventos ni después de un `await`.
- Lee un diccionario en un store una vez y usa `$name.key` en la plantilla. Evita llamar a `useDictionary` con el mismo nombre en muchos componentes pequeños cuando un padre puede pasar el texto.
- Pasa `initialLocale` siempre que el servidor decida el locale. Sin él, el provider muestra primero el locale por defecto y aplica el recordado tras el montaje.

## Solución de problemas

- **`useDialex requires provideDialex() in a parent component`**: `provideDialex` no se llamó en un ancestro, o se ejecuta después del componente que usa los stores. Llámalo en el script del componente raíz.
- **Las claves no se autocompletan**: ejecuta `dx generate` y asegúrate de que `dialex-env.d.ts` esté incluido en tu `tsconfig`. La CLI añade las declaraciones de `dialexjs/svelte` cuando `svelte` está en `package.json`.
- **El idioma parpadea al cargar**: el servidor renderizó un locale y el cliente empezó con otro. Pasa el locale del servidor como `initialLocale`.
