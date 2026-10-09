# dialex translate

Eksik çevirileri, sizin yapılandırdığınız bir makine çevirisi sağlayıcısıyla doldurur. Bir sağlayıcı ayarlanmadıkça hiçbir yere hiçbir şey gönderilmez.

```bash
dialex translate --dry-run
dialex translate
dialex translate -l tr de
dialex translate -s en
dialex translate --stale
```

| Seçenek                     | Açıklama                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `-l, --locale <locales...>` | Hedef yerel ayarlar (varsayılan: kaynak dışındaki tüm yapılandırılmış yerel ayarlar) |
| `-s, --source <locale>`     | Kaynak yerel ayar (varsayılan: `translate.sourceLocale`, sonra `defaultLocale`)      |
| `--dry-run`                 | Nelerin çevrileceğini listeler. Sağlayıcıyı çağırmaz ve dosya yazmaz                 |
| `--stale`                   | Kaynak metni değişen metinleri yeniden çevirir (aşağıya bakın)                       |
| `-c, --config <path>`       | Özel yapılandırma yolu                                                               |

## Sağlayıcı yapılandırma

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";
import { claudeProvider } from "@dialexjs/cli/translate";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr", "de"],
  translate: {
    provider: claudeProvider({ context: "Banking app. Use a formal register." }),
  },
});
```

### Yerleşik sağlayıcılar

| Sağlayıcı                  | Kimlik bilgisi                                                                       | Seçenekler                                                                |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `claudeProvider(options?)` | `ANTHROPIC_API_KEY` (veya `apiKey`)                                                  | `model`, `batchSize` (varsayılan 40), `context`, `baseUrl`                |
| `deeplProvider(options?)`  | `DEEPL_API_KEY` (veya `apiKey`). `:fx` ile biten anahtarlar ücretsiz API'yi kullanır | `formality`, `baseUrl`                                                    |
| `openaiProvider(options?)` | `OPENAI_API_KEY` (veya `apiKey`; özel bir `baseUrl` ile isteğe bağlı)                | `model`, `batchSize` (varsayılan 40), `context`, `baseUrl`, `temperature` |
| `geminiProvider(options?)` | `GEMINI_API_KEY` veya `GOOGLE_API_KEY` (veya `apiKey`)                               | `model`, `batchSize` (varsayılan 40), `context`, `baseUrl`, `temperature` |

`openaiProvider`, OpenAI Chat Completions API'sini çağırır. Azure OpenAI, Ollama veya OpenRouter gibi OpenAI uyumlu bir sunucu kullanmak için `baseUrl` ayarlayın; bu durumda anahtar isteğe bağlıdır. Her sağlayıcı varsayılan bir modelle gelir (`claude-sonnet-5-5`, `gpt-4o-mini`, `gemini-2.5-flash`). Bunu `model` ile ya da `OPENAI_MODEL` / `GEMINI_MODEL` ortam değişkenleriyle değiştirebilirsiniz.

Claude, OpenAI ve Gemini sağlayıcıları yalnızca sahte (mock) HTTP'ye karşı test edilmiştir, canlı hizmetlere karşı değil; bu yüzden model adlarını her sağlayıcının güncel listesiyle karşılaştırın.

### Kendi sağlayıcınız

Sağlayıcı, her girdi için sırayla bir çeviri döndüren bir `translate` fonksiyonuna sahip herhangi bir nesnedir:

```ts
translate: {
  provider: {
    name: "my-service",
    async translate(texts, from, to) {
      return await myService.translateAll(texts, from, to);
    },
  },
  sourceLocale: "en",
}
```

## Nelerin çevrildiği

Hedef yerel ayarda bir metin için değer yoksa ya da değeri hâlâ `[TODO]` ile başlıyorsa ([`check --fix`](./check.md#fix) bölümüne bakın) metin çevrilir. Mevcut çevirilerin üzerine asla yazılmaz. Fonksiyon değerleri çevrilmez. Aynı kaynak metinler yerel ayar başına bir kez gönderilir.

<a id="keeping-translations-in-sync"></a>

## Çevirileri güncel tutma

`dialex translate` yalnızca eksik metinleri doldurur. _Kaynak_ metin sonradan değiştiğinde bunu fark etmek için Dialex, yapılandırmanızın yanında `dialex.lock.json` adlı bir kilit dosyası tutar. Her çevirinin yapıldığı kaynak metnin kısa bir özetini (hash) kaydeder.

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

- `dialex translate` ve [`dialex import`](./import.md) yazdıklarını kaydeder.
- `dialex lock` elinizdeki çevirileri kaydeder (kilit dosyasını benimsemek için bir kez çalıştırın). Zaten güncel olmayan çevirilere dokunmaz; `dialex lock --all` bunları kabul eder.
- [`dialex check`](./check.md), kaydedildiğinden beri kaynak metni değişen her çeviri için uyarı verir; `--fail-on-stale` bunu hataya çevirir. Kaydı olmayan çeviriler (örneğin elle yazılanlar) asla bildirilmez.
- `dialex translate --stale`, güncel olmayan metinleri yeniden çevirir. Mevcut bir çevirinin yerine yalnızca bunlar geçebilir.

Ekibin tamamı aynı durumu görsün diye `dialex.lock.json` dosyasını commit edin.

## ICU mesajları

[ICU](../guide/icu.md) çoğul veya seçim sözdizimi kullanan metinler yalnızca `supportsIcu: true` bildiren sağlayıcılara gönderilir (`claudeProvider`, `openaiProvider` ve `geminiProvider` bildirir; `deeplProvider` bildirmez). Diğer sağlayıcılar için atlanır ve özette listelenir. Özel sağlayıcılar `supportsIcu: true` ile katılır.

Çevrilmiş bir ICU mesajı yalnızca aynı argümanları ve tipleri, her `select` anahtarını ve her tam `=N` eşleşmesini koruyorsa kabul edilir. Diller farklı kategorilere ihtiyaç duyduğu için çoğul kategorileri eklenebilir veya çıkarılabilir.

## Güvenlik denetimleri

`{name}`, `%s`, `%1$d` gibi yer tutucular ve HTML etiketleri çeviriden sağ çıkmalıdır. Bunlardan birini düşüren ya da değiştiren bir sonuç, boş bir sonuç gibi reddedilir, değiştirilmeden bırakılır ve özette listelenir.

Ardından değişiklikleri sürüm kontrolünde gözden geçirin. Makine çevirisi bir başlangıç noktasıdır, nihai bir cevap değildir.
