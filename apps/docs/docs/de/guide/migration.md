# Migration zu Dialex

So wechselst du von i18next, react-intl (FormatJS), next-intl oder vue-i18n. Die Konzepte entsprechen sich weitgehend; es ändert sich, wo Nachrichten liegen (TypeScript-Dateien statt JSON) und wie du sie aufrufst (ein `t`, mit dem Wörterbuchnamen zuerst).

## Der Plan

1. **Installiere** `dialexjs` und `@dialexjs/cli` und führe `dialex init` aus ([Erste Schritte](./getting-started.md)).
2. **Lege je Namespace oder Feature ein Wörterbuch an**, mit einem leeren Objekt je Locale:

   ```ts
   // src/home.content.ts
   import { defineDictionary } from "dialexjs";

   export default defineDictionary("home", { en: {}, tr: {} });
   ```

3. **Verflache dein JSON** zu einer Datei je Locale, mit dem Wörterbuchnamen als Schlüsselpräfix, und **importiere** es dann:

   ```json
   { "home.title": "Welcome", "home.nav.about": "About" }
   ```

   ```bash
   dialex import en.json --allow-new
   dialex import tr.json --allow-new
   ```

   `--allow-new` fügt Schlüssel hinzu, die noch keine Locale hat. [`dialex import`](../cli/import.md) validiert ICU-Nachrichten und listet auf, was es abgelehnt hat.

4. **Wandle die Nachrichtensyntax um** (nächster Abschnitt) in den Wörterbüchern.
5. **Ersetze die Aufrufe** in deinem Code, ein Framework nach dem anderen.
6. **Führe `dialex generate` und `dialex check` aus.** Fehlende Schlüssel, abweichende Argumente und Aufrufe nicht vorhandener Schlüssel erscheinen sofort.

## Nachrichtensyntax

Dialex-Nachrichten sind [ICU MessageFormat](./icu.md). Wenn deine Nachrichten bereits ICU sind, kopiere sie.

| Du hast                                                | Schreibe in Dialex                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| i18next `Hello {{name}}`                               | `Hello {name}`                                                                                                                                    |
| i18next `key_one` / `key_other` mit `{{count}}`        | `{count, plural, one {# item} other {# items}}`                                                                                                   |
| i18next-Kontext `key_male` / `key_female`              | `{gender, select, male {...} female {...} other {...}}`                                                                                           |
| i18next-Verschachtelung `$t(other.key)`                | Kein Äquivalent. Wiederhole den Text oder nutze eine Funktionsnachricht, die `t` aufruft                                                          |
| i18next-Formatierung `{{val, number}}`                 | `{val, number}`; Datumswerte `{when, date, medium}`                                                                                               |
| vue-i18n `{name}`                                      | Dasselbe                                                                                                                                          |
| vue-i18n-Pipes `no items \| one item \| {count} items` | `{count, plural, =0 {no items} one {one item} other {# items}}`                                                                                   |
| vue-i18n verknüpft `@:other.key`                       | Kein Äquivalent. Wiederhole den Text                                                                                                              |
| ICU-Strings von react-intl und next-intl               | Dasselbe, unverändert kopiert                                                                                                                     |
| Rich-Text-Tags `<b>...</b>`                            | **Nicht unterstützt**: Tags werden nicht geparst. Teile die Nachricht um das Markup auf oder schreibe eine Funktionsnachricht, die JSX zurückgibt |

## Von i18next

| i18next                                | Dialex                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `locales/<lng>/<ns>.json`              | `src/<ns>.content.ts`: `defineDictionary("<ns>", { en: {...}, tr: {...} })` |
| `useTranslation("home")`, `t("title")` | `useT("home")`, `t("home.title")`: Der Wörterbuchname ist Teil des Pfads    |
| `i18n.changeLanguage("tr")`            | `setLocale("tr")` aus `useDialex()`                                         |
| `i18n.language`                        | `locale` aus `useDialex()`                                                  |
| `fallbackLng`                          | `defaultLocale` und `fallbacks` in `dialex.config.ts`                       |
| `supportedLngs`                        | `locales`                                                                   |
| Language-Detector-Plugin               | Die Server-Adapter oder `initialLocale` und `persist` des Providers         |
| Lazy geladene Backends                 | `lazy: true` oder `"locale"`; siehe [Lazy Loading](./lazy-loading.md)       |

```tsx
// before
const { t } = useTranslation("home");
return <p>{t("items", { count })}</p>;

// after
const t = useT("home");
return <p>{t("home.items", { count })}</p>;
```

## Von react-intl (FormatJS)

| react-intl                                                            | Dialex                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Nachrichtenkatalog `{ "home.title": "..." }`                          | Dieselben flachen Schlüssel: `dialex import` nimmt sie unverändert (`home` wird das Wörterbuch) |
| `<IntlProvider locale messages>`                                      | `<DialexProvider {...dialex}>`                                                                  |
| `intl.formatMessage({ id }, values)`, `<FormattedMessage>`            | `t("home.title", values)`                                                                       |
| `defineMessages`, Nachrichten-Extraktion                              | Nicht nötig: Schlüssel liegen im Wörterbuch, und `dialex check` findet unbekannte               |
| `intl.formatNumber`, `formatDate`, `formatRelativeTime`, `formatList` | `number`, `date`, `relativeTime`, `list` aus `dialexjs`, mit der Locale als erstem Argument     |
| `intl.locale`                                                         | `locale` aus `useDialex()`                                                                      |

```tsx
// before
<FormattedMessage id="home.items" values={{ count }} />;

// after
{
  t("home.items", { count });
}
```

## Von next-intl

| next-intl                               | Dialex                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `messages/<locale>.json`                | `*.content.ts`-Wörterbücher (JSON verflachen und mit `dialex import` einlesen) |
| `useTranslations("home")`, `t("title")` | `useT("home")`, `t("home.title")`                                              |
| `getTranslations` in Server Components  | `getT(locale)` aus `createDialexServer(dialex)`                                |
| `createMiddleware(routing)`             | `createDialexMiddleware({ locales, defaultLocale })`                           |
| `Link` aus `createNavigation`           | `DialexLink`                                                                   |
| `t.rich(...)`                           | Nicht unterstützt. Nutze eine Funktionsnachricht, die JSX zurückgibt           |
| `NextIntlClientProvider`                | `DialexProvider {...dialex}`                                                   |

Das vollständige Setup steht unter [Next.js](../frameworks/nextjs.md).

## Von vue-i18n

| vue-i18n                                  | Dialex                                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `createI18n({ locale, messages })`        | `createDialex({ ...dialex })` und `app.use(...)`                    |
| `useI18n()`, `t("home.title")`, `$t(...)` | `useT("home")` und `t("home.title")`                                |
| `locale.value = "tr"`                     | `setLocale("tr")` aus `useDialex()`                                 |
| `fallbackLocale`                          | `defaultLocale` und `fallbacks`                                     |
| Nachrichten-Pipes für Plurale             | ICU `plural`                                                        |
| Nuxt `@nuxtjs/i18n`                       | Das Modul `dialexjs/nuxt`; siehe [Vue / Nuxt](../frameworks/vue.md) |

## Was Dialex nicht hat

Prüfe das vor dem Start; für jedes gibt es oben einen Workaround.

- Rich-Text-Tags in Nachrichten (`<b>`, `t.rich`): Nutze Funktionsnachrichten, die Markup zurückgeben.
- Verschachtelte oder verknüpfte Nachrichten (`$t(...)`, `@:key`): Wiederhole den Text.
- Namespaces als eigenes Konzept: Ein Wörterbuch ist der Namespace.
- Übersetzungen zur Laufzeit von einem Server laden: Übersetzungen werden mit der App ausgeliefert (siehe die [FAQ](./faq.md)).
- Pseudo-Lokalisierung und automatische Schlüsselextraktion aus Code: Schlüssel liegen in Wörterbüchern, die `dialex check` gegen deinen Code prüft.

## Wenn du fertig bist

- [ ] `dialex check` endet mit `0`
- [ ] `dialex check` läuft in der CI, damit generierte Dateien und Parität ehrlich bleiben
- [ ] Die alten i18n-Pakete und ihre JSON-Dateien sind entfernt
- [ ] Editoren haben die [Dialex-Erweiterung](./vscode.md), die Hover und Gehe-zu-Definition auf `t("...")` bietet
