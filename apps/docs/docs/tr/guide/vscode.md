# VS Code Eklentisi

Dialex eklentisi çeviriler için editör desteği ekler: tanılamalar, üzerine gelince bilgi gösterme (hover), tanıma gitme, otomatik tamamlama ve hızlı düzeltmeler. Deponun `packages/vscode` klasöründe yer alır.

Başka bir editör mü kullanıyorsunuz? Dil sunucusu için [Zed ve diğer editörler](./zed.md) sayfasına bakın.

::: warning Durum
Eklenti derlenir, bir `.vsix` olarak paketlenir ve mantığı VS Code API'sinin yerine geçen bir taklit üzerinde çalışan testlerle kapsanır. **Henüz gerçek bir VS Code penceresinde denenmemiştir** ve Marketplace'te değil, her [GitHub sürümünde](https://github.com/awaiden/dialex/releases/latest) `.vsix` olarak sunulur. Kendiniz çalıştırmak için [Deneyin](#try-it-out) bölümünü izleyin ve yanlış görünen her şeyi bildirin.
:::

## Kurulum

Her [sürümde](https://github.com/awaiden/dialex/releases/latest) bir `dialex-vscode-X.Y.Z.vsix` eklidir; sürüm iş akışı onu derler ve yükler. İndirip aşağıdaki komutla ya da VS Code'daki **Extensions: Install from VSIX…** komutuyla kurun:

```bash
code --install-extension dialex-vscode-X.Y.Z.vsix
```

Depodan kendiniz derlemek için:

```bash
cd packages/vscode
bun run build
bun run package                      # creates dialex-vscode-<version>.vsix
code --install-extension dialex-vscode-<version>.vsix
```

## Özellikler

### Tanılamalar

Sorunların altı, bulundukları yerde çizilir:

| Nerede                    | Sorun                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bir `.content.ts` dosyası | Bir yerel ayarda, başka bir yerel ayarda bulunan bir anahtar eksik ya da yapılandırılmış bir yerel ayar eksik; geçersiz [ICU](./icu.md); yerel ayarlar arasında farklı olan argümanlar; `dialex check --fix` ile bırakılan `[TODO]` yer tutucuları; kaynak metni çevrildikten sonra değişen çeviriler |
| Kaynak kod                | Hiçbir şeye işaret etmeyen `getDictionary("x")` veya `t("x.y")`                                                                                                                                                                                                                                       |

Bir dil için eksik çoğul kategorileri (örneğin Rusça'da `few`) uyarı olarak bildirilir. `dialex.unusedKeys` açıkken, hiçbir kaynak dosyanın kullanmadığı görünen anahtarlar ve sözlükler soluk gösterilir.

### Üzerine gelince bilgi (Hover)

`t("home.title")` içindeki bir anahtarın, `getDictionary("home")` içindeki bir sözlük adının ya da çağrının bir üyesinin (ör. `getDictionary("home").title` içindeki `.title`) üzerine gelin. Bir tablo metni her yerel ayarda gösterir (önce varsayılan yerel ayar) ve eksik olduğu yerel ayarları işaretler. Fonksiyon değerleri kaynak kodlarını gösterir.

### Tanıma git

Bir anahtar üzerinde `F12` veya ctrl/cmd-tıklama, sözlükte yazıldığı yere atlar (varsayılan yerel ayarın girdisine ya da onu içeren ilk yerel ayara).

### Otomatik tamamlama

`t("…")`, `getDictionary("…")`, `useDictionary("…")` veya `@DialexDictionary("…")` içindeki metnin içinde:

- sözlük adları, anahtar ve yerel ayar sayısıyla birlikte;
- `t("home.` sonrasında, o düzeydeki anahtarlar ve önizleme olarak varsayılan yerel ayar metni. Gruplar bir nokta ile devam eder ve listeyi yeniden açar.

### Hızlı düzeltmeler

Bir tanılamada ampulü (`Ctrl+.`/`Cmd+.`) kullanın:

- **Add "nav.contact" to tr (marked [TODO])**, değeri [`dialex check --fix`](../cli/check.md#fix) gibi varsayılan yerel ayardan kopyalar.
- **Add all N missing keys** bunu tüm dosya için yapar.
- **Add "nav.pricing" to the "home" dictionary** (bilinmeyen bir `t()` yolunda) anahtarı her yerel ayarda bir `[TODO]` yer tutucusu olarak oluşturur.

Düzeltmeler dosyanın metnini editörde değiştirir; bu yüzden geri alınabilirler ve siz kaydedene kadar hiçbir şey yazılmaz.

## Ayarlar

| Ayar                  | Varsayılan | Açıklama                                                                                                                                                         |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialex.enable`       | `true`     | Tüm özellikleri açar veya kapatır                                                                                                                                |
| `dialex.unusedKeys`   | `false`    | Büyük olasılıkla kullanılmayan anahtarları ve sözlükleri soluklaştırır. Kelime eşleştirmeye dayalı bir sezgisel yöntem olduğu için varsayılan olarak kapalıdır   |
| `dialex.autoGenerate` | `true`     | Bir sözlük veya yapılandırma dosyası değiştiğinde, zaten üretilmiş dosyası olan projelerde `dialex.generated.ts` ve `dialex-env.d.ts` dosyalarını yeniden üretir |
| `dialex.configPath`   | `""`       | Her proje köküne göre yapılandırma dosyası yolu                                                                                                                  |

**Dialex: Refresh Diagnostics** komutu her şeyi yeniden analiz eder. Tanılamalar ayrıca bir dosyayı kaydettiğinizde ya da bir sözlük veya yapılandırma dosyası değiştiğinde yenilenir.

**Dialex: Regenerate dialex.generated.ts** komutu bunu istek üzerine yapar. Otomatik üretim yapılandırmayı sözdizimi ağacından okur ve asla çalıştırmaz, güvenilmeyen çalışma alanlarında atlanır ve yalnızca zaten üretilmiş dosyası olan projelere dokunur; bu yüzden istemediğiniz dosyaları asla oluşturmaz.

## Projeler

Proje, `dialex.config.*` veya `i18n.config.*` bulunan bir klasördür. Yapılandırılmış hiçbir projenin kapsamadığı bir sözlük, varsayılan ayarlarla, `package.json` içeren en yakın klasöre aittir. Bir monorepoda her proje kendi başına analiz edilir ve bir sözlük en yakın projeye aittir.

## Kodunuzu asla çalıştırmaz

Eklenti yapılandırmanızı ve sözlüklerinizi sözdizimi ağacından okur ve proje kodunu **asla çalıştırmaz**. Güvenilmeyen çalışma alanlarını desteklediğini bildirebilmesinin nedeni budur ve yapılandırma dosyaları ile sözlükler kod olduğu için önemlidir.

Bunun bedeli, yalnızca statik olarak görünen değerlerin anlaşılmasıdır:

- `dialex.config` içinde `defaultLocale`, `locales`, `include`, `fallbacks`, `prefixDefault` ve `lazy` sabit değerler (literal) olmalıdır. Hesaplanan her şey yok sayılır ve **Dialex** çıktı kanalında not edilir.
- Yayılım (spread), hesaplanan anahtar ya da içe aktarılan değer kullanan bir sözlük analiz edilemez. Tanılama yerine bilgilendirici bir not alır. [`dialex check`](../cli/check.md) bu tür dosyaları içe aktarır ve denetler.

Aynı analiz programatik olarak `@dialexjs/cli/api` olarak da kullanılabilir (`analyzeProject`, `readStaticConfig` ve sözlük düzenleme yardımcıları).

<a id="try-it-out"></a>

## Deneyin

Eklentiyi kaynaktan gerçek bir VS Code penceresinde çalıştırmak için:

1. VS Code'da `packages/vscode` klasörünü açın.
2. `F5` tuşuna basın ("Run Extension (examples)"). Bu, eklentiyi derler ve deponun `examples/` klasöründe ikinci bir pencere açar.
3. O pencerede bir örnek açın, örneğin `examples/react/src`:
   - `home.content.ts` içindeki `tr` bloğundan bir anahtarı silin: `tr` üzerinde kırmızı bir alt çizgi belirir ve hızlı düzeltme anahtarı geri ekler.
   - Bir `t("home.…")` çağrısının üzerine gelin ya da üzerinde `F12`'ye basın.
   - Bir `.tsx` dosyasında `t("home.` yazın ve önerileri inceleyin.
4. Statik olarak okunamayan şeylere dair notlar için **Dialex** çıktı kanalını açın.
