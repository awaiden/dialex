# Sözlükler

Sözlük, her yerel ayarı içeriğine eşleyen adlandırılmış bir nesnedir. Dosyalar `include` glob'u ile bulunur (varsayılan `**/*.content.ts`).

```ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: { title: "Hello" },
  tr: { title: "Merhaba" },
});
```

`defineDictionary` iki biçimde çağrılabilir:

```ts
defineDictionary("home", { en: {...}, tr: {...} });
defineDictionary({ name: "home", dictionary: { en: {...}, tr: {...} } });
```

İkisi de `{ name, dictionary }` döndürür ve sözlüğü işlem içindeki `globalDictionaries` haritasına kaydeder.

<a id="values"></a>

## Değerler

Değerler metin, iç içe nesne veya fonksiyon olabilir. Fonksiyonlar tip güvenli enterpolasyon sağlar:

```ts
en: {
  greeting: (name: string) => `Hello, ${name}!`,
  items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
}
```

## Yerel ayar tutarlılığı

Her sözlük her yerel ayar için aynı anahtarları tanımlamalıdır. Bunu zorunlu kılmak için CI'da [`dialex check`](../cli/check.md) çalıştırın; yapılandırılmış bir yerel ayarı eksik olan sözlükleri de bildirir.

## Kurallar

- **Ad bir sabit değerdir ve benzersizdir.** `defineDictionary("home", ...)`: bir dize sabiti; değişken ya da ifade değil. Her [anahtar yolunun](./key-paths.md) ilk bölümü ve `getDictionary` argümanıdır. Aynı ada sahip iki sözlük çakışır: yalnızca biri erişilebilir olur.
- **Dosya başına bir varsayılan dışa aktarım.** `dialex generate` sözlükleri `include` glob'uyla bulur ve her dosyanın varsayılan dışa aktarımını okur.
- **Her yerel ayar aynı anahtarlara sahiptir.** [`dialex check`](../cli/check.md) sahip olmayanları bildirir.
- **Anahtarlar nokta içeremez.** Nokta, anahtar yolunun ayırıcısıdır; bu yüzden `"nav.about"` tek bir anahtar değil, içinde `about` anahtarı olan iç içe bir `nav` nesnesidir.

<a id="what-the-tools-can-read"></a>

## Araçların okuyabildikleri

`dialex generate`, `dialex check`, editör eklentisi ve dil sunucusu sözlüklerinizi çalıştırmadan, **sözdizimi ağacından** okur. Onları hızlı ve bir editörde çalıştırmak için güvenli yapan budur. Aynı zamanda yalnızca düz değerler olarak yazılanı anlayabilecekleri anlamına gelir:

| Sözlük dosyasında                                                             | Statik okunur mu? |
| ----------------------------------------------------------------------------- | ----------------- |
| `defineDictionary("home", { en: { ... }, tr: { ... } })`                      | Evet              |
| `defineDictionary({ name: "home", dictionary: { ... } })`                     | Evet              |
| İç içe nesneler, dize sabitleri, fonksiyonlar ve metotlar                     | Evet              |
| Yerel ayarların ya da içeriklerinin herhangi bir yerinde `...shared` (spread) | Hayır             |
| Hesaplanan anahtarlar: `[key]: "..."`                                         | Hayır             |
| İçeriği bir değişken ya da içe aktarım olan yerel ayar: `en: enStrings`       | Hayır             |
| Dize sabiti olmayan bir ad                                                    | Hayır             |

Statik okunamayan bir sözlük yanlış değildir; araçların onu yalnızca çalıştırması gerekir. `dialex check` bunu yapar (dosyayı içe aktarır) ve editör dosyayı "analiz edilemez" olarak bildirip atlar; bu yüzden anahtarları için tanılama, üzerine gelme ya da tamamlama olmaz. Her yerde editör desteği istiyorsanız sözlükleri sabit nesneler olarak tutun ve nesneleri spread etmek yerine bir yaprağın içinde çağrılan bir fonksiyon ya da yardımcıyla metin paylaşın.
