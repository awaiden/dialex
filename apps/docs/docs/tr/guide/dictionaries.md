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
