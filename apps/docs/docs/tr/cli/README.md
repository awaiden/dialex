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

## Yerel ikili dosya

Linux, macOS ve Windows'ta (x64 ve arm64) `dialex` ve `dx`, Rust ile derlenmiş yerel bir ikili dosya çalıştırır; paketle birlikte isteğe bağlı bağımlılık olarak kurulur (`@dialexjs/cli-<platform>`). 1.000 sözlüklü bir projede `generate` ve `check`, Node uygulamasından 25 ila 40 kat daha hızlıdır ve aynı dosyaları ve çıktıyı bayt bayt aynı üretir.

Yerel ikili dosya sözlükleri ve yapılandırmayı sözdizimi ağacından okur. Bir komutun projenizin kodunu çalıştırması gerekiyorsa (salt veri olmayan bir yapılandırma, bir `translate` sağlayıcısı, `runtime: true`, tembel yükleme, `--fix`, `--watch`) ya da yerel olarak uygulanmamışsa (`init`, `export`, `import`, `lock`, `translate`), komutun tamamını Node CLI'ye devreder; yani sizin için hiçbir şey değişmez. İki ortam değişkeni bunu denetler:

```bash
DIALEX_NATIVE=0 dx check   # always use the Node implementation
DIALEX_NATIVE=1 dx check   # fail with a reason instead of running in Node
```

Linux ve macOS'ta npm ve Yarn classic ile kurulum adımı ikili dosyayı launcher'ın yerine koyar; böylece `dx`, önce Node'u başlatmak yerine (yaklaşık 25 ms) bir milisaniyenin altında başlar. Diğer paket yöneticileri, `--ignore-scripts` ve Windows aynı ikili dosyayı çalıştıran küçük bir JavaScript launcher'ı korur.

Desteklenen platformlar, nelerin yerel çalıştığı, ne zaman geri düşüldüğü ve her ortam değişkeni [Yerel ikili dosyalar](../guide/native.md) sayfasındadır.

## Çıkış kodları ve JSON

| Komut                                             | Çıkış kodu                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `generate`, `export`, `translate`, `lock`, `init` | Başarıda `0`, komut başarısız olduğunda `1` (sözdizimi hatası, bilinmeyen biçim, provider yok...)         |
| `check`                                           | Hata bulduğunda `1`; uyarılar asla başarısız kılmaz (`--fail-on-stale` eskimiş çevirileri hataya çevirir) |
| `import`                                          | Çalışamadığında `1`. Değer reddetse bile `0` ile çıkar; JSON'daki `success` alanını okuyun                |

`generate`, `check`, `export`, `import`, `translate` ve `lock` `--json` kabul eder: başka bir programın okuyabilmesi için tek bir JSON nesnesi yazdırırlar, başka bir şey yazdırmazlar. Biçim her komutun sayfasındadır; `check` için ayrıca [tanılama başvurusuna](../guide/diagnostics.md) bakın.
