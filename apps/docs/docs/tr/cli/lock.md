# dialex lock

Elinizdeki çevirileri, mevcut kaynak metinleriyle güncel olarak kaydeder; böylece kaynağın sonradan düzenlenmesi fark edilebilir. Yapılandırmanızın yanına `dialex.lock.json` yazar.

```bash
dialex lock                  # adopt the lock file; leave out-of-date translations alone
dialex lock --all            # also accept translations that are already out of date
dialex lock -s en --json
```

| Seçenek                 | Açıklama                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `-s, --source <locale>` | Çevirilerin yapıldığı yerel ayar. Varsayılan: `translate.sourceLocale`, sonra `defaultLocale` |
| `--all`                 | Zaten eskimiş çevirileri de kaydeder (olduğu gibi kabul eder)                                 |
| `--json`                | Makine tarafından okunabilir JSON yazdırır                                                    |
| `-c, --config <path>`   | Özel yapılandırma yolu                                                                        |

## Ne yapar

Kaynak dışındaki bir yerel ayarın her dizesi için, aynı anahtarın kaynak yerel ayardaki metninin kısa bir hash değerini saklar; şu durumlar hariç:

- değer hâlâ `[TODO] ` ile başlıyorsa (henüz çevrilmemiştir);
- kayıt yapıldıktan sonra kaynak metin değiştiyse ve `--all` verilmediyse (eskimiştir, bu yüzden listelenir);
- değer bir fonksiyon ya da dize olmayan başka bir değerse.

Kilit dosyasını benimsediğinizde bir kez, [`dialex check`](./check.md)'in eskimiş olarak bildirdiği çevirileri gözden geçirdikten sonra da yeniden çalıştırın. [`dialex translate`](./translate.md) ve [`dialex import`](./import.md) yazdıklarını kaydeder; bu yüzden onlardan sonra `lock`'a gerek yoktur.

Kilit dosyası başka bir kaynak yerel ayardan yazıldıysa bu yerel ayar hakkında bir şey söylemez ve yeni bir kilit başlatılır.

## Çıktı

```json
{ "success": true, "sourceLocale": "en", "recorded": 5, "stale": [] }
```

| Alan           | Açıklama                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| `success`      | Komut başarısız olmadıkça (örneğin okunamayan bir yapılandırma) `true`           |
| `sourceLocale` | Kullanılan kaynak yerel ayar                                                     |
| `recorded`     | Kaç çevirinin yeni olarak güncel kaydedildiği                                    |
| `stale`        | Hâlâ eskimiş olan ve olduğu gibi bırakılan anahtarlar (yalnızca `--all` olmadan) |

Çıkış kodu `0`'dır; komut çalıştırılamadığında `1`.

## Dosya

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

Anahtarlar sıralıdır; böylece dosya küçük ve kararlı diff'ler üretir. Tüm ekip aynı durumu görsün diye commit edin. Elle yazılmış bir çeviri gibi kaydı olmayan bir çeviri asla eskimiş olarak bildirilmez.
