# SvelteKit

## Hook

```ts
// src/hooks.server.ts
import { i18nHandle } from "dialexjs/sveltekit";
import dictionaries from "./i18n.generated.js";

export const handle = i18nHandle({
  defaultLocale: "en",
  locales: ["en", "tr"],
  dictionaries,
});
```

Combine it with other hooks using `sequence` from `@sveltejs/kit/hooks`.

## Locals

`i18nHandle` fills `event.locals.locale` and `event.locals.getDictionary(name)`, and augments `App.Locals` so both are typed:

```ts
// src/routes/+page.server.ts
export const load = ({ locals }) => {
  const dict = locals.getDictionary("home");
  return { locale: locals.locale, title: dict.title };
};
```

## Document language

Put the placeholder in `src/app.html`; it is replaced with the resolved locale on every response:

```html
<html lang="%dialex.lang%"></html>
```

`Content-Language` is set unless `setHeader` is `false`. All [locale detection options](../guide/locale-detection.md#options) apply, and `custom` receives the request event.
