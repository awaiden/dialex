# Sorun giderme

Belirtiyi bulun, nedenini okuyun, çözümü uygulayın. Tek bir framework'e özgü sorunlar o framework'ün sayfasındadır; geri kalanı burada. Bir `check` iletisinin ne anlama geldiği için [tanılama başvurusuna](./diagnostics.md) bakın.

## Tipler ve üretilen dosyalar

### `t("home.title")` ya da `getDictionary("home")` otomatik tamamlanmıyor veya tipli değil

Tipler, `dialex generate`'in yazdığı `dialex-env.d.ts` dosyasından gelir. Sırayla denetleyin:

1. Dosya var: `dialex generate` çalıştırın.
2. TypeScript onu içeriyor. `tsconfig.json` içindeki `include`'a onu (ya da klasörünü) ekleyin ve editörde TypeScript sunucusunu yeniden başlatın.
3. `moduleResolution` değeri `"bundler"`, `"node16"` ya da `"nodenext"` (bkz. [Gereksinimler](./requirements.md)).
4. Üretilen dosya güncel: `dialex generate --watch` çalıştırın ya da kaydedince yeniden üreten editör eklentisini kullanın.

### Bir sözlüğü değiştirdim ve tipler güncellenmedi

Üretilen dosyaları sizin için hiçbir şey yeniden oluşturmaz. `dialex generate` çalıştırın, `dialex generate --watch` açık tutun ya da [VS Code eklentisini](./vscode.md) kullanın. `dialex check` eskimiş bir dosyayı hata olarak bildirir; böylece bir CI çalışması onu yakalar.

### `Cannot find module 'dialexjs/react'` (ya da başka bir alt yol)

`moduleResolution` değeri `"node"` (`node10` da denir) ve paketin `exports` haritasını okumaz. Bunu `"bundler"` ya da `"nodenext"` yapın.

### `dialex check` üretilen dosyanın eski olduğunu söylüyor ama ben yeni ürettim

Bir biçimlendirici (Prettier, Biome, oxfmt) dosyayı yeniden yazmış olabilir. `check` boşlukları, tırnakları ve sondaki virgülleri yok sayar; bu yüzden tek başına biçimlendirme buna yol açmaz: farklı bir `locales` ya da `include`, son çalıştırmadan sonra değişen bir sözlük ya da `check` varsayılan yola bakarken `-o` ile çalıştırılan bir `dialex generate` arayın. Gürültülü diff'lerden kaçınmak için üretilen dosyaları biçimlendiricinizin yok sayma listesine ekleyin.

## Yerel ayarlar ve sözlükler

### `[dialex] Dictionary "x" not found`

Sözlük `dialex.generated.ts` içinde değil. Dosyasının `include` ile eşleştiğini (varsayılan `**/*.content.ts`), `.gitignore` ya da `exclude` ile dışlanmadığını, `export default defineDictionary("x", ...)` kullandığını ve adın tam eşleştiğini denetleyin. Sonra `dialex generate` çalıştırın.

### `[dialex] Locale "tr" not found in dictionary "x", using "en"`

Sözlükte `tr` içeriği yok; bu yüzden [yedek zinciri](./fallbacks.md) kullanıldı. Yerel ayarı ekleyin ya da eksik anahtarları oluşturmak için `dialex check --fix` çalıştırın.

### Uygulama her zaman varsayılan yerel ayarı render ediyor

Hiçbir kaynak desteklenen bir yerel ayar üretmedi. Algılama sırası: özel çıkarıcı, ilk URL bölümü, `?locale=` / `?lang=`, `locale` / `lang` çerezi, sonra `Accept-Language`. Denetleyin: `locales` ayarlı (olmazsa `/tr` gibi bir yol öneki yok sayılır), istemci çerezi ya da başlığı gerçekten gönderiyor ve adaptör rotalardan önce kayıtlı. Bkz. [Yerel ayar algılama](./locale-detection.md).

### Yerel ayar istemcide değişiyor ama sunucu başka birini render ediyor

Sunucu ve istemci yerel ayarı ayrı çözer. İlk istemci render'ı eşleşsin diye, sunucunun render ettiği yerel ayarı provider'a `initialLocale` olarak verin. Hatırlanan yerel ayar, hidrasyon uyuşsun diye kasıtlı olarak mount sonrası uygulanır.

### `useDialex must be used within a DialexProvider`

Bileşen provider'ın dışında render ediliyor. `<DialexProvider {...dialex}>` bileşenini kökte, bir hook kullanan her bileşenin üstüne koyun ve hook'ları provider ile aynı giriş noktasından içe aktarın.

### Sözlük ilk render'da boş

`lazy` yükleme kullanıyorsunuz; bu yüzden bir sözlük yüklenene kadar boştur (React'te askıya alır). Okuduğunuz sözlükleri adlandırın (`useT("home")`), React'i `<Suspense>` ile sarın ya da render etmeden önce [`preloadDictionaries`](../api/client-frameworks.md#preloaddictionaries) çağırın. Bkz. [Tembel yükleme](./lazy-loading.md).

## Mesajlar

### `t("cart.items", { count })` ham mesajı döndürüyor

Ya dize ayrıştırılamadı (konsol `[dialex] Could not format ...` gösterir) ya da değer nesnesi verilmedi: değersiz bir dize olduğu gibi döndürülür. Tam ICU hatası için `dialex check` çalıştırın.

### Düz süslü parantezler ya da kesme işaretleri yanlış görünüyor

ICU'da `{` ve `}` argümanları açıp kapatır, `'` ise onları tırnak içine alır. Düz bir süslü parantezi `'{'`, bir kesme işaretini `''` olarak yazın. Bir harfin önündeki tek `'` olduğu gibi kalır. Bkz. [ICU mesajları](./icu.md).

### Bir çoğul başka bir dilde yanlış biçimi gösteriyor

Dil, mesajınızın vermediği kategorilere ihtiyaç duyar (Rusça `few` ve `many`, Arapça altı kategori ister). `dialex check` `icu-plural-categories` ile uyarır. Seçenekleri ekleyin; `other` yedektir.

## CLI ve yerel ikili dosyalar

### `dx` yavaş ya da yerel ikili dosyanın çalışıp çalışmadığını bilmek istiyorum

`DIALEX_NATIVE=1 dx check` çalıştırın: `native check declined` ile başarısız olursa neden iletidedir. Bkz. [Yerel ikili dosyalar](./native.md).

### `dialex: this command needs the Node CLI (@dialexjs/cli), which was not found`

Yerel ikili dosya, yanında Node CLI olmadan tek başına başlatıldı. `@dialexjs/cli` paketini projeye kurun, `DIALEX_NODE_CLI` değerini onun `dist/index.mjs` dosyasına ayarlayın ya da `DIALEX_NATIVE=0` kullanın.

### Paketi kurmama rağmen `dx` Node'da çalışıyor

Platform paketi kurulmamış (`--no-optional`, desteklenmeyen bir platform ya da Alpine/musl) ya da platform desteklenmiyor. `npm ls @dialexjs/cli-linux-x64` (kendi platformunuzu yazın) orada olup olmadığını gösterir. Sonuç aynıdır, yalnızca daha yavaştır.

### `dialex check` bir sözlük için hiçbir şey bildirmiyor

Sözlük spread, hesaplanan anahtar ya da içe aktarılan değer kullanıyor ve sözdizimi ağacından okunamadı. `dialex check` böyle bir dosyayı çalıştırır; editör atlar. Bkz. [Sözlükler](./dictionaries.md#what-the-tools-can-read).

### `dialex translate` hiçbir provider yapılandırılmadığını söylüyor

`dialex.config.ts` içinde `translate.provider` ayarlayın. Bkz. [`dialex translate`](../cli/translate.md).

## Editörler

### Editör tanılama, üzerine gelme ya da tamamlama göstermiyor

- Çalışma alanında Dialex projesi yok: bir `dialex.config.*` ya da bir `package.json` yanında bir `*.content.ts` dosyası gerekir.
- Eklenti ya da sunucu kapalı: `dialex.enable` ayarını denetleyin.
- Sözlük spread ya da hesaplanan anahtar kullanıyor: analiz edilemez olarak bildirilir ve atlanır.
- Dosya `.gitignore` ya da `exclude` tarafından yok sayılıyor.
- Dil sunucusu başlamadı: Zed'de Node.js gerekir; nedeni sunucu günlüğünde bulun.

### Kullanılmayan anahtarlar hiç gösterilmiyor

Varsayılan olarak kapalıdır. `unusedKeys` ayarını açın; o zaman soluk metin olarak görünürler.

## Hâlâ takıldınız mı

`dialex check --json` ve `dialex --version` çalıştırın ve çıktıyla, `dialex.config.*` dosyanızla ve sorunu gösteren en küçük sözlükle [GitHub](https://github.com/awaiden/dialex/issues)'da bir issue açın.
