# dialex export

Sözlüklerinizdeki metinleri, TypeScript'e dokunmadan çevirmenlerin çalışabileceği dosyalara yazar.

```bash
dialex export                      # JSON, into ./i18n-export
dialex export -f csv
dialex export -f xliff -o translations
dialex export -l tr de
```

| Seçenek                     | Açıklama                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| `-f, --format <format>`     | `json` (varsayılan), `csv` veya `xliff`                               |
| `-o, --out <dir>`           | Çıktı dizini (varsayılan `i18n-export`)                               |
| `-l, --locale <locales...>` | Bu yerel ayarlarla sınırla (varsayılan yerel ayar her zaman dahildir) |
| `-c, --config <path>`       | Özel yapılandırma yolu                                                |

## Biçimler

Anahtarlar, başına sözlük adı eklenmiş noktalı yollardır, örneğin `home.nav.about`.

- **JSON**: yerel ayar başına tek bir düz dosya, `en.json`, `tr.json`, ... içeriği `{ "home.title": "Welcome" }`.
- **CSV**: bir `key` sütunu ve yerel ayar başına bir sütun içeren tek bir `translations.csv`. Boş hücreler eksik çevirilerdir.
- **XLIFF 1.2**: varsayılan olmayan her yerel ayar için bir `<locale>.xlf`; varsayılan yerel ayarın metni `<source>`, yerel ayarın kendi metni `<target>` olarak yazılır. Eksik çevirilerde `<target>` yoktur.

Yalnızca düz metin değerleri dışa aktarılır. `(name) => \`Hello ${name}\`` gibi fonksiyon değerleri metin olarak çevrilemez; sayılır ve atlanmış olarak raporlanır. Anahtarların kendi adlarında nokta bulunamaz.

Çevirileri [`dialex import`](./import.md) ile geri getirin.
