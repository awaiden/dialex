# dialex generate

`.content.ts` sözlüklerini, sıfır ek yükle sunucu çalıştırma için statik modüllere derler.

Çıktılar:

- `src/dialex.generated.ts`, `dictionaries` olarak verdiğiniz statik sözlük haritası.
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
