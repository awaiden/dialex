# Svelte

`dialexjs/svelte` gibt Svelte-4- und -5-Komponenten einen Locale-Store und Wörterbücher als Stores. Es funktioniert in reinen Vite-Apps und in SvelteKit-Komponenten. Es nutzt `svelte/store` und den Kontext von Svelte, daher sind weder Runes noch Kompilierschritte einzurichten. Für die Locale-Erkennung auf dem Server in SvelteKit siehe [SvelteKit](./sveltekit.md).

## Installation

Installiere die Laufzeitbibliothek und das CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Einrichten

Lege `dialex.config.ts` mit deinen Locales an (oder führe `dialex init` aus, das auch die Pakete und ein Start-Wörterbuch hinzufügt):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Schreibe ein Wörterbuch neben den Code, der es verwendet. Jedes Locale hat dieselben Schlüssel:

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

Kompiliere die Wörterbücher zu `dialex.generated.ts` und den Typdeklarationen. Führe es erneut aus, wenn sich ein Wörterbuch ändert, oder lasse `dx generate --watch` laufen:

```bash
npx dx generate
```

Rufe `provideDialex` einmal im Skript deiner Wurzelkomponente mit dem generierten `dialex`-Export auf:

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

## Wörterbücher verwenden

`useDictionary(name)` gibt einen Store mit dem Wörterbuch des aktuellen Locales zurück. Setze im Template ein `$` davor. Schlüssel sind typisiert und werden aus deinen Wörterbüchern vervollständigt:

```svelte
<!-- src/lib/Home.svelte -->
<script lang="ts">
  import { useDictionary } from "dialexjs/svelte";

  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<p>{$home.greeting("Alex")}</p>
```

## ICU-Nachrichten und Plurale

`useT(...names)` gibt einen Store mit einer Funktion `t` zurück. Rufe sie als `$t("home.items", { count })` auf; `count` wird anhand der Nachricht typgeprüft. Nenne bei [Lazy Loading](../guide/lazy-loading.md) die gelesenen Wörterbücher, damit sie geladen werden:

```svelte
<script lang="ts">
  import { useT } from "dialexjs/svelte";

  const t = useT("home");
  let count = $state(2);
</script>

<p>{$t("home.items", { count })}</p>
<button onclick={() => count++}>+1</button>
```

## Das Locale wechseln

`useDialex()` gibt den Store `locale` und `setLocale` zurück. Der Provider merkt sich die Wahl im Cookie `locale`, aktualisiert `<html lang>`, und jeder `$`-Store folgt:

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

| Export                                 | Beschreibung                                                                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provideDialex(source, options?)`      | Macht Dialex für die Komponente und alles darunter verfügbar. Einmal in der Wurzelkomponente aufrufen. Optionen: `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` oder `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                          | Gibt `{ locale, setLocale, store }` zurück. `locale` ist ein lesbarer Store. Wirft außerhalb einer Komponente unter `provideDialex`                                                                                                              |
| `useDictionary(name)`                  | Ein lesbarer Store mit dem Wörterbuch für das aktuelle Locale, entlang der Fallback-Kette                                                                                                                                                        |
| `useT(...names)`                       | Ein lesbarer Store mit `t("dictionary.key", values?)` für das aktuelle Locale                                                                                                                                                                    |
| `createSvelteDialex(source, options?)` | Der reaktive Kern ohne den Kontext von Svelte, für reine Module und Tests. Gibt `{ locale, setLocale, store, dictionary(name), translator(...names) }` zurück                                                                                    |

## Server-Rendering und SvelteKit

Ermittle in SvelteKit das Locale in `hooks.server.ts` mit [`dialexHandle`](./sveltekit.md), gib es aus dem Wurzel-`+layout.server.ts` zurück und übergib es als `initialLocale`, damit Server und erstes Client-Rendering übereinstimmen:

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

## Lazy Loading

Mit `lazy: true` oder `"locale"` in `dialex.config.ts` gibt `useDictionary` ein leeres Objekt zurück, bis das Wörterbuch eingetroffen ist, und aktualisiert dann den Store. Lade vor, was die nächste Seite braucht:

```ts
import { preloadDictionaries } from "dialexjs/svelte";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Testen

Teste den reaktiven Kern, ohne eine Komponente zu rendern. `createSvelteDialex` nimmt denselben `dialex`-Export und gibt Stores zurück, die du mit `get` lesen kannst:

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

## Bewährte Vorgehensweisen

- Rufe `provideDialex` nur in der Wurzelkomponente auf. Komponenten darunter verwenden `useDictionary` und `useT`; ein zweites `provideDialex` startet ein eigenes Locale.
- Rufe `useDictionary` und `useT` auf der obersten Ebene des Skripts einer Komponente auf, weil sie den Kontext von Svelte nutzen. Rufe sie nicht in Event-Handlern oder nach einem `await` auf.
- Lies ein Wörterbuch einmal in einen Store und nutze `$name.key` im Template. Vermeide es, `useDictionary` für denselben Namen in vielen kleinen Komponenten aufzurufen, wenn eine Elternkomponente den Text weitergeben kann.
- Übergib `initialLocale`, sobald der Server das Locale bestimmt. Ohne es zeigt der Provider zuerst das Standard-Locale und wendet das gemerkte nach dem Mounten an.

## Fehlerbehebung

- **`useDialex requires provideDialex() in a parent component`**: `provideDialex` wurde in keinem Vorfahren aufgerufen oder läuft nach der Komponente, die die Stores nutzt. Rufe es im Skript der Wurzelkomponente auf.
- **Schlüssel werden nicht vervollständigt**: Führe `dx generate` aus und stelle sicher, dass `dialex-env.d.ts` in deiner `tsconfig` enthalten ist. Das CLI fügt die Deklarationen für `dialexjs/svelte` hinzu, wenn `svelte` in der `package.json` steht.
- **Die Sprache blitzt beim Laden auf**: Der Server hat ein Locale gerendert, und der Client startete mit einem anderen. Übergib das Locale des Servers als `initialLocale`.
