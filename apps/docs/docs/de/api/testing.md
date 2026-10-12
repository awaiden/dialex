# Testen

Helfer für Unit- und Komponententests. Sie brauchen kein Bundler-Plugin, keine Konfigurationsdatei und keine generierte Datei und berühren nie Cookies oder `localStorage`, sodass Tests keinen Zustand aneinander weitergeben. Durchgespielte Beispiele stehen unter [Testen](../guide/testing.md).

## `dialexjs/testing`

### `createTestDialex(options)`

```ts
function createTestDialex(options: TestDialexOptions): TestDialex;
```

| Option          | Typ                        | Standard        | Beschreibung                                                                              |
| --------------- | -------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `dictionaries`  | `DictionaryInput`          | —               | `defineDictionary`-Ergebnisse oder eine Map `{ name: { locale: content } }`. Erforderlich |
| `locale`        | `string`                   | `defaultLocale` | Die aktive Locale                                                                         |
| `defaultLocale` | `string`                   | `"en"`          | Fallback-Locale                                                                           |
| `fallbacks`     | `Record<string, string[]>` | —               | Explizite [Fallback-Ketten](../guide/fallbacks.md)                                        |

Liefert ein `TestDialex`:

| Mitglied              | Beschreibung                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `locale`              | Die aktive Locale                                                         |
| `getDictionary(name)` | Der Inhalt eines Wörterbuchs für die aktive Locale, mit Fallbacks         |
| `t`                   | Eine [`t`-Funktion](./core.md#createt) für die aktive Locale              |
| `withLocale(locale)`  | Ein neuer Kontext über denselben Wörterbüchern unter einer anderen Locale |

```ts
const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });
expect(dialex.t("home.title")).toBe("Hoş Geldiniz");
expect(dialex.withLocale("en").getDictionary("home").title).toBe("Welcome");
```

### `mockRequest(url, options?)`

```ts
function mockRequest(url: string, options?: MockRequestOptions): Request;
```

Baut einen Standard-`Request`, den ein Server-Adapter zu `options.locale` auflöst. Relative URLs werden gegen `http://localhost` aufgelöst.

| Option    | Typ                                         | Standard   | Beschreibung                                                                                                       |
| --------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `locale`  | `string`                                    | —          | Die Locale, zu der sich der Request auflösen soll                                                                  |
| `via`     | `"header" \| "cookie" \| "query" \| "path"` | `"header"` | Wie die Locale übermittelt wird: `Accept-Language`, das Cookie `locale`, `?locale=` oder ein führendes Pfadsegment |
| `headers` | `Record<string, string>`                    | —          | Weitere Request-Header                                                                                             |
| `cookies` | `Record<string, string>`                    | —          | Weitere Cookies                                                                                                    |
| `method`  | `string`                                    | `"GET"`    | HTTP-Methode                                                                                                       |
| `body`    | `BodyInit \| null`                          | —          | Request-Body                                                                                                       |

```ts
const res = await app.request(mockRequest("/dashboard", { locale: "tr", via: "cookie" }));
```

## `dialexjs/testing/react`

### `TestDialexProvider`

```tsx
function TestDialexProvider(props: TestDialexProviderProps): ReactElement;
```

`DialexProvider` für Komponententests: Er rendert `locale` sofort und liest oder schreibt nie Cookies oder `localStorage`. Übergib ihm den generierten Export `dialex` oder eigene `dictionaries`.

| Prop                                | Typ            | Beschreibung                                                        |
| ----------------------------------- | -------------- | ------------------------------------------------------------------- |
| `locale`                            | `string`       | Die Locale zum Rendern. Standard: die konfigurierte Standard-Locale |
| `dictionaries`, `config`, `loaders` | `DialexSource` | Was der Provider liest                                              |
| `children`                          | `ReactNode`    | Die zu testende Komponente                                          |

```tsx
import { dialex } from "../dialex.generated";

render(
  <TestDialexProvider {...dialex} locale="tr">
    <Header />
  </TestDialexProvider>,
);
```

## `dialexjs/testing/vue`

### `createTestDialex(locale?, source?)`

```ts
function createTestDialex(locale?: string, source?: DialexSource): VuePlugin;
```

Ein Vue-Plugin für Komponententests, das in `locale` ohne Persistenz startet. Übergib den generierten Export `dialex` oder eigene `dictionaries` als `source`.

```ts
import { dialex } from "../dialex.generated";

mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
