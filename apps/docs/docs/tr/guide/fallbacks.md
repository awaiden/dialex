# Yerel Ayar Yedekleri

Bir sözlükte istenen yerel ayar için içerik yoksa Dialex doğrudan varsayılana atlamak yerine bir yedek zinciri izler:

1. yerel ayarın kendisi (`pt-BR`)
2. yapılandırmadaki açık yedekleri, sırayla
3. alt etiket kısaltmaları (`pt-BR` → `pt`)
4. açık yedeklerin kısaltmaları
5. `defaultLocale`

Hiçbiri eşleşmezse sözlükte tanımlanan ilk yerel ayar kullanılır.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "es", "pt"],
  fallbacks: {
    "pt-BR": ["pt", "es"],
    gl: ["es"],
  },
});
```

Örneğin Türkçe sözlüğü olan bir projede `tr-TR` isteği, hiçbir yapılandırma olmadan `tr` olarak çözülür. Galiçyaca içeriği olmayan bir `gl` isteği `es` olarak çözülür.

İçerik, istenenden farklı bir yerel ayardan geldiğinde her seferinde bir uyarı kaydedilir.

## Adaptörler

Sunucu adaptörleri `fallbacks` seçeneğini doğrudan da kabul eder; yapılandırma dosyasına güvenmek yerine `dictionaries` verdiğinizde işe yarar:

```ts
app.use(dialex({ dictionaries, locales: ["en", "es"], fallbacks: { pt: ["es"] } }));
```

Yedekler sözlük aramaları için geçerlidir. [Yerel ayar algılama](./locale-detection.md) yine yalnızca `locales` içinde listelenen yerel ayarları döndürür.
