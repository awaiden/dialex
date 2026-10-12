# Tanılama başvurusu

Dialex'in bildirdiği her sorunun bir kodu, bir önem derecesi ve bir iletisi vardır. Aynı denetimler [`dialex check`](../cli/check.md), [VS Code eklentisi](./vscode.md) ve [dil sunucusunda](./zed.md) çalışır; bu yüzden bir sorun her yerde aynı görünür.

## Önem dereceleri

| Önem derecesi | Anlamı                                                                | `dialex check` içinde                                                                     | Editörde |
| ------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| `error`       | Bir şey yanlış ve çalışma zamanında ya da incelemede başarısız olacak | Çıkış kodu `1`                                                                            | Hata     |
| `warning`     | Bir şey büyük olasılıkla yanlış ya da yarım kalmış                    | Bildirilir, çıkış kodu `0` (`--fail-on-stale`, `stale-translation` türünü hataya çevirir) | Uyarı    |
| `info`        | Bir dosya analiz edilemiyor; bu bir hata değildir                     | Gösterilmez                                                                               | Bilgi    |

`unused-key` ve `unused-dictionary`, `check` içinde uyarıdır; editörler bunları soluk metin (ipucu) olarak gösterir, böylece Sorunlar panelini kalabalıklaştırmazlar ve yalnızca `unusedKeys` ayarı açıkken görünürler.

## Sözlük dosyaları

| Kod                  | Önem    | İleti                                                                                   | Anlamı ve çözüm                                                                                                                                                                            |
| -------------------- | ------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `invalid-dictionary` | error   | `Failed to parse dictionary: ...`                                                       | Dosyada sözdizimi hatası var. Düzeltin; ileti nerede olduğunu söyler                                                                                                                       |
| `invalid-dictionary` | error   | `Default export does not appear to be a valid defineDictionary output.`                 | Yalnızca `runtime` analizinde. `export default` bir `defineDictionary(...)` olmalıdır                                                                                                      |
| `invalid-locale`     | error   | `Locale "x" content is empty or invalid.`                                               | Yalnızca `runtime` analizinde. Bir yerel ayarın içeriği nesne olmalıdır                                                                                                                    |
| `unanalyzable`       | info    | `This dictionary uses spreads, computed keys, imported values, or a computed name, ...` | Statik araçlar dosyayı okuyamaz. `dialex check` onu çalıştırır; editörler atlar. Editör desteği için sabit nesneler kullanın (bkz. [Sözlükler](./dictionaries.md#what-the-tools-can-read)) |
| `missing-locale`     | error   | `Missing configured locale "de"`                                                        | `locales` içindeki bir yerel ayarın bu sözlükte içeriği yok. Ekleyin ya da `dialex check --fix` çalıştırın                                                                                 |
| `missing-key`        | error   | `Locale "tr" is missing key "nav.about"`                                                | Başka bir yerel ayarda anahtar var. Ekleyin, `--fix` çalıştırın (değeri `[TODO]` işaretiyle kopyalar) ya da editörün hızlı düzeltmesini kullanın                                           |
| `todo-placeholder`   | warning | `Locale "tr" key "title" still has a [TODO] placeholder`                                | Bir değer hâlâ `--fix`'in bıraktığı `[TODO] ` ile başlıyor. Çevirin ya da [`dialex translate`](../cli/translate.md) çalıştırın                                                             |
| `stale-translation`  | warning | `Locale "tr" key "title" is out of date: the "en" text changed after it was translated` | Çeviri `dialex.lock.json` içine kaydedildikten sonra kaynak metin değişti. Çeviriyi güncelleyin, sonra `dialex lock` çalıştırın                                                            |

## ICU mesajları

| Kod                     | Önem    | İleti                                                                                                                        | Anlamı ve çözüm                                                                                                                              |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-icu`           | error   | `Invalid ICU message "a.items" (tr): ICU syntax error at 27: Missing required "other" option`                                | Dize `plural`, `select`, `number`... kullanıyor ve ayrıştırılamıyor. İleti konumu verir. Plural ve select bir `other` dalı ister             |
| `invalid-icu`           | warning | `"a.soft" (en) contains braces but is not valid ICU, so t() values cannot be applied: ...`                                   | Düz süslü parantez içeren bir dize ayrıştırılamıyor; bu yüzden `t()` onu değiştirmeden döndürürdü. Düz parantezleri tırnak içine alın: `'{'` |
| `icu-args-mismatch`     | error   | `Locale "tr" uses different arguments than "en" for "a.greeting" (expected name:any, found ad:any)`                          | Bir anahtarın çevirileri aynı argüman adlarını kullanmalıdır. Çevirideki argümanı yeniden adlandırın                                         |
| `icu-plural-categories` | warning | `Locale "ru" plural "count" in "a.items" has no "few", "many" option (used by this language; "other" will be shown instead)` | Dil, mesajın verdiğinden daha fazla çoğul kategorisi ister. Ekleyin                                                                          |

## Kaynak kod

Bunlar taranacak kaynak dosyaları gerektirir; hiç yoksa atlanırlar. Nelerin tarandığı için [`dialex check`](../cli/check.md#what-it-checks) sayfasına bakın.

| Kod                  | Önem    | İleti                                | Anlamı ve çözüm                                                                                                                                                        |
| -------------------- | ------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown-dictionary` | error   | `Unknown dictionary "zzz"`           | `getDictionary("zzz")`, `useDictionary("zzz")` ya da `@DialexDictionary("zzz")` var olmayan bir sözlüğü adlandırıyor                                                   |
| `unknown-path`       | error   | `Unknown translation path "a.nope"`  | `a` bilinen bir sözlük ama böyle bir anahtarı yok. Editör, anahtarı her yerel ayara ekleyen bir hızlı düzeltme sunar                                                   |
| `unused-key`         | warning | `Key "only_en" is possibly unused`   | Hiçbir kaynak dosya, anahtarın son bölümünü bir sözcük olarak içermiyor. Bir sezgiseldir: dinamik erişim hiç bildirilmez ve bazı kullanılmayan anahtarlar fark edilmez |
| `unused-dictionary`  | warning | `Dictionary "c" is never referenced` | Hiçbir kaynak dosya sözlüğün adını içermiyor                                                                                                                           |

## Üretilen dosyalar

`dialex check` ayrıca `dialex.generated.ts` ve `dialex-env.d.ts` dosyalarını, biçimlendirmeyi yok sayarak, `dialex generate`'in yazacağıyla karşılaştırır. Bunun kodu yoktur:

| Önem  | İleti                                                                                  | Çözüm                        |
| ----- | -------------------------------------------------------------------------------------- | ---------------------------- |
| error | `Out of date with your dictionaries or config. Run `dx generate`(or`dx check --fix`).` | `dialex generate` çalıştırın |

## Çıktı biçimleri

**İnsan okuyabilir** çıktı, sorunları dosyaya göre gruplar ve her iletinin ardına satır numarasını koyar.

**`--json`** tek bir nesne yazdırır, başka bir şey değil:

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "src/features/a/a.content.ts",
      "name": "a",
      "errors": ["Missing configured locale \"de\""],
      "warnings": ["Key \"only_en\" is possibly unused"],
      "annotations": [
        { "level": "error", "message": "Missing configured locale \"de\"", "line": 3 }
      ]
    }
  ],
  "totalIssues": 1,
  "totalWarnings": 1,
  "fixed": 0
}
```

| Alan            | Açıklama                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`       | En az bir hata varsa `false`. Bu durumda çıkış kodu `1`'dir                                                                                                                                  |
| `diagnostics`   | Sorunu olan her dosya için bir girdi: `file` (projeye göre göreli), `name` (sözlükse sözlük adı), `errors`, `warnings` ve `annotations` (`level`, `message`, biliniyorsa bir tabanlı `line`) |
| `totalIssues`   | Hata sayısı                                                                                                                                                                                  |
| `totalWarnings` | Uyarı sayısı                                                                                                                                                                                 |
| `fixed`         | `--fix`'in kaç değer eklediği                                                                                                                                                                |

**`--github`** her ek açıklama için bir iş akışı komutu yazdırır (`::error file=...,line=...,title=dialex::message`); GitHub bunları bir pull request'in dosyalarında gösterir.
