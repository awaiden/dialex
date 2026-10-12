# Migrating to Dialex

How to move from i18next, react-intl (FormatJS), next-intl or vue-i18n. The ideas map closely; what changes is where messages live (TypeScript files, not JSON) and how you call them (one `t` with the dictionary name first).

## The plan

1. **Install** `dialexjs` and `@dialexjs/cli`, and run `dialex init` ([Getting Started](./getting-started.md)).
2. **Create one dictionary per namespace or feature**, with an empty object per locale:

   ```ts
   // src/home.content.ts
   import { defineDictionary } from "dialexjs";

   export default defineDictionary("home", { en: {}, tr: {} });
   ```

3. **Flatten your JSON** to one file per locale with keys prefixed by the dictionary name, then **import** it:

   ```json
   { "home.title": "Welcome", "home.nav.about": "About" }
   ```

   ```bash
   dialex import en.json --allow-new
   dialex import tr.json --allow-new
   ```

   `--allow-new` adds keys that no locale has yet. [`dialex import`](../cli/import.md) validates ICU messages and lists what it rejected.

4. **Convert the message syntax** (next section) in the dictionaries.
5. **Replace the calls** in your code, one framework at a time.
6. **Run `dialex generate` and `dialex check`.** Missing keys, mismatched arguments and calls to keys that do not exist show up immediately.

## Message syntax

Dialex messages are [ICU MessageFormat](./icu.md). If your messages are already ICU, copy them.

| You have                                               | Write in Dialex                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| i18next `Hello {{name}}`                               | `Hello {name}`                                                                                                            |
| i18next `key_one` / `key_other` with `{{count}}`       | `{count, plural, one {# item} other {# items}}`                                                                           |
| i18next context `key_male` / `key_female`              | `{gender, select, male {...} female {...} other {...}}`                                                                   |
| i18next nesting `$t(other.key)`                        | No equivalent. Repeat the text, or use a function message that calls `t`                                                  |
| i18next formatting `{{val, number}}`                   | `{val, number}`; dates `{when, date, medium}`                                                                             |
| vue-i18n `{name}`                                      | The same                                                                                                                  |
| vue-i18n pipes `no items \| one item \| {count} items` | `{count, plural, =0 {no items} one {one item} other {# items}}`                                                           |
| vue-i18n linked `@:other.key`                          | No equivalent. Repeat the text                                                                                            |
| react-intl and next-intl ICU strings                   | The same, copied as they are                                                                                              |
| Rich text tags `<b>...</b>`                            | **Not supported**: tags are not parsed. Split the message around the markup, or write a function message that returns JSX |

## From i18next

| i18next                                | Dialex                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `locales/<lng>/<ns>.json`              | `src/<ns>.content.ts`: `defineDictionary("<ns>", { en: {...}, tr: {...} })` |
| `useTranslation("home")`, `t("title")` | `useT("home")`, `t("home.title")`: the dictionary name is part of the path  |
| `i18n.changeLanguage("tr")`            | `setLocale("tr")` from `useDialex()`                                        |
| `i18n.language`                        | `locale` from `useDialex()`                                                 |
| `fallbackLng`                          | `defaultLocale` and `fallbacks` in `dialex.config.ts`                       |
| `supportedLngs`                        | `locales`                                                                   |
| Language detector plugin               | The server adapters, or the provider's `initialLocale` and `persist`        |
| Lazy-loaded backends                   | `lazy: true` or `"locale"`; see [Lazy Loading](./lazy-loading.md)           |

```tsx
// before
const { t } = useTranslation("home");
return <p>{t("items", { count })}</p>;

// after
const t = useT("home");
return <p>{t("home.items", { count })}</p>;
```

## From react-intl (FormatJS)

| react-intl                                                            | Dialex                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Message catalog `{ "home.title": "..." }`                             | The same flat keys: `dialex import` takes them as they are (`home` becomes the dictionary)      |
| `<IntlProvider locale messages>`                                      | `<DialexProvider {...dialex}>`                                                                  |
| `intl.formatMessage({ id }, values)`, `<FormattedMessage>`            | `t("home.title", values)`                                                                       |
| `defineMessages`, message extraction                                  | Not needed: keys live in the dictionary, and `dialex check` finds unknown ones                  |
| `intl.formatNumber`, `formatDate`, `formatRelativeTime`, `formatList` | `number`, `date`, `relativeTime`, `list` from `dialexjs`, with the locale as the first argument |
| `intl.locale`                                                         | `locale` from `useDialex()`                                                                     |

```tsx
// before
<FormattedMessage id="home.items" values={{ count }} />;

// after
{
  t("home.items", { count });
}
```

## From next-intl

| next-intl                               | Dialex                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `messages/<locale>.json`                | `*.content.ts` dictionaries (flatten and `dialex import` the JSON) |
| `useTranslations("home")`, `t("title")` | `useT("home")`, `t("home.title")`                                  |
| `getTranslations` in Server Components  | `getT(locale)` from `createDialexServer(dialex)`                   |
| `createMiddleware(routing)`             | `createDialexMiddleware({ locales, defaultLocale })`               |
| `Link` from `createNavigation`          | `DialexLink`                                                       |
| `t.rich(...)`                           | Not supported. Use a function message that returns JSX             |
| `NextIntlClientProvider`                | `DialexProvider {...dialex}`                                       |

See [Next.js](../frameworks/nextjs.md) for the complete setup.

## From vue-i18n

| vue-i18n                                  | Dialex                                                             |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `createI18n({ locale, messages })`        | `createDialex({ ...dialex })` and `app.use(...)`                   |
| `useI18n()`, `t("home.title")`, `$t(...)` | `useT("home")` and `t("home.title")`                               |
| `locale.value = "tr"`                     | `setLocale("tr")` from `useDialex()`                               |
| `fallbackLocale`                          | `defaultLocale` and `fallbacks`                                    |
| Message pipes for plurals                 | ICU `plural`                                                       |
| Nuxt `@nuxtjs/i18n`                       | The `dialexjs/nuxt` module; see [Vue / Nuxt](../frameworks/vue.md) |

## What Dialex does not have

Check these before you start; each has a workaround above.

- Rich text tags in messages (`<b>`, `t.rich`): use function messages that return markup.
- Nested or linked messages (`$t(...)`, `@:key`): repeat the text.
- Namespaces as a separate concept: a dictionary is the namespace.
- Loading translations from a server at runtime: translations ship with the app (see the [FAQ](./faq.md)).
- Pseudo-localization and automatic key extraction from code: keys live in dictionaries, which `dialex check` verifies against your code.

## When you are done

- [ ] `dialex check` exits with `0`
- [ ] `dialex check` runs in CI, so the generated files and the parity stay honest
- [ ] The old i18n packages and their JSON files are removed
- [ ] Editors have the [Dialex extension](./vscode.md), which gives hover and go to definition on `t("...")`
