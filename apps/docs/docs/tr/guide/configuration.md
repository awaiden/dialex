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

| Seçenek         | Tip                           | Varsayılan          | Açıklama                                                                                                                       |
| --------------- | ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `defaultLocale` | `string`                      | `"en"`              | Hiçbir şey çözülemediğinde kullanılan yerel ayar                                                                               |
| `locales`       | `string[]`                    | —                   | Desteklenen yerel ayarlar; yerel ayar tipinin daraltılmasını ve tutarlılık denetimlerini etkinleştirir                         |
| `include`       | `string \| string[]`          | `"**/*.content.ts"` | Sözlük dosyaları için glob(lar)                                                                                                |
| `configFile`    | `string`                      | —                   | Özel yapılandırma yolu                                                                                                         |
| `fallbacks`     | `Record<string, string[]>`    | —                   | Yerel ayar başına açık [yedek zincirleri](./fallbacks.md)                                                                      |
| `prefixDefault` | `boolean`                     | `true`              | Varsayılan yerel ayarın da URL öneki alıp almayacağı. `I18nLink` ve [yönlendirme yardımcıları](./routing.md) tarafından okunur |
| `lazy`          | `boolean`                     | `false`             | Sözlükleri isteğe bağlı yükler (yalnızca Vite). Bkz. [Tembel Yükleme](./lazy-loading.md)                                       |
| `translate`     | `{ provider, sourceLocale? }` | —                   | [`dialex translate`](../cli/translate.md) için sağlayıcı                                                                       |

`i18nPlugin()` veya `withI18n()` işlevlerine verilen satır içi seçenekler dosyadaki değerlerin yerine geçer.
