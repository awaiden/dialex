# CLI API

`@dialexjs/cli/api`, [VS Code eklentisinin](../guide/vscode.md) ve dil sunucusunun üzerine kurulduğu programatik API'dir. Sözlükleri ve yapılandırmaları sözdizimi ağacından okur ve aşağıda işaretlenen iki isteğe bağlı fonksiyon dışında **proje kodunu çalıştırmaz**.

```ts
import { analyzeProject, readStaticConfig } from "@dialexjs/cli/api";
```

## Analiz

### `analyzeProject(options)`

```ts
function analyzeProject(options: AnalysisOptions): Promise<AnalysisResult>;
```

Bir projenin sözlüklerini bulur; yerel ayar eşitliğini, ICU mesajlarını, kilit dosyasındaki eskimiş çevirileri ve kaynak koddaki başvuruları denetler ve sorunları döndürür. `dialex check` bunun üzerinde ince bir katmandır.

| Seçenek   | Tip              | Varsayılan            | Açıklama                                                                                                                                                   |
| --------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`    | `string`         | —                     | Proje klasörü. Zorunlu                                                                                                                                     |
| `config`  | `AnalysisConfig` | —                     | `defaultLocale`, `locales`, `include`, `exclude`. Zorunlu                                                                                                  |
| `src`     | `string[]`       | `DEFAULT_SOURCE_GLOB` | Başvurular için taranacak kaynak glob'ları. Taramayı atlamak için `[]` verin                                                                               |
| `runtime` | `boolean`        | `false`               | **Proje kodunu çalıştırır.** Sözdizimi ağacının tanımlayamadığı sözlükleri (spread, hesaplanan anahtarlar) içe aktarır. Editörler bunu kapalı bırakmalıdır |
| `ignore`  | `string[]`       | —                     | `root`'a göre ek yok sayma glob'ları (iç içe projeler)                                                                                                     |
| `unused`  | `boolean`        | `true`                | Muhtemelen kullanılmayan anahtarları ve sözlükleri bildir                                                                                                  |
| `lock`    | `boolean`        | `true`                | `dialex.lock.json` kaydından sonra kaynak metni değişen çevirileri bildir                                                                                  |
| `cache`   | `AnalysisCache`  | —                     | Çağrılar arasında ayrıştırılmış sözlükleri ve taranmış kaynakları yeniden kullan. `runtime` ile yok sayılır                                                |

Sonuç:

| Alan                 | Tip                    | Açıklama                                        |
| -------------------- | ---------------------- | ----------------------------------------------- |
| `issues`             | `AnalysisIssue[]`      | Bulunan her şey. Aşağıdaki tabloya bakın        |
| `dictionaries`       | `AnalyzedDictionary[]` | Okunabilen her sözlük için bir girdi            |
| `files`              | `string[]`             | Eşleşen her sözlük dosyasının mutlak yolu       |
| `sourceFilesScanned` | `number`               | Başvurular için kaç kaynak dosyasının tarandığı |

Bir `AnalysisIssue`, `file`, `level` (`"error" \| "warning" \| "info"`), `code` ([kodlara bakın](../guide/diagnostics.md)), `message` ve biliniyorsa `range` (`{ line, column }` çiftlerinden sıfır tabanlı `{ start, end }`), `dictionary`, `locale`, `path` ve `sourceLocale` (`missing-key` için: anahtarın kopyalanacağı bir yerel ayar) taşır.

Bir `AnalyzedDictionary`; `name`, `file`, `locales`, `leaves` (`locale -> noktalı yol -> { kind, value? }`), `paths` (noktalı yolların birleşimi) ve statik okunduysa düzenleme için `df` taşır.

### Diğer analiz dışa aktarımları

| Dışa aktarım               | Açıklama                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `createAnalysisCache()`    | Uzun ömürlü bir çağıran için `AnalysisCache`. Değişmeyeni yeniden kullanır (değişiklik zamanı ve boyuta göre)               |
| `clearGitignore(cache)`    | Önbelleğe alınmış `.gitignore` kurallarını unutur; örneğin bir `.gitignore` değiştikten sonra                               |
| `scanReferences(text)`     | Kaynak metindeki `getDictionary("x")` biçimli ve `t("x.y.z")` başvurularını bulur. `{ kind, value, start, end }[]` döndürür |
| `relativeFile(root, file)` | Görüntüleme için, eğik çizgili, köke göre göreli yol                                                                        |
| `DEFAULT_SOURCE_GLOB`      | `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}`                                                                         |

## Dosyaları tarama

| Dışa aktarım                          | Açıklama                                                                                                                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scanFiles(root, patterns, options?)` | `root` altındaki dosyaları bulur; derleme çıktısını, yapılandırılmış dışlamaları ve Git'in yok saydığı yolları atlar. Seçenekler: `kind`, `exclude`, `ignore`, `gitignore`, `gitignoreFilter` |
| `createGitignoreFilter(root)`         | Mutlak bir yolun Git tarafından yok sayılıp sayılmadığını söyleyen fonksiyon; projenin, üst klasörlerinin ve iç içe klasörlerin `.gitignore` dosyalarını okur                                 |
| `BUILTIN_IGNORE`                      | Hiçbir zaman sözlük ya da kaynak barındırmayan klasörler                                                                                                                                      |
| `SOURCE_BUILTIN_IGNORE`               | Kaynak taramasının ek olarak atladıkları: diğer araçların çıktısı, bildirimler, üretilen ve yapılandırma dosyaları                                                                            |

## Sözlükleri düzenleme

Yardımcılar sözdizimi ağacı üzerinde çalışır ve dosyanın geri kalanını, yorumlar ve biçimlendirme dahil, korur.

| Dışa aktarım                                               | Açıklama                                                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDictionaryText(file, text)`                          | Bir sözlüğün kaynak metnini ayrıştırır (örneğin kaydedilmemiş bir arabellek). Biçim düzenlenebilir değilse `undefined`; sözdizimi hatasında fırlatır |
| `loadDictionaryFile(file)`                                 | Bir dosyayı yükler. Biçimi düzenlenebilir değilse `undefined`                                                                                        |
| `renderDictionaryFile(df)`                                 | Tüm düzenlemeler uygulanmış kaynak metin; yazmaz                                                                                                     |
| `saveDictionaryFile(df)`                                   | Düzenlenen dosyayı yazar                                                                                                                             |
| `listLocales(df)`, `listLeaves(df, locale)`                | Yerel ayarlar ve bir yerel ayarın her yaprağı `{ path, kind, value? }`, kaynak sırasıyla                                                             |
| `hasPath(df, locale, path)`, `getString(df, locale, path)` | Bir anahtarın var olup olmadığı ve dize değeri                                                                                                       |
| `setString(df, locale, path, value)`                       | Bir dize ayarlar ya da oluşturur. `"created"`, `"updated"` ya da `"skipped"` döndürür (fonksiyonların üzerine asla yazılmaz)                         |
| `copyLeaf(df, from, to, path, mapString?)`                 | Bir yaprağı yerel ayarlar arasında kopyalar, istenirse dizeleri yeniden yazar. Kopyalanacak bir şey yoksa ya da hedefte anahtar varsa `false`        |
| `locationOf(df, locale, path?)`                            | Bir yerel ayarın ya da anahtarın özellik adının aralığı                                                                                              |
| `dictionaryLocation(df)`                                   | Anahtarları yerel ayar olan nesnenin aralığı                                                                                                         |
| `getLeafSource(df, locale, path)`                          | Bir yaprağın değerinin kaynak kodu                                                                                                                   |
| `TODO_PREFIX`                                              | `"[TODO] "`: `--fix`'in kopyalanan dizelerin önüne koyduğu                                                                                           |

## Yapılandırma

| Dışa aktarım                     | Açıklama                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `readStaticConfig(root, file?)`  | `dialex.config.*` dosyasını sözdizimi ağacından okur: `{ config, file?, notes }`. `notes`, sabit değer olmayan ve varsayılanında bırakılan ayarları listeler |
| `parseStaticConfig(text, file?)` | Aynısı kaynak metin için                                                                                                                                     |
| `DEFAULT_STATIC_CONFIG`          | Bir ayar okunamadığında kullanılan varsayılanlar                                                                                                             |

## Projeler ve üretim

| Dışa aktarım                                                    | Açıklama                                                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `loadStaticProject(root, configFile?)`                          | Yapılandırma (sözdizimi ağacından) ve her sözlük dosyası; okuma ve düzenlemeye hazır. Proje kodunu çalıştırmaz  |
| `loadProject(root, configFile?)`                                | **Proje kodunu çalıştırır**: sözlükleri yüklemeden önce `dialex.config.*` dosyasını değerlendirir               |
| `toKey(dictionary, path)`                                       | `("home", ["nav", "about"])` değeri `"home.nav.about"` olur                                                     |
| `renderGenerated(root, options?)`                               | `dialex.generated.ts` ve `dialex-env.d.ts` dosyalarını yazmadan hesaplar; güncel olup olmadıklarını görmek için |
| `generateDictionaries(root, options?)`                          | Üretilen dosyaları yazar. `options.static` yapılandırmayı çalıştırmadan okur                                    |
| `startGenerateWatcher(root, options, regenerate, delay?, log?)` | Bir sözlük ya da yapılandırma dosyası eklendiğinde, düzenlendiğinde veya silindiğinde yeniden üretir            |

## Kilit dosyası

| Dışa aktarım                              | Açıklama                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `LOCK_FILE`                               | `"dialex.lock.json"`                                                                             |
| `readLock(root)`, `writeLock(root, lock)` | Kilit dosyasını okur (ya da `undefined`) ve sıralı anahtarlarla yazar                            |
| `hashSource(text)`                        | Bir kaynak dizesi için saklanan kısa parmak izi                                                  |
| `isStale(lock, locale, key, text)`        | Anahtar farklı kaynak metninden kaydedilmişse `true`. Kaydı olmayan bir anahtar eskimiş sayılmaz |

## Tipler

`AnalysisCache`, `AnalysisConfig`, `AnalysisIssue`, `AnalysisOptions`, `AnalysisResult`, `AnalyzedDictionary`, `IssueCode`, `IssueLevel`, `LeafInfo`, `Reference`, `ScanOptions`, `Lockfile`, `DictionaryFile`, `Leaf`, `LeafKind`, `SourceRange`, `StaticConfig`, `StaticConfigResult`, `Project`, `ProjectDictionary`, `GenerateOptions`, `RenderedGenerate`.
