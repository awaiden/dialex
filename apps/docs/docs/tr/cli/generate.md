# dialex generate

`.content.ts` sözlüklerini, sıfır ek yükle sunucu çalıştırma için statik modüllere derler.

Çıktılar:

- `src/dialex.generated.ts`; şunları dışa aktarır: `dictionaries` (varsayılan dışa aktarım, sunucu adaptörleri için), `config` (yapılandırmanızın istemci için güvenli bir kopyası) ve `dialex` (`{ dictionaries, config }`; `<DialexProvider {...dialex}>` veya `createDialex({ ...dialex })` içine yayılır). `lazy: true` ile bunun yerine dinamik içe aktarmalar ve bir `loaders` dışa aktarımı içerir. Ayrıca `locales` (salt okunur bir demet; dil değiştirici için kullanışlıdır) ve ona karşılık gelen `Locale` birleşim tipini dışa aktarır. `lazy: "locale"` ile sözlükler ayrıca dile göre bölünür ve `dialex.locales/` klasörüne yazılır.
- `src/dialex-env.d.ts`, [tip kayıt defteri genişletmesi](../guide/type-safety.md).

```bash
dialex generate
dialex generate --watch
dialex gen -o src/custom.generated.ts
```

| Seçenek               | Açıklama                                              |
| --------------------- | ----------------------------------------------------- |
| `-w, --watch`         | Sözlük dosyalarını izler ve değiştikçe yeniden üretir |
| `-o, --output <path>` | Üretilen sözlükler için özel çıktı yolu               |
| `-c, --config <path>` | Özel yapılandırma yolu                                |

Herhangi bir sunucu tarafı uygulamayı derlemeden veya başlatmadan önce çalıştırın; genellikle `init` komutunun eklediği `dx:generate` betiği aracılığıyla.

Bu dosyayı sizin yerinize hiçbir şey üretmez; bu yüzden güncel tutun: ikinci bir terminalde `dialex generate --watch` çalıştırın (eklenen, düzenlenen ve silinen sözlük dosyalarına ve yapılandırma değişikliklerine tepki verir), Dialex VS Code eklentisini kullanın (kaydettiğinizde yeniden üretir) ya da `dev` ve `build` öncesinde `dx generate` çalıştırın. [`dialex check`](./check.md) eski bir dosyayı hata olarak bildirir, `dialex check --fix` ise onu yeniden yazar. `dialex.config.*` yoksa varsayılanlar geçerli olur ve `locales` sözlüklerinizden gelir. `check` üretilen dosyaları biçimlendirmeyi (boşluk, tırnak, sondaki virgüller) yok sayarak karşılaştırır; bu yüzden Prettier, Biome veya oxfmt gibi bir biçimlendirici bunları yeniden yazabilir. Dosyaları biçimlendiricinin yok sayma listesine eklemek gürültülü diff'leri önler.
