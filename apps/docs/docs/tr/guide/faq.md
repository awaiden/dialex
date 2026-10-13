# SSS

Kısa yanıtlar; ayrıntının olduğu sayfaya bağlantılarla.

## Tasarım

### Sözlükler neden JSON değil de TypeScript dosyaları?

Derleyici onları denetleyebilsin diye. Bir sözlük koddur: anahtarları tiplidir, bir değer tipli parametrelere sahip bir fonksiyon olabilir ve editörler `t("home.title")` ifadesinden tanıma atlayabilir. JSON uçlarda kullanılabilir kalır: [`dialex export`](../cli/export.md) çevirmenler için JSON, CSV ya da XLIFF yazar ve [`dialex import`](../cli/import.md) onların işini TypeScript dosyalarına geri yazar.

### Çevirileri çalışma zamanında bir API'den ya da veritabanından yükleyebilir miyim?

Dialex, uygulamayla birlikte gönderilen çeviriler için tasarlanmıştır. Sözlük herhangi bir nesnedir; birini kendiniz doldurup bir adaptöre ya da provider'a `dictionaries` olarak verebilirsiniz, ama o zaman tipli, denetlenen ya da sizin için üretilen bir şey olmaz. Dağıtım olmadan değişen içerik için CMS'inizi kullanın, arayüz dizelerini Dialex'te tutun.

### Çalışma zamanı ne kadar büyük?

ICU ayrıştırıcısı ve biçimlendiricisiyle `t()` fonksiyonu küçültülmüş yaklaşık 8 KB'tır (3 KB gzip); yalnızca `dialexjs/icu` yaklaşık 7 KB. Framework adaptörleri bunun üzerine küçüktür. Ölçülen rakamlar ve diğer kütüphanelerle karşılaştırma için [Kıyaslamalar](./benchmarks.md) sayfasına bakın.

### Sunucu tarafı render ile çalışır mı?

Evet. Sunucu adaptörleri yerel ayarı istek başına çözer ve arayüz provider'ları, ilk istemci render'ı sunucununkiyle eşleşsin diye `initialLocale` alır. Hatırlanan yerel ayar, hidrasyon asla uyuşmazlık göstermesin diye kasıtlı olarak mount sonrası uygulanır. [Framework sayfanıza](../frameworks/README.md) bakın.

## Yerel ayarlar

### Bir dil nasıl eklerim?

1. `dialex.config.ts` içindeki `locales`'e ekleyin.
2. `dialex check --fix` çalıştırın: her sözlük, varsayılan yerel ayardan kopyalanmış ve `[TODO]` ile işaretlenmiş eksik anahtarları alır.
3. Çevirin: elle, [`dialex translate`](../cli/translate.md) ve bir provider ile ya da [`export`/`import`](../cli/export.md) üzerinden.
4. `dialex generate` ve `dialex check` çalıştırın.

### Dialex dili tarayıcıdan seçer mi?

Sunucuda evet: adaptörler `Accept-Language`, URL, sorgu dizesi ve çerezleri bu [sırayla](./locale-detection.md) okur. Tarayıcıda provider'lar `navigator.language` değerini okumaz: sunucunun çözdüğü yerel ayarı ve kullanıcının seçimini (çerezde ya da `localStorage`'da tutulur) kullanırlar. React Native cihaz dillerini `deviceLocales` ile alır.

### Bir çeviri eksik olduğunda ne olur?

Arama [yedek zincirini](./fallbacks.md) izler: yerel ayarın kendisi, açık `fallbacks`, bölgesiz dil (`pt-BR`'den `pt`'ye), sonra varsayılan yerel ayar. Hiçbirinde anahtar yoksa `t()` uyarır ve yolu döndürür. `dialex check` eksik anahtarları bildirir; böylece üretime ulaşmazlar.

### Sağdan sola yazılan dilleri destekler mi?

Dialex metni çevirir ve sayıları ile tarihleri biçimlendirir; metin yönünü ayarlamaz. Provider'lar `<html lang>` değerini yerel ayarla eşzamanlı tutar. `dir` değerini yerel ayardan kendiniz türetin; örneğin `dir={["ar", "he", "fa"].includes(locale) ? "rtl" : "ltr"}`.

### Çok biçimli dillerde çoğullar nasıl çalışır?

Mesajlar, yerel ayarın CLDR kurallarıyla, `Intl.PluralRules` üzerinden ICU `plural` ve `selectordinal` kullanır. Rusça `one`, `few`, `many` ve `other` ister; Arapçanın altı kategorisi vardır. Bir mesajda dilinin ihtiyaç duyduğu bir kategori eksikse `dialex check` uyarır. Bkz. [ICU mesajları](./icu.md).

## İş akışı

### `dialex generate` komutunu sürekli çalıştırmam gerekir mi?

Geliştirirken `dialex generate --watch` çalıştırın ya da kaydedince yeniden üreten [VS Code eklentisini](./vscode.md) kullanın. CI'da `dialex check` çalıştırın: üretilen dosyalar eskimişse başarısız olur.

### Üretilen dosyaları nereye commit etmeliyim?

İkisi de olur. Commit etmek, taze bir klonun derleme adımı olmadan tip denetiminden geçmesi demektir; yok saymak, her kurulumun `dialex generate` çalıştırması gerektiği demektir. `dialex check`, üretilen dosyaları `generate`'in yazacağıyla karşılaştırır; commit ederseniz CI onları doğru tutar.

### Çevirmenler bununla nasıl çalışır?

Onlara [`dialex export`](../cli/export.md) çıktısını (JSON, CSV ya da XLIFF) verin; TypeScript'i hiç görmezler. İşlerini, ICU mesajlarını doğrulayan ve bilinmeyen anahtarları reddeden [`dialex import`](../cli/import.md) ile geri alın. Ya da bir provider'ın [`dialex translate`](../cli/translate.md) ile çevirmesine izin verin ve bir kaynak metin sonradan değiştiğinde fark etmek için `dialex lock` kullanın.

### `dialex translate` kodumu bir yere gönderir mi?

Hayır. Bir provider yapılandırmadıkça hiçbir şey gönderilmez; yapılandırdığınızda da yalnızca çevrilecek dizeler (kodunuz değil) bu provider'a gruplar halinde gider. `dialex translate --dry-run` nelerin gönderileceğini listeler.

### Monorepo'da kullanabilir miyim?

Evet. Bir `dialex.config.*` dosyası olan (ya da yalnızca `*.content.ts` dosyaları olan) her paket bir projedir. CLI çalıştırıldığı klasörden çalışır; editör araçları çalışma alanındaki her projeyi bulur ve iç içe projeleri birbirinden ayırır. Deponun `.gitignore` dosyalarına uyulur.

## Araçlar

### Editör sözlüklerimden birini neden atlıyor?

Kod çalıştırmadan okuyamaz: spread, hesaplanan anahtar, içe aktarılan değer ya da hesaplanan ad kullanıyor. Sabit nesneler kullanın ya da o dosya için denetimin (dosyayı değerlendiren) `dialex check` olduğunu kabul edin. Bkz. [Sözlükler](./dictionaries.md#what-the-tools-can-read).

### "1.0 öncesi" benim için ne anlama gelir?

API minor sürümler arasında değişebilir. Uyumsuz değişiklikler bir minor sürümle gelir, [değişiklik günlüğünde](./changelog.md) listelenir ve patch sürümleri uyumlu kalır. Kullandığınız minor sürümü sabitleyin.
