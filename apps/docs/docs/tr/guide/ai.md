# Yapay Zeka Asistanları ve MCP

Dialex; Claude, Cursor, ChatGPT ve Codex gibi yapay zeka kodlama asistanlarıyla sorunsuz çalışacak şekilde tasarlanmıştır. Özel bir Model Context Protocol (MCP) sunucusu, yüklenebilir ajan yetenekleri (skills), tüm CLI komutlarında makine tarafından okunabilir JSON çıktısı ve otomatik kurulum sunar.

## `dialex init` ile Kurulum

Yeni bir projede Dialex kurulumu yaparken şunu çalıştırın:

```bash
dialex init --ai
```

Bu komut otomatik olarak şunları gerçekleştirir:

1. `.mcp.json` dosyasına Dialex MCP sunucusunu kaydeder.
2. Dialex yetenek tanımını `.claude/skills/dialex/SKILL.md` konumuna ekler.
3. `AGENTS.md` dosyasına temel uluslararasılaştırma yönergelerini ekler.

## MCP Sunucusu (`@dialexjs/mcp`)

`@dialexjs/mcp` paketi stdio üzerinden çalışır ve sözlükleri inceleyen, eşliği denetleyen ve güvenli sözdizimi ağacı düzenlemeleri yapan araçlar sunar. Asla proje kodunu çalıştırmaz ve ücretli çeviri API'lerini çağırmaz.

### Yapılandırma

`.mcp.json` dosyanıza Dialex'i ekleyin:

```json
{
  "mcpServers": {
    "dialex": {
      "command": "npx",
      "args": ["@dialexjs/mcp"]
    }
  }
}
```

### Kullanılabilir Araçlar

| Araç                       | Tür       | Açıklama                                                                                      |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `dialex_config`            | Okuma     | Kodu çalıştırmadan statik yapılandırmayı (`locales`, `defaultLocale`) okur                    |
| `dialex_list_dictionaries` | Okuma     | Keşfedilen tüm sözlük dosyalarını ve yerel ayarlarını listeler                                |
| `dialex_get_dictionary`    | Okuma     | Yerel ayar başına çeviri anahtar ve değerlerini döndürür                                      |
| `dialex_check`             | Okuma     | Eşlik ve referans analizini çalıştırır, sorunları ve ek açıklamaları döndürür                 |
| `dialex_find_usages`       | Okuma     | Bir dosyayı sözlük çağrıları (`getDictionary`, `t(...)`) için tarar                           |
| `dialex_missing`           | Okuma     | Eksik olan veya hâlâ `[TODO]` yer tutucusu içeren anahtarları listeler                        |
| `dialex_set_key`           | Düzenleme | AST aracılığıyla dizeyi güvenle ayarlar; `overwrite: true` olmadıkça üzerine yazmayı engeller |
| `dialex_add_missing`       | Düzenleme | Eksik anahtarları yerel ayarlar genelinde `[TODO]` taslakları olarak ekler                    |
| `dialex_generate`          | Araç      | `dialex.generated.ts` ve `dialex-env.d.ts` dosyalarını yeniden üretir                         |

### Dokümantasyon Kaynakları

Sunucu, `dialex://docs/<topic>` altında yerleşik markdown kaynakları sağlar:

- `dialex://docs/guide`
- `dialex://docs/translate`
- `dialex://docs/icu`
- `dialex://docs/adapters`

## Ajan Yetenekleri

Dialex, `skills` CLI ile uyumlu yetenekler yayınlar:

```bash
npx skills add awaiden/dialex
```

İki yetenek dahildir:

- `dialex`: Temel kavramlar, sözlük yapısı ve çerçeve bağdaştırıcı kalıpları.
- `dialex-translate`: Eksik çevirileri tespit etme, taslak ekleme ve ICU eşliğini doğrulama iş akışı.

## Makine Tarafından Okunabilir JSON Çıktısı

Tüm Dialex CLI komutları, otomatik boru hatlarına ve yapay zeka ajanlarına entegrasyon için `--json` parametresini destekler:

```bash
dialex check --json
dialex generate --json
dialex export --json
dialex import translations.json --json
dialex translate --dry-run --json
```

Çıktı, standart çıktıya (stdout) yapılandırılmış JSON olarak verilirken günlükler ve uyarılar gizlenir. Hata durumunda süreç sıfır olmayan bir kodla sonlanır.
