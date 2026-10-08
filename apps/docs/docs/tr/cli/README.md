# CLI

`@dialex/cli` iki komut kurar: `dialex` ve takma adı `dx`.

```bash
npm install -D @dialex/cli dialex
npm install -g @dialex/cli   # or globally
```

| Komut                                | Takma ad | Amaç                                                                     |
| ------------------------------------ | -------- | ------------------------------------------------------------------------ |
| [`dialex init`](./init.md)           |          | Bir projede Dialex iskeletini oluşturur                                  |
| [`dialex generate`](./generate.md)   | `gen`    | Sözlükleri ve tip bildirimlerini derler                                  |
| [`dialex check`](./check.md)         | `lint`   | Yerel ayar tutarlılığını ve kodun sözlükleri nasıl kullandığını doğrular |
| [`dialex export`](./export.md)       |          | Çevirmenler için metinleri JSON, CSV veya XLIFF olarak dışa aktarır      |
| [`dialex import`](./import.md)       |          | Çevrilmiş dosyaları sözlüklere geri yazar                                |
| [`dialex translate`](./translate.md) |          | Eksik çevirileri bir makine çevirisi sağlayıcısıyla doldurur             |

Tipik bir iş akışı: yeni anahtarlar için yer tutucular oluşturmak üzere `dialex check --fix`, ardından ya `dialex translate` ya da insan çevirmenler için `dialex export` / `dialex import`, sonra CI'da `dialex check`.
