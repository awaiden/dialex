# Client-Frameworks

Die Adapter für UI-Frameworks: ein Provider (oder Plugin), der die aktive Locale hält, sowie Hooks oder Stores, die Wörterbücher und `t` lesen. Anleitungen mit vollständigen Beispielen stehen auf den [Framework-Seiten](../frameworks/README.md).

## Gemeinsame Optionen

Die meisten Provider nehmen das generierte Objekt `dialex` (`dictionaries`, `config`, `loaders`: `{ ...dialex }`) und diese Optionen:

| Option           | Typ                                   | Standard                       | Beschreibung                                                                                                                            |
| ---------------- | ------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale`  | `string`                              | die Konfiguration, dann `"en"` | Locale, wenn nichts anderes entscheidet                                                                                                 |
| `initialLocale`  | `string`                              | —                              | Die zuerst zu rendernde Locale, etwa die vom Server aufgelöste. Wenn gesetzt, wird die gemerkte Locale nicht angewendet                 |
| `persist`        | `"cookie" \| "localStorage" \| false` | `"cookie"`                     | Wo die Wahl gemerkt wird. Sie wird nach dem Mount angewendet, damit servergerendertes Markup und erstes Client-Rendering übereinstimmen |
| `storageKey`     | `string`                              | `"locale"`                     | Schlüssel für Cookie oder `localStorage`                                                                                                |
| `onLocaleChange` | `(locale: string) => void`            | —                              | Wird nach einer Änderung der Locale aufgerufen                                                                                          |

Hooks und Stores liefern das Wörterbuch der aktiven Locale entlang der [Fallback-Kette](../guide/fallbacks.md). Nenne bei `lazy`-Laden die Wörterbücher, die ein `t` lesen wird (`useT("home", "nav")`), damit sie geladen werden; die Komponente aktualisiert sich, wenn sie ankommen.

## React

`dialexjs/react`

| Export                | Signatur                                       | Beschreibung                                                                                                        |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | `(props: DialexProviderProps) => ReactElement` | Stellt Locale, `setLocale` und Wörterbücher bereit. Props: die gemeinsamen Optionen, `children` und `{ ...dialex }` |
| `useDialex`           | `() => { locale, setLocale, store }`           | Der Kontext. Wirft außerhalb eines Providers                                                                        |
| `useDialexConfig`     | `() => DialexClientConfig`                     | Die generierte Konfiguration, für `locales` oder `prefixDefault`                                                    |
| `useDictionary`       | `<K>(name: K) => ResolveDictionaryType<K>`     | Das Wörterbuch der aktiven Locale. Mit `lazy` suspendiert es bis zum Laden: nutze `<Suspense>`                      |
| `useT`                | `(...dictionaryNames: string[]) => Translate`  | Ein an die aktive Locale gebundenes `t`                                                                             |
| `preloadDictionaries` | siehe [unten](#preloaddictionaries)            | Startet das Laden von Lazy-Wörterbüchern                                                                            |

## Preact

`dialexjs/preact` hat dieselben Exporte wie React (`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`) mit `ComponentChildren`-Props. Mit `lazy` ist das Wörterbuch ein leeres Objekt, bis es geladen ist, und die Komponente rendert neu, wenn es ankommt; es suspendiert nicht. Es funktioniert ohne `preact/compat`.

## Solid

`dialexjs/solid`

| Export                | Beschreibung                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Props: die gemeinsamen Optionen, `children` und `{ ...dialex }`                                                                                         |
| `useDialex()`         | `{ locale, setLocale, store, loaded, ensureLoaded }`. `locale` ist ein Accessor: lies es als `locale()`                                                 |
| `useDictionary(name)` | Ein Accessor: `const home = useDictionary("home")`, dann `home().title`. Aktualisiert sich bei Locale-Wechsel und wenn ein Lazy-Wörterbuch geladen wird |
| `useT(...names)`      | Ein `t`, das der aktuellen Locale folgt. Rufe es in JSX oder einem Effekt auf, damit das Ergebnis reaktiv ist                                           |
| `preloadDictionaries` | Siehe [unten](#preloaddictionaries)                                                                                                                     |

## Vue

`dialexjs/vue`

| Export                | Signatur                                                    | Beschreibung                                                                                 |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `createDialex`        | `(options?: CreateDialexOptions) => Plugin & DialexContext` | Das Plugin. Optionen: `{ ...dialex }`, `defaultLocale`, `onLocaleChange`                     |
| `useDialex`           | `() => { locale: Ref<string>, setLocale, store }`           | Der Kontext. Wirft, wenn das Plugin nicht installiert ist                                    |
| `useDictionary`       | `<K>(name: K) => ComputedRef<ResolveDictionaryType<K>>`     | Das Wörterbuch als Computed Ref. Mit `lazy` ist es bis zum Laden leer, und SSR wartet darauf |
| `useT`                | `(...dictionaryNames: string[]) => Translate`               | Ein `t`, das der Locale folgt. Lies es in einem Template oder `computed`                     |
| `DIALEX_KEY`          | `InjectionKey<DialexContext>`                               | Der Injection-Key des Kontexts                                                               |
| `preloadDictionaries` | Siehe [unten](#preloaddictionaries)                         | Startet das Laden von Lazy-Wörterbüchern                                                     |

## Nuxt

`dialexjs/nuxt` ist ein Nuxt-Modul: `modules: ["dialexjs/nuxt"]`. Es installiert das Vue-Plugin mit einer Cookie-gestützten Locale aus `dialex.generated.ts` und importiert `useDialex` und `useDictionary` automatisch. Optionen stehen unter dem Schlüssel `dialex` in `nuxt.config.ts`:

| Option       | Typ      | Standard   | Beschreibung                                                                                              |
| ------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `cookieName` | `string` | `"locale"` | Cookie, das die Locale merkt                                                                              |
| `generated`  | `string` | gefunden   | Pfad der generierten Datei ohne Endung. Wird im Quellverzeichnis, im Projektstamm oder in `src/` gefunden |

Die Felder von `DialexConfig` werden ebenfalls akzeptiert. Führe zuerst `dialex generate` aus: Das Modul liest die Datei, die es schreibt.

## Svelte

`dialexjs/svelte`

| Export                                  | Beschreibung                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `provideDialex(source?, options?)`      | Einmal in der Wurzelkomponente mit `{ ...dialex }` aufrufen. Liefert `DialexSvelte` |
| `useDialex()`                           | `{ locale, setLocale, store, dictionary, translator }` des nächsten `provideDialex` |
| `useDictionary(name)`                   | Ein Store: `const home = useDictionary("home")`, dann `$home.title`                 |
| `useT(...names)`                        | Ein Store von `t`: `const t = useT("home")`, dann `$t("home.title")`                |
| `createSvelteDialex(source?, options?)` | Der reaktive Kern ohne Komponentenkontext, für einfache Module und Tests            |
| `preloadDictionaries`                   | Siehe [unten](#preloaddictionaries)                                                 |

`options` sind die gemeinsamen Optionen (`defaultLocale`, `initialLocale`, `persist`, `storageKey`, `onLocaleChange`).

## Qwik

`dialexjs/qwik`

```ts
function createDialexQwik(options?: CreateDialexQwikOptions): {
  useDialexProvider(options?: { initialLocale?: string }): DialexState;
  useDialex(): DialexState;
  setLocale(state: DialexState, locale: string): void;
  useDictionary<K>(name: K): () => ResolveDictionaryType<K>;
  useT(): Translate;
  getPersistedLocale(): string | undefined;
};
```

Rufe `createDialexQwik({ ...dialex })` einmal in einem eigenen Modul auf und importiere die Hooks von dort; die Wörterbücher bleiben dann aus der serialisierten Seite heraus. `DialexState` ist `{ locale: string; loaded: number }`, einfache Daten, die Qwik fortsetzen kann. `persist` und `storageKey` sind die gemeinsamen Optionen; die gespeicherte Locale zurückzulesen ist Sache des Servers (`getPersistedLocale`).

## Lit

`dialexjs/lit`

| Export                   | Beschreibung                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options?)` | Erzeugt den Locale-Zustand: `{ locale, config, store, setLocale, subscribe, getDictionary, t }`. Einmal in einem eigenen Modul erzeugen                       |
| `DialexController`       | Ein reaktiver Controller für jeden `ReactiveControllerHost`: `new DialexController(this, i18n)`. Hat `locale`, `setLocale`, `dictionary(name)`, `t(...names)` |
| `preloadDictionaries`    | Siehe [unten](#preloaddictionaries)                                                                                                                           |

## `dialexjs/react-native`

| Export                                                                         | Beschreibung                                                                                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `DialexProvider`                                                               | Provider für React Native und Expo. Props siehe unten                                                    |
| `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries` | Die Hooks von `dialexjs/react`                                                                           |
| `LocaleStorage`                                                                | `{ getItem(key), setItem(key, value) }`, synchron oder asynchron: AsyncStorage, MMKV oder `localStorage` |

| Prop                                               | Typ                  | Beschreibung                                                                                                               |
| -------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `deviceLocales`                                    | `string \| string[]` | Die Sprachen des Geräts, bevorzugte zuerst (`getLocales()` von `expo-localization`). Die erste unterstützte wird verwendet |
| `initialLocale`                                    | `string`             | Hat Vorrang vor `deviceLocales` und der gespeicherten Locale                                                               |
| `storage`                                          | `LocaleStorage`      | Wo die Wahl gemerkt wird. Kinder werden gerendert, sobald sie gelesen wurde                                                |
| `storageKey`                                       | `string`             | Speicherschlüssel. Standard `"locale"`                                                                                     |
| `defaultLocale`, `onLocaleChange`, `{ ...dialex }` | —                    | Wie bei den gemeinsamen Optionen                                                                                           |

## Angular

`dialexjs/angular`

| Export                     | Beschreibung                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDialex(options)`   | Environment-Provider. `AngularDialexOptions`: `dictionaries` (erforderlich), `config`, `defaultLocale`, `locales`, `fallbacks`, `initialLocale` (ein String oder eine Funktion, die im Injection-Kontext läuft), `persist`, `storageKey` |
| `injectDialex()`           | Der `DialexStore`: `locale` (ein Signal), `setLocale`, `dictionary(name)`, `t`                                                                                                                                                           |
| `injectDictionary(name)`   | Das Wörterbuch als Signal                                                                                                                                                                                                                |
| `injectT()`                | Die Funktion `t`; sie liest bei jedem Aufruf das Locale-Signal, daher bleibt ein Template, das sie nutzt, aktuell                                                                                                                        |
| `DIALEX`, `DIALEX_OPTIONS` | Die Injection-Tokens des Stores und der Optionen                                                                                                                                                                                         |

Rufe die `inject*`-Funktionen in einem Injection-Kontext auf.

## Next.js

| Export                                                         | Beschreibung                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `createDialexMiddleware(options)` (`dialexjs/next/middleware`) | Hält jede Seite unter einem Locale-Präfix. Liefert `(request: NextRequest) => NextResponse`                               |
| `DialexLink` (`dialexjs/next/link`)                            | `next/link`, das die Locale in der URL hält. Braucht `DialexProvider` darüber. Props: die von `next/link`, plus `locale?` |

Optionen von `createDialexMiddleware`: die [Routing-Optionen](./routing.md) (`locales` erforderlich, `defaultLocale`, `prefixDefault`), die Erkennungsoptionen `queryKeys`, `cookieKeys`, `headerKey`, `custom`, `fallbacks` sowie:

| Option       | Typ                             | Standard                        | Beschreibung                                                                 |
| ------------ | ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `cookieName` | `string`                        | `"locale"`                      | Cookie, das die Locale des Besuchers merkt                                   |
| `setCookie`  | `boolean`                       | `true`                          | Das Cookie schreiben, wenn die Locale der URL von der gespeicherten abweicht |
| `ignore`     | `(pathname: string) => boolean` | `/_next`, `/api`, Dateiendungen | Pfade, die die Locale-Behandlung überspringen                                |

## `preloadDictionaries`

```ts
function preloadDictionaries(
  source: DialexSource,
  ...rest: (string | { locale?: string })[]
): Promise<void>;
```

Startet das Laden von Lazy-Wörterbüchern; tut nichts, wenn sie nicht lazy sind. Im Modus `lazy: "locale"` lädt es die Standard-Locale, sofern du nicht zuerst `{ locale }` übergibst.

```ts
await preloadDictionaries(dialex, { locale: "tr" }, "checkout", "cart");
```
