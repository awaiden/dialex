# Test

Birim ve bileşen testleri için yardımcılar. Bundler eklentisine, yapılandırma dosyasına ya da üretilen dosyaya ihtiyaç duymazlar ve çerezlere ya da `localStorage`'a hiç dokunmazlar; bu yüzden testler birbirine durum sızdırmaz. Uygulamalı örnekler için [Test](../guide/testing.md) sayfasına bakın.

## `dialexjs/testing`

### `createTestDialex(options)`

```ts
function createTestDialex(options: TestDialexOptions): TestDialex;
```

| Seçenek         | Tip                        | Varsayılan      | Açıklama                                                                             |
| --------------- | -------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `dictionaries`  | `DictionaryInput`          | —               | `defineDictionary` sonuçları ya da `{ name: { locale: content } }` haritası. Zorunlu |
| `locale`        | `string`                   | `defaultLocale` | Etkin yerel ayar                                                                     |
| `defaultLocale` | `string`                   | `"en"`          | Yedek yerel ayar                                                                     |
| `fallbacks`     | `Record<string, string[]>` | —               | Açık [yedek zincirleri](../guide/fallbacks.md)                                       |

Bir `TestDialex` döndürür:

| Üye                   | Açıklama                                                        |
| --------------------- | --------------------------------------------------------------- |
| `locale`              | Etkin yerel ayar                                                |
| `getDictionary(name)` | Bir sözlüğün etkin yerel ayar için, yedeklerle birlikte içeriği |
| `t`                   | Etkin yerel ayar için bir [`t` fonksiyonu](./core.md#createt)   |
| `withLocale(locale)`  | Aynı sözlükler üzerinde başka bir yerel ayarla yeni bir bağlam  |

```ts
const dialex = createTestDialex({ dictionaries: [home], locale: "tr" });
expect(dialex.t("home.title")).toBe("Hoş Geldiniz");
expect(dialex.withLocale("en").getDictionary("home").title).toBe("Welcome");
```

### `mockRequest(url, options?)`

```ts
function mockRequest(url: string, options?: MockRequestOptions): Request;
```

Bir sunucu adaptörünün `options.locale` değerine çözümleyeceği standart bir `Request` oluşturur. Göreli URL'ler `http://localhost` temel alınarak çözülür.

| Seçenek   | Tip                                         | Varsayılan | Açıklama                                                                                               |
| --------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `locale`  | `string`                                    | —          | İsteğin çözümlenmesi gereken yerel ayar                                                                |
| `via`     | `"header" \| "cookie" \| "query" \| "path"` | `"header"` | Yerel ayarın nasıl iletildiği: `Accept-Language`, `locale` çerezi, `?locale=` ya da baştaki yol bölümü |
| `headers` | `Record<string, string>`                    | —          | Ek istek başlıkları                                                                                    |
| `cookies` | `Record<string, string>`                    | —          | Ek çerezler                                                                                            |
| `method`  | `string`                                    | `"GET"`    | HTTP yöntemi                                                                                           |
| `body`    | `BodyInit \| null`                          | —          | İstek gövdesi                                                                                          |

```ts
const res = await app.request(mockRequest("/dashboard", { locale: "tr", via: "cookie" }));
```

## `dialexjs/testing/react`

### `TestDialexProvider`

```tsx
function TestDialexProvider(props: TestDialexProviderProps): ReactElement;
```

Bileşen testleri için `DialexProvider`: `locale` değerini hemen render eder ve çerezleri ya da `localStorage`'ı asla okumaz veya yazmaz. Ona üretilen `dialex` dışa aktarımını ya da kendi `dictionaries` değerlerinizi verin.

| Prop                                | Tip            | Açıklama                                                           |
| ----------------------------------- | -------------- | ------------------------------------------------------------------ |
| `locale`                            | `string`       | Render edilecek yerel ayar. Varsayılan: yapılandırılmış varsayılan |
| `dictionaries`, `config`, `loaders` | `DialexSource` | Provider'ın okuduğu şey                                            |
| `children`                          | `ReactNode`    | Test edilen bileşen                                                |

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

Bileşen testleri için, `locale` ile kalıcılık olmadan başlayan bir Vue eklentisi. `source` olarak üretilen `dialex` dışa aktarımını ya da kendi `dictionaries` değerlerinizi verin.

```ts
import { dialex } from "../dialex.generated";

mount(Header, { global: { plugins: [createTestDialex("tr", dialex)] } });
```
