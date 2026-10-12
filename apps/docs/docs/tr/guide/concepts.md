# Dialex nasıl çalışır

Dialex çevirilerinizi TypeScript'te tutar, uygulamanız çalışmadan önce onları tek bir üretilen modüle ve tip bildirimlerine dönüştürür ve düz nesne aramalarıyla geri okur. Bu sayfa haritadır: bir kez okuyun, dokümantasyonun geri kalanı yerine oturur.

## Hat

```text
  src/home.content.ts            dialex generate              your app at runtime
  ┌────────────────────┐        ┌──────────────────┐        ┌───────────────────────┐
  │ defineDictionary(  │  ───►  │ dialex.generated │  ───►  │ adapter or provider   │
  │   "home", { en,tr })│        │   .ts            │        │ resolves the locale   │
  └────────────────────┘        │ dialex-env.d.ts  │        │ getDictionary / t()   │
        you write                └──────────────────┘        └───────────────────────┘
                                    CLI, build time              runtime, per request
```

1. **Sözlükleri siz yazarsınız.** Her sözlük için, onu kullanan kodun yanında bir `*.content.ts` dosyası; her biri bir `defineDictionary("name", { en: {...}, tr: {...} })` çağrısıdır. Bkz. [Sözlükler](./dictionaries.md).
2. **`dialex generate` onları derler.** Dosyaları sözdizimi ağacından okur (kodunuzu çalıştırmaz), `dialex.generated.ts` (sözlükler ve yapılandırmanızın istemci için güvenli bir kopyası) ile `dialex-env.d.ts` (tipler) dosyalarını yazar. Bkz. [`dialex generate`](../cli/generate.md).
3. **Bir adaptör yerel ayarı çözer.** Sunucuda URL'ye, sorgu dizesine, çereze ve `Accept-Language`'a bakar; bir arayüz framework'ünde bir provider etkin yerel ayarı tutar. Bkz. [Yerel ayar algılama](./locale-detection.md).
4. **Kodunuz bir sözlüğü okur.** `getDictionary("home").title`, `t("home.title")` ya da bir hook. Bu bir nesne aramasıdır; değer verirseniz ICU biçimlendirmesi eklenir.

Çalışma zamanında hiçbir şey dosya sistemini taramaz ve hiçbir şey iki kez ayrıştırılmaz: ICU mesajları ilk kullanımda bir kez derlenir.

## Her parça nedir

| Parça            | Nedir                                                                                          | Nerede durur                         |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| Sözlük           | Her yerel ayarı içeriğine eşleyen adlandırılmış nesne: dizeler, iç içe nesneler, fonksiyonlar  | `*.content.ts`                       |
| Anahtar yolu     | Bir değerin adresi: `home.nav.about`, `home` sözlüğü ve `nav.about` anahtarıdır                | `t("home.nav.about")` içinde         |
| Yapılandırma     | `defaultLocale`, `locales`, `fallbacks`, `lazy`, `translate`...                                | `dialex.config.ts`                   |
| Üretilen modül   | Sözlükler ve ayarlar, içe aktarılabilir tek bir dosya olarak                                   | `dialex.generated.ts` (düzenlemeyin) |
| Tip bildirimleri | `DictionaryRegistry`'yi genişletir; adlar ve yollar otomatik tamamlanır ve denetlenir          | `dialex-env.d.ts` (düzenlemeyin)     |
| Adaptör          | Framework bağlantısı: yerel ayarı çözer ve size `getDictionary` ile `t` verir                  | `dialexjs/<framework>`               |
| CLI              | `generate`, `check`, `export`, `import`, `translate`, `lock`, `init`                           | `@dialexjs/cli`                      |
| Editör araçları  | `check` ile aynı analizden tanılama, üzerine gelme, tanıma git, tamamlama ve hızlı düzeltmeler | VS Code eklentisi, dil sunucusu, Zed |

## Ne zaman neye karar verilir

| Karar anı           | Ne                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yazarken            | Hangi anahtarların var olduğu ve her birinin tipi                                                                                                    |
| `dialex generate`   | Üretilen modül ve tipler. Bir sözlükteki ya da yapılandırmadaki değişiklik, onu yeniden çalıştırana kadar görülmez                                   |
| `dialex check` (CI) | Her yerel ayarın her anahtara sahip olup olmadığı, ICU mesajlarının geçerli ve tutarlı olup olmadığı, kodun gerçek anahtarlara başvurup başvurmadığı |
| İstek ya da render  | Yerel ayar ve dolayısıyla hangi içeriğin okunacağı; ICU değerleri burada biçimlendirilir                                                             |

Tipler üretilen dosyadan geldiği için **"tipler yanlış" sorununun en yaygın nedeni `dialex generate` çalıştırmayı unutmaktır**. Geliştirirken `dialex generate --watch` çalıştırın, editör eklentisini kullanın (kaydedince yeniden üretir) ve dosya eskidiğinde `dialex check`'in CI'ı başarısız kılmasına izin verin.

## Bir mesajı söylemenin üç yolu

| Biçim      | Örnek                                                    | Ne için kullanılır                                                                     |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Düz dize   | `title: "Welcome"`                                       | Değersiz metin                                                                         |
| ICU dizesi | `items: "{count, plural, one {# item} other {# items}}"` | Değerler, çoğullar, select'ler, sayılar ve tarihler; çevirmenlerin araçlarıyla çalışır |
| Fonksiyon  | `` greeting: (name: string) => `Hello, ${name}!` ``      | `plural()` ve diğer [biçimlendiriciler](../api/formatting.md) dahil tam TypeScript     |

Üçü de aynı sözlükte bulunabilir. Bkz. [ICU mesajları](./icu.md) ve [Biçimlendirme ve çoğullar](./formatting.md).

## Sonra nereye

- Bir proje başlatın: [Başlarken](./getting-started.md), ardından [framework'ünüz](../frameworks/README.md).
- Bir şeye bakın: [API başvurusu](../api/README.md) ve [CLI başvurusu](../cli/README.md).
- Bir şey çalışmıyor: [Sorun giderme](./troubleshooting.md).
