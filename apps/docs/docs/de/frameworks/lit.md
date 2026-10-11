# Lit

`dialexjs/lit` funktioniert mit Lit und mit jedem Custom Element. `createDialex()` hält das Locale und die Wörterbücher, und `DialexController` ist ein [Reactive Controller](https://lit.dev/docs/composition/controllers/), der ein Element neu rendert, wenn sich das Locale ändert.

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

Erzeuge den Locale-Zustand einmal in einem eigenen Modul. Jedes Element importiert ihn von dort, sodass alle dasselbe Locale teilen:

```ts
// src/i18n.ts
import { createDialex } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

export const i18n = createDialex({ ...dialex });
```

## Wörterbücher verwenden

Füge einem Element einen `DialexController` hinzu. `dictionary(name)` gibt das Wörterbuch des aktuellen Locale zurück, und `t(...names)` gibt eine Funktion `t("dictionary.key", values?)` zurück:

```ts
import { DialexController } from "dialexjs/lit";
// src/home-page.ts
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { i18n } from "./i18n";

@customElement("home-page")
export class HomePage extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    const home = this.dx.dictionary("home");
    const t = this.dx.t("home");

    return html`
      <h1>${home.title}</h1>
      <p>${home.greeting("Alex")}</p>
      <p>${t("home.items", { count: 2 })}</p>
    `;
  }
}
```

Die Werte werden anhand der ICU-Nachricht typgeprüft, daher muss `count` oben eine Zahl sein.

## Das Locale wechseln

`setLocale` ändert das Locale für jedes Element, das den Controller verwendet. `createDialex` merkt sich die Auswahl im Cookie `locale`, wendet sie beim Erzeugen an und hält `<html lang>` synchron:

```ts
import { DialexController } from "dialexjs/lit";
// src/language-switcher.ts
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { locales } from "./dialex.generated";
import { i18n } from "./i18n";

@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    return html`
      <select
        @change=${(event: Event) => this.dx.setLocale((event.target as HTMLSelectElement).value)}
      >
        ${locales.map(
          (code) =>
            html`<option value=${code} ?selected=${code === this.dx.locale}>${code}</option>`,
        )}
      </select>
    `;
  }
}
```

## Ohne Lit

`createDialex` hängt nicht von Lit ab. Jede Komponente kann das Locale lesen und Änderungen abonnieren, daher funktioniert es mit einfachen Custom Elements und anderen Bibliotheken:

```ts
import { i18n } from "./i18n";

class PlainElement extends HTMLElement {
  private unsubscribe?: () => void;

  connectedCallback() {
    this.unsubscribe = i18n.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  render() {
    this.textContent = i18n.getDictionary("home").title;
  }
}

customElements.define("plain-element", PlainElement);
```

## API

`createDialex({ ...dialex })` akzeptiert die generierten `dictionaries`, `config` und `loaders` sowie `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` oder `false`), `storageKey` und `onLocaleChange(locale)`.

| Export                               | Beschreibung                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)`              | Erzeugt den gemeinsamen Locale-Zustand: `locale`, `setLocale`, `subscribe`, `getDictionary(name)`, `t(...names)`                                |
| `new DialexController(host, dialex)` | Ein Reactive Controller. Fordert ein Update von `host` an, wenn sich das Locale ändert oder ein Lazy-Wörterbuch geladen wird                    |
| `controller.locale`                  | Das aktive Locale                                                                                                                               |
| `controller.setLocale(locale)`       | Ändert das Locale für jedes Element, das dieselbe `createDialex`-Instanz verwendet                                                              |
| `controller.dictionary(name)`        | Das Wörterbuch für das aktuelle Locale, entlang der Fallback-Kette                                                                              |
| `controller.t(...names)`             | Eine Funktion `t("dictionary.key", values?)`, die an das aktuelle Locale gebunden ist. Nenne die Wörterbücher, um sie mit Lazy Loading zu laden |

## Lazy Loading

Mit `lazy: true` oder `"locale"` in `dialex.config.ts` gibt `dictionary(name)` ein leeres Objekt zurück, bis das Wörterbuch geladen ist, und das Element wird neu gerendert, sobald es eintrifft. Lade mit `preloadDictionaries` vor, was die nächste Ansicht braucht:

```ts
import { preloadDictionaries } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Bewährte Vorgehensweisen

- Erzeuge pro App eine `createDialex`-Instanz und importiere sie. Zwei Instanzen teilen ihr Locale nicht.
- Lies das Wörterbuch in `render()`, damit das Element nach einem Locale-Wechsel den neuen Text zeigt. Ein im Konstruktor gelesener Wert bleibt in der alten Sprache.
- Verwende `t("home")` für Text mit Zahlen oder Auswahl und lies einfache Strings aus `dictionary("home")`.
- Eine Instanz hält ein Locale, was zum Browser passt. Teile auf einem Server keine Instanz zwischen Anfragen; erzeuge pro Anfrage eine mit `initialLocale`.

## Fehlerbehebung

- **Das Element aktualisiert sich bei Locale-Wechsel nicht**: Der Controller wurde mit einer anderen `createDialex`-Instanz erzeugt als die, auf der `setLocale` aufgerufen wurde. Importiere überall dasselbe Modul `i18n`.
- **Der Text ist mit Lazy Loading leer**: Das Wörterbuch ist noch nicht eingetroffen. Das Element rendert neu, sobald es da ist; lade es mit `preloadDictionaries` früher.
- **Schlüssel werden nicht automatisch vervollständigt**: Führe `dx generate` aus und binde `dialex-env.d.ts` in deine `tsconfig` ein. Die CLI fügt die Deklarationen von `dialexjs/lit` hinzu, wenn `lit` in `package.json` steht.
