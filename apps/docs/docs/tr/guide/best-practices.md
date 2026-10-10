# En iyi uygulamalar

Bu öneriler her çerçeve için geçerlidir. Her biri Dialex'in nasıl çalıştığından çıkar: sözlükler `dialex.generated.ts` içine derlenir, yerel ayar istek veya uygulama başına bir kez çözülür ve tipler sözlüklerinizden gelir.

## Sözlükleri düzenleyin

- Her özellik veya sayfa için bir sözlük tutun ve onu kullanan kodun yanına koyun (ödeme sayfasının yanında `checkout.content.ts`). Küçük dosyaların incelenmesi, çevrilmesi ve tembel yüklenmesi kolaydır.
- Uygulama genelinde paylaşılan metni bir `common` sözlüğüne koyun ve geri kalan her şeyi dışarıda tutun; böylece her şeyin atıldığı bir yer olmaz.
- Her sözlüğe aynı yerel ayarları verin. `dx check` eksik anahtarları ve yerel ayarları bildirir, editör eklentileri bunları siz yazarken gösterir.

## Anahtarları anlamına göre adlandırın

Bir anahtar metnin ne işe yaradığını söyler, şu an ne yazdığını değil. İfade değiştiğinde anahtar ve tüm çağrı yerleri aynı kalır.

```ts
// Good: the key describes the role
defineDictionary("checkout", {
  en: { payButton: "Pay now", emptyCart: "Your cart is empty" },
  tr: { payButton: "Şimdi öde", emptyCart: "Sepetiniz boş" },
});

// Avoid: the key repeats the English text, and breaks when the text changes
defineDictionary("checkout", {
  en: { payNow: "Pay now", yourCartIsEmpty: "Your cart is empty" },
});
```

İlişkili anahtarları bir nesne altında toplayın (`nav.about`, `nav.contact`) ve iç içe geçmeyi sığ tutun, iki veya üç düzey. Daha derin ağaçlar `t("...")` çağrılarında okunması zordur.

## Çevirmenlerin tamamlayabileceği mesajlar yazın

- Çoğullar, seçimler ve sayılar için [ICU mesajları](./icu.md) kullanın: `{count, plural, one {# item} other {# items}}`. Bir cümleyi asla parçalardan kurmayın (`"You have " + n + " items"`), çünkü sözcük sırası ve çoğul biçimleri diller arasında farklıdır.
- Çevirmenlere giden metin için fonksiyon değerleri yerine ICU dizelerini tercih edin. Yalnızca geliştiricilerin dokunduğu mantık için fonksiyonlar iyidir, ancak çeviri araçları ve `dx check` bir ICU dizesini doğrulayabilir, bir fonksiyonun içine bakamaz.
- Yer tutucuları her yerel ayarda aynı tutun. `dx check`, bağımsız değişkenleri diğerlerinden farklı olan bir yerel ayarı bildirir.

```ts
defineDictionary("cart", {
  en: { items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}" },
  tr: { items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}" },
});

t("cart.items", { count: 3 }); // "3 items"; `count` is checked at compile time
```

## Üretilen dosyayı güncel tutun

- `dialex.generated.ts` ve `dialex-env.d.ts` dosyalarını commit edin. Uygulama bunları içe aktarır ve temiz bir checkout üretim adımı olmadan derlenmelidir.
- Geliştirirken `dx generate --watch` ile güncel tutun veya bir sözlük değiştiğinde dosyayı sizin için yeniden üreten VS Code ya da Zed eklentisini kullanın.
- CI'da `dx check --fail-on-stale` çalıştırın. Commit edilmiş üretilen dosya artık sözlüklerle eşleşmediğinde, anahtarlar veya yerel ayarlar eksik olduğunda ve çeviriler eskidiğinde başarısız olur.

```yaml
# .github/workflows/ci.yml
- run: bun install --frozen-lockfile
- run: bunx dx check --fail-on-stale
```

## Yerel ayarı tek bir yerde çözün

- Yerel ayarı istek başına bir kez (sunucuda) veya uygulama başına bir kez (tarayıcıda) belirleyin ve aşağıya aktarın. Çerezleri veya `navigator.language` değerini tek tek bileşenlerde okumayın.
- Sunucu tarafı oluşturmada, ilk istemci oluşturması HTML ile eşleşsin diye istemciye sunucunun kullandığı yerel ayarı verin (`initialLocale`). Aksi halde sayfa yanlış dilde yanıp söner veya hidrasyon uyuşmazlık bildirir.
- `<html lang>` değerini etkin yerel ayara ayarlayın. React, Svelte ve Solid sağlayıcıları bunu sizin için yapar; sunucuda oluşturduğunuz HTML'e kendiniz yazın.
- Ziyaretçinin seçimini sunucunun göremediği `localStorage` yerine sunucu adaptörlerinin okuduğu `locale` çerezinde saklayın.

## Yalnızca bir sayfanın ihtiyacı olanı yükleyin

- Küçük uygulamalar tembel yüklemeye ihtiyaç duymaz: tüm sözlükleri tek pakette tutmak en basit ve en hızlısıdır. Sözlükler paketin gözle görülür bir parçası olduğunda açın.
- `lazy: "locale"` ile bir ziyaretçi yalnızca açtığı sayfanın sözlüklerini, kullandığı dilde indirir. [Tembel yükleme](./lazy-loading.md) sayfasına bakın.
- Bir sonraki gezinmenin ihtiyaç duyduğunu önceden yükleyin (`preloadDictionaries(dialex, "checkout")`); böylece sayfa bir indirmeyi beklemez.

## İnceleme adımıyla çevirin

- `dx translate` eksik anahtarları `[TODO]` yer tutucularıyla veya makine çevirileriyle doldurur. Çıktısına diğer değişiklikler gibi davranın: birleştirmeden önce farkı inceleyin.
- `dialex.lock.json` dosyasını commit edin. Her çevirinin hangi kaynak metinden yapıldığını kaydeder; böylece `dx check` ve `dx translate --stale` İngilizcenin değiştiğini ve çevirinin değişmediğini anlayabilir.
- Bir sürümden önce `[TODO]` arayın. `dx check` hâlâ duran her yer tutucuyu bildirir.

## Gerçek sözlüklerle test edin

- Bileşenleri uygulamanın kullandığı aynı `dialex` dışa aktarımıyla oluşturun ve bir yerel ayarın metnini doğrulayın. [Test](./testing.md) sayfasında React ve Vue için sarmalayıcılar var.
- En az varsayılan yerel ayarı ve bir tane daha test edin; böylece eksik bir anahtar veya bir çoğul biçimi üretimde değil, test çalıştırmasında ortaya çıkar.

## Editörünüzle çalışın

- [VS Code eklentisini](./vscode.md) kurun veya dil sunucusu üzerinden [Zed ve diğer editörleri](./zed.md) kullanın. Anahtarlar için tanılamalar, hover, tanıma git, tamamlama ve hızlı düzeltmeler alırsınız.
- Bir sözlüğü bir değişkende tutun (`const home = useDictionary("home")`); editör `home.title` ifadesini yine çözer.
- Üretilen dosyaları ve derleme çıktısını taramanın dışında tutun: Dialex `.gitignore` dosyasını zaten dikkate alır, geri kalanı `dialex.config.ts` içindeki `exclude` kapsar.

## Kontrol listesi

| Yayınlamadan önce                          | Komut veya ayar                            |
| ------------------------------------------ | ------------------------------------------ |
| Sözlükler ve üretilen dosya uyuşuyor       | `dx check --fail-on-stale`                 |
| Eksik anahtar veya yerel ayar yok          | `dx check`                                 |
| Kalan yer tutucu yok                       | `[TODO]`                                   |
| Çeviriler kaynak metinle eşleşiyor         | `dx translate --stale`, `dialex.lock.json` |
| `<html lang>` yerel ayarı izliyor          | sağlayıcı veya sunucu işaretlemesi         |
| Paket yalnızca gerekli sözlükleri içeriyor | `lazy: "locale"`                           |
