# dialex import

Çevrilmiş metinleri bir dosyadan sözlük kaynak dosyalarınıza geri yazar.

```bash
dialex import dialex-export/tr.json
dialex import dialex-export/translations.csv
dialex import translations/tr.xlf
dialex import --locale tr strings.json
```

| Seçenek                 | Açıklama                                               |
| ----------------------- | ------------------------------------------------------ |
| `-f, --format <format>` | `json`, `csv` veya `xliff` (uzantıdan anlaşılır)       |
| `-l, --locale <locale>` | Tek yerel ayarlı dosyalar için yerel ayar              |
| `--allow-new`           | Henüz hiçbir yerel ayarda bulunmayan anahtarları ekler |
| `-c, --config <path>`   | Özel yapılandırma yolu                                 |

## Yerel ayarlar nasıl bulunur

- **JSON**: `tr.json` gibi düz bir dosya yerel ayarını dosya adından ya da `--locale` seçeneğinden alır. `{ "tr": { "home.title": "..." } }` biçimindeki bir dosya kendi yerel ayarlarını taşır.
- **CSV**: başlık satırı yerel ayarları adlandırır (`key,en,tr`). Boş hücreler yok sayılır.
- **XLIFF**: `target-language` özniteliği ya da `--locale`.

## Davranış

- Mevcut metinler güncellenir ve eksik olanlar sözlük dosyasına eklenir; bunun için `check --fix` ile aynı sözdizimi ağacı düzenlemeleri kullanılır.
- Hiçbir yerel ayarda bulunmayan anahtarlar, `--allow-new` vermediğiniz sürece yok sayılır ve listelenir. Bu, yazım hatalarına ve eski dışa aktarmalara karşı korur.
- Fonksiyon değerlerinin üzerine asla yazılmaz; değiştirilmeden bırakıldıkları raporlanır.
- Boş değerler atlanır.
- [ICU](../guide/icu.md) mesajları doğrulanır: geçerli ICU olmayan ya da başka bir yerel ayardaki aynı anahtardan farklı argümanlar kullanan bir değer reddedilir ve listelenir.
