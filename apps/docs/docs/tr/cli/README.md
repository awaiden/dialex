# CLI

`@dialexjs/cli` iki komut kurar: `dialex` ve daha kısa takma adı `dx`; `package.json` betiklerinde kullanışlıdır (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Komut                                                        | Takma ad | Amaç                                                                     |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------ |
| [`dialex init`](./init.md)                                   |          | Bir projede Dialex iskeletini oluşturur                                  |
| [`dialex generate`](./generate.md)                           | `gen`    | Sözlükleri ve tip bildirimlerini derler                                  |
| [`dialex check`](./check.md)                                 | `lint`   | Yerel ayar tutarlılığını ve kodun sözlükleri nasıl kullandığını doğrular |
| [`dialex export`](./export.md)                               |          | Çevirmenler için metinleri JSON, CSV veya XLIFF olarak dışa aktarır      |
| [`dialex import`](./import.md)                               |          | Çevrilmiş dosyaları sözlüklere geri yazar                                |
| [`dialex translate`](./translate.md)                         |          | Eksik çevirileri bir makine çevirisi sağlayıcısıyla doldurur             |
| [`dialex lock`](./translate.md#keeping-translations-in-sync) |          | Çevirileri kaynaklarıyla güncel olarak kaydeder                          |

Tipik bir iş akışı: yeni anahtarlar için yer tutucular oluşturmak üzere `dialex check --fix`, ardından ya `dialex translate` ya da insan çevirmenler için `dialex export` / `dialex import`, sonra CI'da `dialex check`.
