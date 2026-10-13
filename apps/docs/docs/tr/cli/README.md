# CLI

`@dialexjs/cli` iki komut kurar: `dialex` ve daha kısa takma adı `dx`; `package.json` betiklerinde kullanışlıdır (`"dx:generate": "dx generate"`).

```bash
npm install -D @dialexjs/cli dialexjs
npm install -g @dialexjs/cli   # or globally
```

| Komut                                | Takma ad | Amaç                                                                     |
| ------------------------------------ | -------- | ------------------------------------------------------------------------ |
| [`dialex init`](./init.md)           |          | Bir projede Dialex iskeletini oluşturur                                  |
| [`dialex generate`](./generate.md)   | `gen`    | Sözlükleri ve tip bildirimlerini derler                                  |
| [`dialex check`](./check.md)         | `lint`   | Yerel ayar tutarlılığını ve kodun sözlükleri nasıl kullandığını doğrular |
| [`dialex export`](./export.md)       |          | Çevirmenler için metinleri JSON, CSV veya XLIFF olarak dışa aktarır      |
| [`dialex import`](./import.md)       |          | Çevrilmiş dosyaları sözlüklere geri yazar                                |
| [`dialex translate`](./translate.md) |          | Eksik çevirileri bir makine çevirisi sağlayıcısıyla doldurur             |
| [`dialex lock`](./lock.md)           |          | Çevirileri kaynaklarıyla güncel olarak kaydeder                          |

Tipik bir iş akışı: yeni anahtarlar için yer tutucular oluşturmak üzere `dialex check --fix`, ardından ya `dialex translate` ya da insan çevirmenler için `dialex export` / `dialex import`, sonra CI'da `dialex check`.

## Çıkış kodları ve JSON

| Komut                                             | Çıkış kodu                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `generate`, `export`, `translate`, `lock`, `init` | Başarıda `0`, komut başarısız olduğunda `1` (sözdizimi hatası, bilinmeyen biçim, provider yok...)         |
| `check`                                           | Hata bulduğunda `1`; uyarılar asla başarısız kılmaz (`--fail-on-stale` eskimiş çevirileri hataya çevirir) |
| `import`                                          | Çalışamadığında `1`. Değer reddetse bile `0` ile çıkar; JSON'daki `success` alanını okuyun                |

`generate`, `check`, `export`, `import`, `translate` ve `lock` `--json` kabul eder: başka bir programın okuyabilmesi için tek bir JSON nesnesi yazdırırlar, başka bir şey yazdırmazlar. Biçim her komutun sayfasındadır; `check` için ayrıca [tanılama başvurusuna](../guide/diagnostics.md) bakın.
