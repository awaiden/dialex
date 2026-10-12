# İstemci framework'leri

Arayüz framework'leri için adaptörler: etkin yerel ayarı tutan bir provider (ya da eklenti) ve sözlükleri ile `t` fonksiyonunu okuyan hook'lar ya da store'lar. Eksiksiz örnekli rehberler [framework sayfalarındadır](../frameworks/README.md).

## Ortak seçenekler

Provider'ların çoğu üretilen `dialex` nesnesini (`dictionaries`, `config`, `loaders`: `{ ...dialex }`) ve şu seçenekleri alır:

| Seçenek          | Tip                                   | Varsayılan                 | Açıklama                                                                                                                         |
| ---------------- | ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale`  | `string`                              | yapılandırma, sonra `"en"` | Başka bir şey belirlemediğinde kullanılan yerel ayar                                                                             |
| `initialLocale`  | `string`                              | —                          | İlk render edilecek yerel ayar; örneğin sunucunun çözdüğü. Ayarlıysa hatırlanan yerel ayar uygulanmaz                            |
| `persist`        | `"cookie" \| "localStorage" \| false` | `"cookie"`                 | Seçimin nerede hatırlanacağı. Mount sonrası uygulanır; böylece sunucuda render edilen işaretleme ile ilk istemci render'ı uyuşur |
| `storageKey`     | `string`                              | `"locale"`                 | Çerez ya da `localStorage` anahtarı                                                                                              |
| `onLocaleChange` | `(locale: string) => void`            | —                          | Yerel ayar değiştikten sonra çağrılır                                                                                            |

Hook'lar ve store'lar etkin yerel ayarın sözlüğünü [yedek zincirini](../guide/fallbacks.md) izleyerek döndürür. `lazy` yüklemede, bir `t`'nin okuyacağı sözlükleri adlandırın (`useT("home", "nav")`) ki yüklensinler; bileşen onlar geldiğinde güncellenir.

## React

`dialexjs/react`

| Dışa aktarım          | İmza                                           | Açıklama                                                                                                   |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | `(props: DialexProviderProps) => ReactElement` | Yerel ayarı, `setLocale`'i ve sözlükleri sağlar. Prop'lar: ortak seçenekler, `children` ve `{ ...dialex }` |
| `useDialex`           | `() => { locale, setLocale, store }`           | Bağlam. Provider dışında fırlatır                                                                          |
| `useDialexConfig`     | `() => DialexClientConfig`                     | `locales` ya da `prefixDefault` için üretilen yapılandırma                                                 |
| `useDictionary`       | `<K>(name: K) => ResolveDictionaryType<K>`     | Etkin yerel ayarın sözlüğü. `lazy` ile yüklenene kadar askıya alır: `<Suspense>` kullanın                  |
| `useT`                | `(...dictionaryNames: string[]) => Translate`  | Etkin yerel ayara bağlı bir `t`                                                                            |
| `preloadDictionaries` | [aşağıya](#preloaddictionaries) bakın          | Tembel sözlüklerin yüklenmesini başlatır                                                                   |

## Preact

`dialexjs/preact`, React ile aynı dışa aktarımlara sahiptir (`DialexProvider`, `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries`) ve prop'ları `ComponentChildren` kullanır. `lazy` ile sözlük, yüklenene kadar boş bir nesnedir ve bileşen geldiğinde yeniden render olur; askıya almaz. `preact/compat` olmadan çalışır.

## Solid

`dialexjs/solid`

| Dışa aktarım          | Açıklama                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `DialexProvider`      | Prop'lar: ortak seçenekler, `children` ve `{ ...dialex }`                                                                                  |
| `useDialex()`         | `{ locale, setLocale, store, loaded, ensureLoaded }`. `locale` bir accessor'dır: `locale()` olarak okuyun                                  |
| `useDictionary(name)` | Bir accessor: `const home = useDictionary("home")`, sonra `home().title`. Yerel ayar değişince ve tembel bir sözlük yüklenince güncellenir |
| `useT(...names)`      | Geçerli yerel ayarı izleyen bir `t`. Sonucun reaktif olması için JSX'te ya da bir efektte çağırın                                          |
| `preloadDictionaries` | [Aşağıya](#preloaddictionaries) bakın                                                                                                      |

## Vue

`dialexjs/vue`

| Dışa aktarım          | İmza                                                        | Açıklama                                                                            |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `createDialex`        | `(options?: CreateDialexOptions) => Plugin & DialexContext` | Eklenti. Seçenekler: `{ ...dialex }`, `defaultLocale`, `onLocaleChange`             |
| `useDialex`           | `() => { locale: Ref<string>, setLocale, store }`           | Bağlam. Eklenti kurulu değilse fırlatır                                             |
| `useDictionary`       | `<K>(name: K) => ComputedRef<ResolveDictionaryType<K>>`     | Sözlük, hesaplanmış ref olarak. `lazy` ile yüklenene kadar boştur ve SSR onu bekler |
| `useT`                | `(...dictionaryNames: string[]) => Translate`               | Yerel ayarı izleyen bir `t`. Bir şablonda ya da `computed` içinde okuyun            |
| `DIALEX_KEY`          | `InjectionKey<DialexContext>`                               | Bağlamın enjeksiyon anahtarı                                                        |
| `preloadDictionaries` | [Aşağıya](#preloaddictionaries) bakın                       | Tembel sözlüklerin yüklenmesini başlatır                                            |

## Nuxt

`dialexjs/nuxt` bir Nuxt modülüdür: `modules: ["dialexjs/nuxt"]`. `dialex.generated.ts` içinden çerez destekli bir yerel ayarla Vue eklentisini kurar ve `useDialex` ile `useDictionary`'yi otomatik içe aktarır. Seçenekler `nuxt.config.ts` içindeki `dialex` anahtarının altına yazılır:

| Seçenek      | Tip      | Varsayılan | Açıklama                                                                                     |
| ------------ | -------- | ---------- | -------------------------------------------------------------------------------------------- |
| `cookieName` | `string` | `"locale"` | Yerel ayarı hatırlayan çerez                                                                 |
| `generated`  | `string` | bulunur    | Üretilen dosyanın uzantısız yolu. Kaynak dizininde, proje kökünde ya da `src/` içinde aranır |

`DialexConfig` alanlarını da kabul eder. Önce `dialex generate` çalıştırın: modül, yazdığı dosyayı okur.

## Svelte

`dialexjs/svelte`

| Dışa aktarım                            | Açıklama                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `provideDialex(source?, options?)`      | Kök bileşende `{ ...dialex }` ile bir kez çağırın. `DialexSvelte` döndürür                   |
| `useDialex()`                           | En yakın `provideDialex`'in `{ locale, setLocale, store, dictionary, translator }` değerleri |
| `useDictionary(name)`                   | Bir store: `const home = useDictionary("home")`, sonra `$home.title`                         |
| `useT(...names)`                        | `t` store'u: `const t = useT("home")`, sonra `$t("home.title")`                              |
| `createSvelteDialex(source?, options?)` | Bileşen bağlamı olmayan reaktif çekirdek; düz modüller ve testler için                       |
| `preloadDictionaries`                   | [Aşağıya](#preloaddictionaries) bakın                                                        |

`options` ortak seçeneklerdir (`defaultLocale`, `initialLocale`, `persist`, `storageKey`, `onLocaleChange`).

## Qwik

`dialexjs/qwik`

```ts
function createDialexQwik(options?: CreateDialexQwikOptions): {
  useDialexProvider(options?: UseDialexProviderOptions): DialexState;
  useDialex(): DialexState;
  setLocale(state: DialexState, locale: string): void;
  useDictionary<K>(name: K): () => ResolveDictionaryType<K>;
  useT(): Translate;
  getPersistedLocale(): string | undefined;
};
```

`createDialexQwik({ ...dialex })` değerini kendi modülünde bir kez çağırın ve hook'ları oradan içe aktarın; böylece sözlükler serileştirilen sayfanın dışında kalır. `DialexState`, `{ locale: string; loaded: number }` biçimindedir; Qwik'in devam ettirebileceği düz veridir. `persist` ve `storageKey` ortak seçeneklerdir; saklanan yerel ayarı geri okumak sunucuya aittir (`getPersistedLocale`).

## Lit

`dialexjs/lit`

| Dışa aktarım             | Açıklama                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options?)` | Yerel ayar durumunu oluşturur: `{ locale, config, store, setLocale, subscribe, getDictionary, t }`. Kendi modülünde bir kez oluşturun                               |
| `DialexController`       | Herhangi bir `ReactiveControllerHost` için reaktif denetleyici: `new DialexController(this, i18n)`. `locale`, `setLocale`, `dictionary(name)`, `t(...names)` içerir |
| `preloadDictionaries`    | [Aşağıya](#preloaddictionaries) bakın                                                                                                                               |

## `dialexjs/react-native`

| Dışa aktarım                                                                   | Açıklama                                                                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `DialexProvider`                                                               | React Native ve Expo için provider. Prop'lar aşağıdadır                                                     |
| `useDialex`, `useDialexConfig`, `useDictionary`, `useT`, `preloadDictionaries` | `dialexjs/react` hook'ları                                                                                  |
| `LocaleStorage`                                                                | `{ getItem(key), setItem(key, value) }`, eşzamanlı ya da eşzamansız: AsyncStorage, MMKV veya `localStorage` |

| Prop                                               | Tip                  | Açıklama                                                                                                               |
| -------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `deviceLocales`                                    | `string \| string[]` | Cihazın dilleri, en çok tercih edilen önce (`expo-localization`'ın `getLocales()` değeri). Desteklenen ilki kullanılır |
| `initialLocale`                                    | `string`             | `deviceLocales` ve saklanan yerel ayara baskındır                                                                      |
| `storage`                                          | `LocaleStorage`      | Seçimin nerede hatırlanacağı. Çocuklar, okunduktan sonra render edilir                                                 |
| `storageKey`                                       | `string`             | Depolama anahtarı. Varsayılan `"locale"`                                                                               |
| `defaultLocale`, `onLocaleChange`, `{ ...dialex }` | —                    | Ortak seçeneklerdeki gibi                                                                                              |

## Angular

`dialexjs/angular`

| Dışa aktarım               | Açıklama                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDialex(options)`   | Ortam provider'ları. `AngularDialexOptions`: `dictionaries` (zorunlu), `config`, `defaultLocale`, `locales`, `fallbacks`, `initialLocale` (bir dize ya da enjeksiyon bağlamında çalışan bir fonksiyon), `persist`, `storageKey` |
| `injectDialex()`           | `DialexStore`: `locale` (bir signal), `setLocale`, `dictionary(name)`, `t`                                                                                                                                                      |
| `injectDictionary(name)`   | Sözlük, signal olarak                                                                                                                                                                                                           |
| `injectT()`                | `t` fonksiyonu; her çağrıda yerel ayar signal'ini okur, bu yüzden onu kullanan bir şablon güncel kalır                                                                                                                          |
| `DIALEX`, `DIALEX_OPTIONS` | Store'un ve seçeneklerin enjeksiyon belirteçleri                                                                                                                                                                                |

`inject*` fonksiyonlarını bir enjeksiyon bağlamında çağırın.

## Next.js

| Dışa aktarım                                                   | Açıklama                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `createDialexMiddleware(options)` (`dialexjs/next/middleware`) | Her sayfayı bir yerel ayar önekinin altında tutar. `(request: NextRequest) => NextResponse` döndürür                     |
| `DialexLink` (`dialexjs/next/link`)                            | Yerel ayarı URL'de tutan `next/link`. Üstünde `DialexProvider` gerektirir. Prop'lar: `next/link`'inkiler, artı `locale?` |

`createDialexMiddleware` seçenekleri: [yönlendirme seçenekleri](./routing.md) (`locales` zorunlu, `defaultLocale`, `prefixDefault`), algılama seçenekleri `queryKeys`, `cookieKeys`, `headerKey`, `custom`, `fallbacks` ve:

| Seçenek      | Tip                             | Varsayılan                         | Açıklama                                               |
| ------------ | ------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `cookieName` | `string`                        | `"locale"`                         | Ziyaretçinin yerel ayarını hatırlayan çerez            |
| `setCookie`  | `boolean`                       | `true`                             | URL'nin yerel ayarı saklanandan farklıysa çerezi yazar |
| `ignore`     | `(pathname: string) => boolean` | `/_next`, `/api`, dosya uzantıları | Yerel ayar işlemesini atlayan yollar                   |

## Tipler

Seçenek ve prop tipleri ile hangi giriş noktasının onları kullandığı:

| Tip                                                                  | Kullanan                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DialexProviderProps`                                                | `dialexjs/react`, `preact`, `solid` ve `react-native` içindeki `DialexProvider` |
| `DialexContext`                                                      | `dialexjs/react`, `preact`, `solid` ve `vue` içindeki `useDialex()`             |
| `CreateDialexOptions`                                                | `dialexjs/vue` ve `dialexjs/lit` içindeki `createDialex`                        |
| `Dialex`                                                             | `dialexjs/lit` içindeki `createDialex`'in döndürdüğü durum                      |
| `DialexOptions`, `DialexSvelte`                                      | `dialexjs/svelte` içindeki `provideDialex` ve `createSvelteDialex`              |
| `CreateDialexQwikOptions`, `UseDialexProviderOptions`, `DialexState` | `createDialexQwik` ve hook'ları, `dialexjs/qwik`                                |
| `AngularDialexOptions`, `DialexStore`                                | `dialexjs/angular` içindeki `provideDialex` ve `injectDialex`                   |
| `NuxtDialexOptions`                                                  | `dialexjs/nuxt` modül seçenekleri                                               |
| `DialexLinkProps`, `DialexMiddlewareOptions`                         | Next.js'in `DialexLink` ve `createDialexMiddleware`'i                           |
| `LocaleStorage`                                                      | `dialexjs/react-native` içindeki `storage` prop'u                               |

## `preloadDictionaries`

```ts
function preloadDictionaries(
  source: DialexSource,
  ...rest: (string | { locale?: string })[]
): Promise<void>;
```

Tembel sözlüklerin yüklenmesini başlatır; tembel değillerse hiçbir şey yapmaz. `lazy: "locale"` modunda, önce `{ locale }` vermezseniz varsayılan yerel ayarı yükler.

```ts
await preloadDictionaries(dialex, { locale: "tr" }, "checkout", "cart");
```
