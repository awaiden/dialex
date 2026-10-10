# Angular

`dialexjs/angular` provides the active locale, dictionaries and `t` as Angular signals.

::: warning Versions
Developed and tested against Angular 22. It uses only `signal`, `computed`, `inject`, `InjectionToken`, `makeEnvironmentProviders` and `afterNextRender`, so it is written for Angular 17 and newer, but older versions have not been tested. It has not been run inside an Angular CLI application; the tests drive a real Angular application injector in a DOM environment.
:::

## Setup

Angular passes dictionaries explicitly, like the server adapters. Generate them with the CLI:

```bash
dialex generate        # writes src/dialex.generated.ts
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideDialex } from "dialexjs/angular";

import { dialex } from "../dialex.generated";

export const appConfig: ApplicationConfig = {
  providers: [provideDialex({ ...dialex })],
};
```

Re-run `dialex generate` (or `dialex generate --watch`) whenever you change a dictionary.

## Using it in a component

```ts
import { Component } from "@angular/core";
import { injectDictionary, injectDialex, injectT } from "dialexjs/angular";

@Component({
  selector: "app-header",
  template: `
    <h1>{{ dict().title }}</h1>
    <p>{{ t("home.items", { count: 3 }) }}</p>
    <button (click)="toggle()">{{ dialex.locale() }}</button>
  `,
})
export class HeaderComponent {
  protected readonly dialex = injectDialex();
  protected readonly dict = injectDictionary("home"); // Signal of the dictionary
  protected readonly t = injectT();

  toggle() {
    this.dialex.setLocale(this.dialex.locale() === "en" ? "tr" : "en");
  }
}
```

| Function                 | Returns                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `injectDialex()`         | The store: `locale` (a `Signal<string>`), `setLocale(locale)`, `dictionary(name)`, `t`             |
| `injectDictionary(name)` | A `Signal` with the dictionary for the active locale, following [fallbacks](../guide/fallbacks.md) |
| `injectT()`              | A [`t` function](../guide/key-paths.md) for the active locale, with [ICU](../guide/icu.md) support |

Call them in an injection context, such as a field initializer or constructor. Because `t` reads the locale signal each time it is called, calling it from a template keeps that template up to date when the locale changes.

### Why there is no `| t` pipe

Angular pipes need Angular's own compiler, and Dialex ships as plain JavaScript like its other adapters. The `t` function works in templates the same way: `{{ t('home.title') }}`.

## Options

| Option          | Default    | Description                                                                                                                                       |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | required   | `defineDictionary` results or a `{ name: { locale: content } }` map, usually from `dialex generate`                                               |
| `defaultLocale` | `"en"`     | Locale used when nothing else decides                                                                                                             |
| `locales`       |            | Supported locales. A remembered locale outside this list is ignored                                                                               |
| `fallbacks`     |            | Explicit [fallback chains](../guide/fallbacks.md)                                                                                                 |
| `initialLocale` |            | The locale to render first: a string, or a function that runs in the injection context. When set, the remembered locale is not applied afterwards |
| `persist`       | `"cookie"` | Where the choice is remembered: `"cookie"`, `"localStorage"` or `false`                                                                           |
| `storageKey`    | `"locale"` | Cookie or localStorage key                                                                                                                        |

The remembered locale is applied after the first render, so server-rendered markup and the first client render always agree. `<html lang>` follows the active locale.

## Server-side rendering

With Angular SSR the first render happens on the server, so tell Dialex which locale the request wants by passing `initialLocale` as a function. It runs in the injection context, so it can `inject()` what your server provides:

```ts
import { inject } from "@angular/core";
import { REQUEST } from "@angular/core"; // location depends on your Angular SSR version

provideDialex({
  ...dialex,
  initialLocale: () => {
    const request = inject(REQUEST, { optional: true });
    const cookie = request?.headers.get("cookie") ?? "";
    return /(?:^|;\s*)locale=([^;]+)/.exec(cookie)?.[1] ?? "en";
  },
});
```

::: warning Untested recipe
The `initialLocale` function is covered by tests, but this `REQUEST` example has not been run against a real Angular SSR setup. The token's name and import path have changed between Angular versions; check your version's SSR documentation.
:::

## Lazy loading

Dictionaries are passed in at startup, so [lazy loading](../guide/lazy-loading.md) does not apply to Angular. Split large dictionaries by importing only the ones you need into the `dictionaries` you pass.

## Testing

`provideDialex` works in `TestBed` like any provider:

```ts
TestBed.configureTestingModule({
  providers: [provideDialex({ ...dialex, defaultLocale: "tr", persist: false })],
});
```

For code that does not need Angular, use [`createTestDialex`](../guide/testing.md).
