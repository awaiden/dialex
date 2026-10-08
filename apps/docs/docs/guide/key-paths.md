# Key Paths (`t`)

`t` reads a value by dot path, in addition to `getDictionary(name).key`. It is typed from the generated registry, so paths autocomplete and argument types are checked.

```ts
t("home.title"); // "Welcome"
t("home.nav.about"); // nested objects use more dots
t("home.greeting", "Ada"); // function leaves receive the extra arguments
```

If the leaf is a string and you pass a values object, it is formatted as an [ICU message](./icu.md): `t("cart.items", { count: 3 })`.

Unknown paths log a warning and return the path itself.

## Where it is available

| Environment   | How to get `t`                                |
| ------------- | --------------------------------------------- |
| React         | `const t = useT()` from `dialex/react`        |
| Vue / Nuxt    | `const t = useT()` from `dialex/vue`          |
| Server (Next) | `const t = getT(locale)` from `dialex/server` |
| Elysia        | `t` on the request context                    |
| SvelteKit     | `event.locals.t`                              |
| Astro         | `Astro.locals.t`                              |
| Anywhere else | `createT(getDictionary)` from `dialex`        |

## Typing

After `dialex generate`, the registry augments the `dialex` module, so `TranslationPath` becomes a union such as `"home.title" | "home.greeting" | "home.nav.about"`. Passing an unknown path or the wrong argument type is a compile error:

```ts
t("home.greeting", 42); // Error: number is not assignable to string
t("home.nope"); // Error: not a valid path
```

Before the registry is generated, `t` accepts any string.
