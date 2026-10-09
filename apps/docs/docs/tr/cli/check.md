# dialex check

Sözlüklerinizi ve kodunuzun onları nasıl kullandığını doğrular. Hata bulduğunda `1` koduyla çıkar; bu yüzden pre-commit kancalarına ve CI'a uygundur. Uyarılar çalıştırmayı asla başarısız kılmaz.

```bash
dialex check
dialex check --json
dialex check --github
dialex check --fix
dialex lint -c ./dialex.config.ts
```

## Neleri denetler

**Hatalar**

- Bir sözlükte yapılandırılmış bir yerel ayar eksiktir.
- Bir yerel ayarda, başka bir yerel ayarda bulunan bir anahtar eksiktir. İç içe anahtarlar noktalı yola göre karşılaştırılır, örneğin `nav.about`.
- Açıkça [ICU](../guide/icu.md) kullanan (`plural`, `select`, `number`, ...) bir metin geçerli ICU değildir ya da bir yerel ayar, aynı anahtar için varsayılan yerel ayardan farklı argümanlar kullanır.
- Kaynak kod, var olmayan bir sözlükle `getDictionary("x")`, `useDictionary("x")` veya `@DialexDictionary("x")` çağırır.
- Kaynak kod, var olmayan bir yolla `t("home.nav.missing")` çağırır. Yalnızca ilk segmenti bilinen bir sözlük adı olan `t()` çağrıları denetlenir; bu yüzden ilgisiz `t()` fonksiyonları yok sayılır.

**Uyarılar**

- Bir anahtar büyük olasılıkla kullanılmıyordur. Bu bir sezgisel yöntemdir: bir anahtarın son segmenti kaynak kodunuzda bir sözcük olarak herhangi bir yerde geçiyorsa anahtar kullanılmış sayılır; böylece dinamik erişim asla yanlış bir hataya yol açmaz ve bazı kullanılmayan anahtarlar fark edilmeyebilir.
- Bir sözlüğe hiç başvurulmuyordur.
- Bir ICU mesajı düz `{placeholders}` kullanıyor ama ICU olarak ayrıştırılamıyor ya da bir dil için bir çoğul seçeneği eksik (örneğin Rusça'da `few`).
- Bir metin hâlâ `[TODO]` ile başlıyor; `--fix` veya reddedilen bir çeviri tarafından bırakılmış.

Başvuru ve kullanılmayan anahtar denetimleri `**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,astro,mdx}` dosyalarını tarar; `node_modules`, derleme çıktısı, `*.d.ts`, üretilen dosyalar, yapılandırma dosyaları ve sözlüklerin kendisi atlanır. Taranacak kaynak yoksa bu denetimler atlanır.

## Seçenekler

| Seçenek               | Açıklama                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `-c, --config <path>` | Özel yapılandırma yolu                                                                                                                       |
| `--json`              | Makine tarafından okunabilir JSON yazdırır (`success`, `totalIssues`, `totalWarnings`, `fixed`, `diagnostics`) ve başka hiçbir şey yazdırmaz |
| `--github`            | Ayrıca GitHub Actions ek açıklamalarını (`::error file=...,line=...::message`) yazdırır                                                      |
| `--fix`               | Denetimden önce eksik anahtarları ekler                                                                                                      |
| `--src <globs...>`    | Varsayılan yerine taranacak kaynak glob'ları                                                                                                 |

## --fix

Bir yerel ayarda olup diğerinde bulunmayan her anahtar için `--fix`, varsayılan yerel ayarın değerini eksik yere kopyalar. Metinler kolay bulunsun diye `[TODO] ` öneki alır; fonksiyonlar yazıldığı gibi kopyalanır. Eksik yapılandırılmış yerel ayarlar oluşturulur. Düzenlemeler sözdizimi ağacı üzerinde yapıldığından yorumlar ve dosyanın geri kalanı korunur.

Yer tutucuları gerçek çevirilerle değiştirmek için ardından [`dialex translate`](./translate.md) çalıştırın.

## GitHub Actions

```yaml
- run: bunx dialex check --github
```

Hatalar ve uyarılar, ilgili oldukları dosya ve satırlarda ek açıklama olarak görünür.
