# Yerel ikili dosyalar

`dialex generate`, `dialex check` ve dil sunucusunun Rust ile yazılmış yerel bir uygulaması vardır. Aynı sözlükleri sözdizimi ağacından, yapılandırmayı `.dialex/config.json` dosyasından okur ve **aynı dosyaları ve çıktıyı bayt bayt aynı** üretir; yalnızca daha hızlıdır. Diğer tüm komutlar ve yerel kodun kendi başına karar veremediği her durum, eskisi gibi Node CLI'da çalışır. Seçim yapmanız gerekmez: `@dialexjs/cli` kurun, doğru olan gerçekleşir.

## Hız

Tek bir makinede (Intel Core i5-11400H) taze süreçlerin 5'te en iyisiyle ölçüldü; sizin sayılarınız farklı olacaktır, kendi donanımınızda karşılaştırmak için `apps/benchmarks/cli/run.mjs` çalıştırın.

| Proje        | Komut      | Node CLI | Yerel ikili dosya |
| ------------ | ---------- | -------: | ----------------: |
| 100 sözlük   | `generate` |   341 ms |            4,3 ms |
| 100 sözlük   | `check`    |   492 ms |            8,9 ms |
| 1.000 sözlük | `generate` | 1.107 ms |             28 ms |
| 1.000 sözlük | `check`    | 2.149 ms |             88 ms |

Dil sunucusu 1.000 sözlüğü yaklaşık 2,7 sn yerine yaklaşık 50 ms'de analiz eder ve bir düzenlemeden sonra yaklaşık 20 ms'de yeniden analiz eder.

## Hangi platformlar

Önceden derlenmiş ikili dosyalar `@dialexjs/cli`'nin isteğe bağlı bağımlılıkları olarak yayımlanır:

| Platform                     | Paket                                                    |
| ---------------------------- | -------------------------------------------------------- |
| Linux x64 ve arm64 (glibc)   | `@dialexjs/cli-linux-x64`, `@dialexjs/cli-linux-arm64`   |
| macOS Intel ve Apple silicon | `@dialexjs/cli-darwin-x64`, `@dialexjs/cli-darwin-arm64` |
| Windows x64 ve arm64         | `@dialexjs/cli-win32-x64`, `@dialexjs/cli-win32-arm64`   |

Alpine Linux (musl) ve diğer platformların ikili dosyası yoktur ve Node CLI'yı kullanır. `--no-optional` ile yapılan kurulum da öyledir.

## Nasıl seçilir

`dx` küçük bir launcher'dır. Platform paketi kuruluysa ikili dosyayı çalıştırır; değilse Node CLI'yı. Linux ve macOS'ta npm ve Yarn classic ile kurulum adımı daha da ileri gider ve ikili dosyayı launcher'ın yerine koyar; böylece `dx`, önce Node'u başlatmadan başlar (yaklaşık 25 ms yerine 1 ms'nin altında). `--ignore-scripts`, pnpm, Bun (yaşam döngüsü betiklerini varsayılan olarak engeller) ya da Windows ile launcher kalır ve aynı ikili dosyayı çalıştırır.

## Neler yerel çalışır

| Komut                                             | Yerel                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `dialex generate`                                 | Evet, eager (tembel olmayan) projelerde `-o`, `-c` ve `--json` ile |
| `dialex check`                                    | Evet, `-c`, `--json`, `--github`, `--fail-on-stale` ve `--src` ile |
| `--version`                                       | Evet                                                               |
| Dil sunucusu                                      | Evet, `DIALEX_NATIVE=1` ile isteğe bağlı (aşağıya bakın)           |
| `init`, `export`, `import`, `lock`, `translate`   | Hayır: Node CLI                                                    |
| `generate --watch`, `check --fix`, `lazy` yükleme | Hayır: Node CLI                                                    |

Yerel kod tahmin etmemesi gereken bir şeyle karşılaştığında komut yine Node'da çalışır:

- spread, hesaplanan anahtar ya da sabit olmayan değer içeren bir `dialex.config.*` (Node CLI dosyayı çalıştırır);
- spread, hesaplanan anahtar, içe aktarılan değer ya da hesaplanan ad içeren bir sözlük;
- tam olarak yorumlayamadığı bir glob ya da yerel ayar etiketi.

Sonuç her zaman yerel ikili dosya olmadığındakiyle aynıdır; yalnızca daha hızlı değildir.

## Ortam değişkenleri

| Değişken                                            | Kullanan                    | Etkisi                                                                                                                                                                                                                                            |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIALEX_NATIVE=0`                                   | CLI, dil sunucusu           | Her zaman Node uygulamasını kullan                                                                                                                                                                                                                |
| `DIALEX_NATIVE=1`                                   | CLI                         | `generate` ya da `check` yerel olarak yapılamıyorsa Node'da çalışmak yerine bir nedenle 1 koduyla çık. Hızlanmayı sessizce kaybeden bir sözlüğü CI'da yakalamak için kullanışlıdır. Yalnızca Node'a ait komutlar her zamanki gibi Node'da çalışır |
| `DIALEX_NATIVE=1`                                   | dil sunucusu                | Yerel sunucuyu çalıştır. Olmazsa Node sunucusu çalışır                                                                                                                                                                                            |
| `DIALEX_BINARY=/path/to/dx`                         | CLI launcher                | Kurulu platform paketi yerine bu ikili dosyayı kullan                                                                                                                                                                                             |
| `DIALEX_LSP_BINARY=/path/to/dialex-language-server` | `@dialexjs/language-server` | Bu sunucu ikili dosyasını kullan                                                                                                                                                                                                                  |
| `DIALEX_NODE_CLI=/path/to/index.mjs`                | yerel ikili dosya           | Komutların devredileceği Node CLI. Launcher ayarlar; ikili dosyayı tek başına çalıştırıyorsanız kendiniz ayarlayın                                                                                                                                |
| `DIALEX_SKIP_NATIVE_INSTALL=1`                      | kurulum adımı               | JavaScript launcher'ı ikili dosyayla değiştirmek yerine koru                                                                                                                                                                                      |
| `NO_COLOR`                                          | CLI                         | Renksiz yazdır                                                                                                                                                                                                                                    |

## Yerel dil sunucusunu kullanma

Dil sunucusu şimdilik isteğe bağlıdır. Onu başlatan ortamda `DIALEX_NATIVE=1` ayarlayın; `@dialexjs/language-server` o zaman platform paketindeki ikili dosyayı çalıştırır. Zed'de bunun yerine `lsp.dialex.binary.path` değerini ikili dosyaya ayarlayabilirsiniz. Node sunucusuyla aynı tanılama, üzerine gelme, tanıma git, tamamlama ve hızlı düzeltmeleri sunar. Tembel yükleme kullanan projelerde `dialex.generated.ts` dosyasını yeniden üretmez; bunlar için `dialex generate` çalıştırın.

## Hangisinin çalıştığını denetleme

`dialex --version` her iki durumda da aynı numarayı yazdırır. Bir komutun yerel yapılıp yapılmadığını görmek için `DIALEX_NATIVE=1` ile çalıştırın: normal çıktısını yazdırıyorsa yerel çalışmıştır; `dialex: native check declined: ...` ile çıkıyorsa neden iletide yazar ve değişken olmadan Node'da çalışırdı.
