# Lit

`dialexjs/lit` funciona con Lit y con cualquier elemento personalizado. `createDialex()` guarda el locale y los diccionarios, y `DialexController` es un [controlador reactivo](https://lit.dev/docs/composition/controllers/) que vuelve a renderizar un elemento cuando cambia el locale.

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

Crea el estado del locale una sola vez, en un módulo propio. Cada elemento lo importa desde allí, así que todos comparten un único locale:

```ts
// src/i18n.ts
import { createDialex } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

export const i18n = createDialex({ ...dialex });
```

## Usar diccionarios

Añade un `DialexController` a un elemento. `dictionary(name)` devuelve el diccionario del locale actual, y `t(...names)` devuelve una función `t("dictionary.key", values?)`:

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

Los valores se comprueban por tipo a partir del mensaje ICU, por lo que `count` arriba debe ser un número.

## Cambiar el locale

`setLocale` cambia el locale de todos los elementos que usan el controlador. `createDialex` recuerda la elección en la cookie `locale`, la aplica al crearse y mantiene `<html lang>` sincronizado:

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

## Sin Lit

`createDialex` no depende de Lit. Cualquier componente puede leer el locale y suscribirse a los cambios, por lo que funciona con elementos personalizados simples y otras librerías:

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

`createDialex({ ...dialex })` acepta los `dictionaries`, `config` y `loaders` generados, además de `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` o `false`), `storageKey` y `onLocaleChange(locale)`.

| Exportación                          | Descripción                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)`              | Crea el estado de locale compartido: `locale`, `setLocale`, `subscribe`, `getDictionary(name)`, `t(...names)`                 |
| `new DialexController(host, dialex)` | Un controlador reactivo. Solicita una actualización de `host` cuando cambia el locale o carga un diccionario diferido         |
| `controller.locale`                  | El locale activo                                                                                                              |
| `controller.setLocale(locale)`       | Cambia el locale de todos los elementos que usan la misma instancia de `createDialex`                                         |
| `controller.dictionary(name)`        | El diccionario del locale actual, siguiendo la cadena de fallback                                                             |
| `controller.t(...names)`             | Una función `t("dictionary.key", values?)` ligada al locale actual. Nombra los diccionarios para cargarlos con carga diferida |

## Carga diferida

Con `lazy: true` o `"locale"` en `dialex.config.ts`, `dictionary(name)` devuelve un objeto vacío hasta que el diccionario se ha cargado, y el elemento se vuelve a renderizar cuando llega. Precarga lo que necesita la siguiente vista con `preloadDictionaries`:

```ts
import { preloadDictionaries } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Buenas prácticas

- Crea una instancia de `createDialex` por app e impórtala. Dos instancias no comparten su locale.
- Lee el diccionario dentro de `render()`, para que el elemento muestre el texto nuevo tras un cambio de locale. Un valor leído en el constructor se queda en el idioma anterior.
- Usa `t("home")` para texto con números o elecciones, y lee cadenas simples de `dictionary("home")`.
- Una instancia guarda un locale, lo que encaja con el navegador. En un servidor, no compartas una instancia entre peticiones; crea una por petición con `initialLocale`.

## Solución de problemas

- **El elemento no se actualiza al cambiar el locale**: el controlador se creó con una instancia de `createDialex` distinta de aquella en la que se llamó a `setLocale`. Importa el mismo módulo `i18n` en todas partes.
- **El texto está vacío con carga diferida**: el diccionario aún no ha llegado. El elemento se vuelve a renderizar cuando llega; usa `preloadDictionaries` para cargarlo antes.
- **Las claves no se autocompletan**: ejecuta `dx generate` e incluye `dialex-env.d.ts` en tu `tsconfig`. La CLI añade las declaraciones de `dialexjs/lit` cuando `lit` está en `package.json`.
