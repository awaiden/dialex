# Yapılandırma

Dialex, proje kökünden `dialex.config.*` (veya `i18n.config.*`) dosyasını yükler; `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` ve `.json` desteklenir.

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  include: "**/*.content.ts",
});
```

| Seçenek         | Tip                           | Varsayılan          | Açıklama                                                                                                                                                                        |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | `string`                      | `"en"`              | Hiçbir şey çözülemediğinde kullanılan yerel ayar                                                                                                                                |
| `locales`       | `string[]`                    | —                   | Desteklenen yerel ayarlar; yerel ayar tip daraltmasını ve tutarlılık denetimlerini etkinleştirir. Verilmezse `dx generate`, sözlüklerinizin tanımladığı yerel ayarları kullanır |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Sözlük dosyaları için glob(lar)                                                                                                                                                 |
| `exclude`       | `string[]`                    | —                   | Projeye göre göreli, sözlükler veya kaynaklar için asla taranmayan glob'lar                                                                                                     |
| `configFile`    | `string`                      | —                   | Özel yapılandırma yolu                                                                                                                                                          |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Yerel ayar başına açık [yedek zincirleri](./fallbacks.md)                                                                                                                       |
| `prefixDefault` | `boolean`                     | `true`              | Varsayılan yerel ayarın da URL öneki alıp almayacağı. `DialexLink` ve [yönlendirme yardımcıları](./routing.md) tarafından okunur                                                |
| `lazy`          | `boolean \| "locale"`         | `false`             | Sözlükleri isteğe bağlı yükler (istemci paketleri): `true` sözlük başına, `"locale"` sözlük ve dil başına böler. Bkz. [Tembel Yükleme](./lazy-loading.md)                       |
| `translate`     | `{ provider, sourceLocale? }` | —                   | [`dialex translate`](../cli/translate.md) için sağlayıcı                                                                                                                        |

Dialex `node_modules` klasörünü, derleme çıktısını ve `.gitignore` dosyalarınızın yok saydığı her şeyi atlar (bir monorepo içindeki paket için deponun `.gitignore` dosyası da dahil). Başka her şey için, örneğin commit ettiğiniz bir vendor klasörü için, `exclude` kullanın.

Dosya isteğe bağlıdır: olmadığında yukarıdaki tüm varsayılanlar geçerli olur. `dx generate`, çalışma zamanının ihtiyaç duyduğu ayarları (`translate` hariç) `dialex.generated.ts` içine kopyalar; bu yüzden dosyayı değiştirdikten sonra yeniden çalıştırın.
