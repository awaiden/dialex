# Zed ve diğer editörler

Dialex'in Language Server Protocol konuşan bir dil sunucusu var: [`@dialexjs/language-server`](https://www.npmjs.com/package/@dialexjs/language-server). Bunu destekleyen editörler, ayrı bir eklenti olmadan Dialex'in tanılamalarını, hover'ını, tanıma gitmesini, tamamlamasını ve hızlı düzeltmelerini alır. Zed için onu bulup başlatan bir eklenti var. VS Code eklentisi [VS Code Eklentisi](./vscode.md) sayfasında anlatılır.

::: warning Durum
Dil sunucusu bir LSP istemcisine karşı test edilir ve Zed eklentisi Zed'de denenmiştir (tanılamalar, hover, tanıma git, tamamlama, hızlı düzeltmeler ve otomatik üretim çalışır). Henüz Zed'in eklenti kayıt defterinde değildir; geliştirme eklentisi olarak kurun ve yanlış görünen her şeyi bildirin.
:::

## Zed

Eklentiyi depodan kurun (`packages/zed` içindedir): Zed'in komut paletinde **zed: install dev extension** çalıştırın ve o klasörü seçin. `wasm32-wasip2` hedefli Rust gerekir.

Eklenti sunucuyu önce projenizde (`package.json` içindeki `@dialexjs/language-server`), sonra `PATH` üzerinde arar, bulamazsa npm ile kendi kopyasını kurar ve günceller. Yalnızca `dialex.config.*` dosyası veya `package.json` içinde `dialexjs` olan projelerde başlar.

Ayarlar Zed'in ayarlarında `lsp.dialex` altına yazılır:

```json
{
  "lsp": {
    "dialex": {
      "settings": {
        "unusedKeys": false,
        "autoGenerate": true,
        "configPath": ""
      }
    }
  }
}
```

Sunucu TypeScript dosyaları için kendiliğinden başlar. Açıkça belirtmek isterseniz veya başlamazsa dilin sunucu listesine ekleyin:

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["dialex", "..."] },
    "TSX": { "language_servers": ["dialex", "..."] }
  }
}
```

## Diğer editörler

Herhangi bir LSP istemcisi sunucuyu stdio üzerinden çalıştırabilir:

```bash
npx @dialexjs/language-server --stdio
```

Neovim 0.11 veya üstü:

```lua
vim.lsp.config("dialex", {
  cmd = { "npx", "@dialexjs/language-server", "--stdio" },
  filetypes = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  root_markers = { "dialex.config.ts", "package.json" },
})
vim.lsp.enable("dialex")
```

Helix, `languages.toml` içinde:

```toml
[language-server.dialex]
command = "npx"
args = ["@dialexjs/language-server", "--stdio"]

[[language]]
name = "typescript"
language-servers = ["typescript-language-server", "dialex"]
```

::: warning Denenmemiş tarifler
Bu iki parça her editörün belgelenmiş yapılandırmasını izler, ancak gerçek editörlerde çalıştırılmamıştır. Sürümünüzün belgeleriyle karşılaştırın.
:::

## Özellikler

Sunucu şunları sağlar:

| Özellik           | Ne elde edersiniz                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tanılamalar       | Eksik anahtarlar ve diller, geçersiz [ICU](./icu.md), `[TODO]` yer tutucuları, eskimiş çeviriler ve hiçbir şeye işaret etmeyen `getDictionary("x")` veya `t("x.y")` çağrıları |
| Hover             | Bir anahtarın her dildeki metni                                                                                                                                               |
| Tanıma git        | Sözlüğün anahtarı yazdığı yere gider                                                                                                                                          |
| Tamamlama         | `t("...")` ve `getDictionary("...")` içinde sözlük adları ve anahtar yolları                                                                                                  |
| Hızlı düzeltmeler | Eksik bir anahtarı bir dile kopyala (`[TODO]` ile işaretli), tüm eksik anahtarları ekle veya kodun başvurduğu bir anahtarı oluştur                                            |
| Üretilen dosyalar | Bir sözlük veya yapılandırma dosyası değiştiğinde, zaten bir tane olan projelerde `dialex.generated.ts` yeniden üretir                                                        |

## Ayarlar

Sunucu bunları editör yapılandırmasının `dialex` bölümünden okur:

| Ayar           | Varsayılan | Açıklama                                                                           |
| -------------- | ---------- | ---------------------------------------------------------------------------------- |
| `enable`       | `true`     | Tüm özellikleri kapat                                                              |
| `unusedKeys`   | `false`    | Hiçbir kaynak dosyanın kullanmadığı görünen anahtarları ve sözlükleri soluklaştır  |
| `autoGenerate` | `true`     | Sözlükler veya yapılandırma değişince `dialex.generated.ts` dosyasını yeniden üret |
| `configPath`   | —          | Her proje köküne göre yapılandırma dosyası; boşsa `dialex.config.*` kullanılır     |

## Sınırlar

- Sözlükler ve yapılandırmalar sözdizimi ağacından okunur, bu yüzden sunucu projenizin kodunu asla çalıştırmaz. Spread veya hesaplanan anahtarlarla kurulmuş sözlükler analiz edilemez ve bilgilendirme notu gösterir; bunlar için `dialex check` çalıştırın.
- Üretilen dosyalar yalnızca zaten bir tane olan projelerde güncellenir. Oluşturmak için bir kez `dialex generate` çalıştırın.
- Editör komutları yoktur: yeniden üretim otomatiktir.
