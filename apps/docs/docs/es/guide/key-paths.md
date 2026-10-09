# Rutas de claves (`t`)

`t` lee un valor por su ruta con puntos, además de `getDictionary(name).key`. Sus tipos provienen del registro generado, por lo que las rutas se autocompletan y se comprueban los tipos de los argumentos.

```ts
t("home.title"); // "Welcome"
t("home.nav.about"); // nested objects use more dots
t("home.greeting", "Ada"); // function leaves receive the extra arguments
```

Si la hoja es una cadena y pasas un objeto de valores, se formatea como un [mensaje ICU](./icu.md): `t("cart.items", { count: 3 })`.

Las rutas desconocidas registran una advertencia y devuelven la propia ruta.

## Dónde está disponible

| Entorno                 | Cómo obtener `t`                                            |
| ----------------------- | ----------------------------------------------------------- |
| React                   | `const t = useT()` desde `dialexjs/react`                   |
| Vue / Nuxt              | `const t = useT()` desde `dialexjs/vue`                     |
| Servidor (Next)         | `const t = getT(locale)` desde `createDialexServer(dialex)` |
| Elysia                  | `t` en el contexto de la petición                           |
| SvelteKit               | `event.locals.t`                                            |
| Astro                   | `Astro.locals.t`                                            |
| En cualquier otro lugar | `createT(getDictionary)` desde `dialexjs`                   |

## Tipos

Después de `dialex generate`, el registro amplía el módulo `dialexjs`, de modo que `TranslationPath` pasa a ser una unión como `"home.title" | "home.greeting" | "home.nav.about"`. Pasar una ruta desconocida o un argumento de tipo incorrecto es un error de compilación:

```ts
t("home.greeting", 42); // Error: number is not assignable to string
t("home.nope"); // Error: not a valid path
```

Antes de generar el registro, `t` acepta cualquier cadena.
