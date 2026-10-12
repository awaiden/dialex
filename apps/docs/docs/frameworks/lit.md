# Lit

`dialexjs/lit` works with Lit and with any custom element. `createDialex()` holds the locale and the dictionaries, and `DialexController` is a [reactive controller](https://lit.dev/docs/composition/controllers/) that re-renders an element when the locale changes.

## Install

Install the runtime and the CLI:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Set up

Create `dialex.config.ts` with your locales (or run `dialex init`, which also adds the packages and a starter dictionary):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Write a dictionary next to the code that uses it. Every locale has the same keys:

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

Compile the dictionaries into `dialex.generated.ts` and the type declarations. Run it again when a dictionary changes, or keep `dx generate --watch` running:

```bash
npx dx generate
```

Create the locale state once, in a module of its own. Every element imports it from there, so they all share one locale:

```ts
// src/i18n.ts
import { createDialex } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

export const i18n = createDialex({ ...dialex });
```

## Use dictionaries

Add a `DialexController` to an element. `dictionary(name)` returns the dictionary of the current locale, and `t(...names)` returns a `t("dictionary.key", values?)` function:

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

Values are type-checked from the ICU message, so `count` above must be a number.

## Switch the locale

`setLocale` changes the locale for every element that uses the controller. `createDialex` remembers the choice in the `locale` cookie, applies it when it is created, and keeps `<html lang>` in sync:

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

## Without Lit

`createDialex` does not depend on Lit. Any component can read the locale and subscribe to changes, which makes it work with plain custom elements and other libraries:

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

`createDialex({ ...dialex })` accepts the generated `dictionaries`, `config` and `loaders`, plus `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` or `false`), `storageKey` and `onLocaleChange(locale)`.

| Export                               | Description                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)`              | Creates the shared locale state: `locale`, `setLocale`, `subscribe`, `getDictionary(name)`, `t(...names)`                   |
| `new DialexController(host, dialex)` | A reactive controller. Requests an update of `host` when the locale changes or a lazy dictionary loads                      |
| `controller.locale`                  | The active locale                                                                                                           |
| `controller.setLocale(locale)`       | Changes the locale for every element that uses the same `createDialex` instance                                             |
| `controller.dictionary(name)`        | The dictionary for the current locale, following the fallback chain                                                         |
| `controller.t(...names)`             | A `t("dictionary.key", values?)` function bound to the current locale. Name the dictionaries to load them with lazy loading |

## Lazy loading

With `lazy: true` or `"locale"` in `dialex.config.ts`, `dictionary(name)` returns an empty object until the dictionary has loaded, and the element renders again when it arrives. Preload what the next view needs with `preloadDictionaries`:

```ts
import { preloadDictionaries } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Links and navigation

If your URLs carry the locale (`/tr/about`), build links with `localizePath` from [Routing Helpers](../guide/routing.md) and the locale the app is showing. Dialex has no link component for Lit: a few lines of your own keep `location.assign()` and redirects working the same way, and show exactly what happens to a path. The generated `config` already holds `locales`, `defaultLocale` and `prefixDefault`, so nothing is repeated.

```ts
import { localizePath } from "dialexjs/routing";
import { html } from "lit";

import { config } from "./dialex.generated";
import { i18n } from "./i18n";

const localize = (path: string, to = i18n.locale) => localizePath(path, to, config);

html`<a href=${localize("/about")}>About</a>`;

// Programmatic navigation without a router:
location.assign(localize("/cart"));
```

## Best practices

- Create one `createDialex` instance per app and import it. Two instances do not share their locale.
- Read the dictionary inside `render()`, so the element shows the new text after a locale change. A value read in the constructor stays in the old language.
- Use `t("home")` for text with numbers or choices, and read plain strings from `dictionary("home")`.
- An instance holds one locale, which suits the browser. On a server, do not share one instance between requests; create one per request with `initialLocale`.

## Troubleshooting

- **The element does not update on locale change**: the controller was created with a different `createDialex` instance than the one `setLocale` was called on. Import the same `i18n` module everywhere.
- **The text is empty with lazy loading**: the dictionary has not arrived yet. The element renders again when it does; use `preloadDictionaries` to load it earlier.
- **Keys are not autocompleted**: run `dx generate` and include `dialex-env.d.ts` in your `tsconfig`. The CLI adds the `dialexjs/lit` declarations when `lit` is in `package.json`.
