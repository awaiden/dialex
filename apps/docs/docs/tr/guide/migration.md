# Dialex'e geçiş

i18next, react-intl (FormatJS), next-intl ya da vue-i18n'den nasıl geçilir. Fikirler büyük ölçüde örtüşür; değişen, mesajların nerede durduğu (JSON değil TypeScript dosyaları) ve onları nasıl çağırdığınızdır (önce sözlük adı gelen tek bir `t`).

## Plan

1. `dialexjs` ve `@dialexjs/cli` paketlerini **kurun** ve `dialex init` çalıştırın ([Başlarken](./getting-started.md)).
2. **Ad alanı ya da özellik başına bir sözlük oluşturun**; her yerel ayar için boş bir nesneyle:

   ```ts
   // src/home.content.ts
   import { defineDictionary } from "dialexjs";

   export default defineDictionary("home", { en: {}, tr: {} });
   ```

3. JSON'unuzu, anahtarları sözlük adıyla öneklenmiş şekilde yerel ayar başına bir dosyaya **düzleştirin**, sonra **içe aktarın**:

   ```json
   { "home.title": "Welcome", "home.nav.about": "About" }
   ```

   ```bash
   dialex import en.json --allow-new
   dialex import tr.json --allow-new
   ```

   `--allow-new`, henüz hiçbir yerel ayarda olmayan anahtarları ekler. [`dialex import`](../cli/import.md) ICU mesajlarını doğrular ve reddettiklerini listeler.

4. Sözlüklerde **mesaj sözdizimini dönüştürün** (sonraki bölüm).
5. Kodunuzdaki **çağrıları değiştirin**, her seferinde bir framework.
6. **`dialex generate` ve `dialex check` çalıştırın.** Eksik anahtarlar, uyuşmayan argümanlar ve var olmayan anahtarlara yapılan çağrılar hemen görünür.

## Mesaj sözdizimi

Dialex mesajları [ICU MessageFormat](./icu.md)'tır. Mesajlarınız zaten ICU ise kopyalayın.

| Elinizdeki                                                      | Dialex'te yazın                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| i18next `Hello {{name}}`                                        | `Hello {name}`                                                                                                                  |
| `{{count}}` ile i18next `key_one` / `key_other`                 | `{count, plural, one {# item} other {# items}}`                                                                                 |
| i18next bağlamı `key_male` / `key_female`                       | `{gender, select, male {...} female {...} other {...}}`                                                                         |
| i18next iç içe geçme `$t(other.key)`                            | Karşılığı yok. Metni tekrarlayın ya da `t` çağıran bir fonksiyon mesajı kullanın                                                |
| i18next biçimlendirme `{{val, number}}`                         | `{val, number}`; tarihler `{when, date, medium}`                                                                                |
| vue-i18n `{name}`                                               | Aynısı                                                                                                                          |
| vue-i18n boru çizgileri `no items \| one item \| {count} items` | `{count, plural, =0 {no items} one {one item} other {# items}}`                                                                 |
| vue-i18n bağlantılı `@:other.key`                               | Karşılığı yok. Metni tekrarlayın                                                                                                |
| react-intl ve next-intl ICU dizeleri                            | Aynısı, olduğu gibi kopyalayın                                                                                                  |
| Zengin metin etiketleri `<b>...</b>`                            | **Desteklenmez**: etiketler ayrıştırılmaz. Mesajı işaretlemenin çevresinden bölün ya da JSX döndüren bir fonksiyon mesajı yazın |

## i18next'ten

| i18next                                | Dialex                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `locales/<lng>/<ns>.json`              | `src/<ns>.content.ts`: `defineDictionary("<ns>", { en: {...}, tr: {...} })` |
| `useTranslation("home")`, `t("title")` | `useT("home")`, `t("home.title")`: sözlük adı yolun parçasıdır              |
| `i18n.changeLanguage("tr")`            | `useDialex()`'ten `setLocale("tr")`                                         |
| `i18n.language`                        | `useDialex()`'ten `locale`                                                  |
| `fallbackLng`                          | `dialex.config.ts` içinde `defaultLocale` ve `fallbacks`                    |
| `supportedLngs`                        | `locales`                                                                   |
| Dil algılayıcı eklentisi               | Sunucu adaptörleri ya da provider'ın `initialLocale` ve `persist` ayarları  |
| Tembel yüklenen backend'ler            | `lazy: true` ya da `"locale"`; bkz. [Tembel yükleme](./lazy-loading.md)     |

```tsx
// before
const { t } = useTranslation("home");
return <p>{t("items", { count })}</p>;

// after
const t = useT("home");
return <p>{t("home.items", { count })}</p>;
```

## react-intl'den (FormatJS)

| react-intl                                                            | Dialex                                                                             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Mesaj kataloğu `{ "home.title": "..." }`                              | Aynı düz anahtarlar: `dialex import` bunları olduğu gibi alır (`home` sözlük olur) |
| `<IntlProvider locale messages>`                                      | `<DialexProvider {...dialex}>`                                                     |
| `intl.formatMessage({ id }, values)`, `<FormattedMessage>`            | `t("home.title", values)`                                                          |
| `defineMessages`, mesaj çıkarma                                       | Gerekmez: anahtarlar sözlükte durur ve `dialex check` bilinmeyenleri bulur         |
| `intl.formatNumber`, `formatDate`, `formatRelativeTime`, `formatList` | `dialexjs`'ten `number`, `date`, `relativeTime`, `list`; ilk argüman yerel ayardır |
| `intl.locale`                                                         | `useDialex()`'ten `locale`                                                         |

```tsx
// before
<FormattedMessage id="home.items" values={{ count }} />;

// after
{
  t("home.items", { count });
}
```

## next-intl'den

| next-intl                                | Dialex                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `messages/<locale>.json`                 | `*.content.ts` sözlükleri (JSON'u düzleştirin ve `dialex import` ile içe aktarın) |
| `useTranslations("home")`, `t("title")`  | `useT("home")`, `t("home.title")`                                                 |
| Server Component'lerde `getTranslations` | `createDialexServer(dialex)`'ten `getT(locale)`                                   |
| `createMiddleware(routing)`              | `createDialexMiddleware({ locales, defaultLocale })`                              |
| `createNavigation`'dan `Link`            | `DialexLink`                                                                      |
| `t.rich(...)`                            | Desteklenmez. JSX döndüren bir fonksiyon mesajı kullanın                          |
| `NextIntlClientProvider`                 | `DialexProvider {...dialex}`                                                      |

Eksiksiz kurulum için [Next.js](../frameworks/nextjs.md) sayfasına bakın.

## vue-i18n'den

| vue-i18n                                  | Dialex                                                          |
| ----------------------------------------- | --------------------------------------------------------------- |
| `createI18n({ locale, messages })`        | `createDialex({ ...dialex })` ve `app.use(...)`                 |
| `useI18n()`, `t("home.title")`, `$t(...)` | `useT("home")` ve `t("home.title")`                             |
| `locale.value = "tr"`                     | `useDialex()`'ten `setLocale("tr")`                             |
| `fallbackLocale`                          | `defaultLocale` ve `fallbacks`                                  |
| Çoğullar için mesaj boruları              | ICU `plural`                                                    |
| Nuxt `@nuxtjs/i18n`                       | `dialexjs/nuxt` modülü; bkz. [Vue / Nuxt](../frameworks/vue.md) |

## Dialex'te olmayanlar

Başlamadan önce bunları denetleyin; her birinin yukarıda bir geçici çözümü var.

- Mesajlarda zengin metin etiketleri (`<b>`, `t.rich`): işaretleme döndüren fonksiyon mesajları kullanın.
- İç içe ya da bağlantılı mesajlar (`$t(...)`, `@:key`): metni tekrarlayın.
- Ayrı bir kavram olarak ad alanları: sözlük, ad alanıdır.
- Çevirileri çalışma zamanında bir sunucudan yükleme: çeviriler uygulamayla birlikte gönderilir (bkz. [SSS](./faq.md)).
- Sahte yerelleştirme ve koddan otomatik anahtar çıkarma: anahtarlar sözlüklerde durur; `dialex check` bunları kodunuza karşı doğrular.

## İşiniz bittiğinde

- [ ] `dialex check` `0` ile çıkıyor
- [ ] `dialex check` CI'da çalışıyor; böylece üretilen dosyalar ve eşitlik doğru kalıyor
- [ ] Eski i18n paketleri ve JSON dosyaları kaldırıldı
- [ ] Editörlerde, `t("...")` üzerinde üzerine gelme ve tanıma gitme sağlayan [Dialex eklentisi](./vscode.md) var
