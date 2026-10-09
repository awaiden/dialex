# Schlüsselpfade (`t`)

`t` liest einen Wert über seinen Punktpfad, zusätzlich zu `getDictionary(name).key`. Die Typen stammen aus der generierten Registry, daher werden Pfade automatisch vervollständigt und Argumenttypen geprüft.

```ts
t("home.title"); // "Welcome"
t("home.nav.about"); // nested objects use more dots
t("home.greeting", "Ada"); // function leaves receive the extra arguments
```

Ist das Blatt ein String und übergibst du ein Werte-Objekt, wird er als [ICU-Nachricht](./icu.md) formatiert: `t("cart.items", { count: 3 })`.

Unbekannte Pfade protokollieren eine Warnung und geben den Pfad selbst zurück.

## Wo es verfügbar ist

| Umgebung      | So erhältst du `t`                                        |
| ------------- | --------------------------------------------------------- |
| React         | `const t = useT()` aus `dialexjs/react`                   |
| Vue / Nuxt    | `const t = useT()` aus `dialexjs/vue`                     |
| Server (Next) | `const t = getT(locale)` aus `createDialexServer(dialex)` |
| Elysia        | `t` im Request-Kontext                                    |
| SvelteKit     | `event.locals.t`                                          |
| Astro         | `Astro.locals.t`                                          |
| Überall sonst | `createT(getDictionary)` aus `dialexjs`                   |

## Typisierung

Nach `dialex generate` erweitert die Registry das Modul `dialexjs`, sodass `TranslationPath` zu einer Union wie `"home.title" | "home.greeting" | "home.nav.about"` wird. Ein unbekannter Pfad oder ein Argument mit falschem Typ ist ein Kompilierfehler:

```ts
t("home.greeting", 42); // Error: number is not assignable to string
t("home.nope"); // Error: not a valid path
```

Bevor die Registry generiert wurde, akzeptiert `t` jeden String.
