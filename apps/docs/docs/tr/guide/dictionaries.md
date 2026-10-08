# Sözlükler

Sözlük, her yerel ayarı içeriğine eşleyen adlandırılmış bir nesnedir. Dosyalar `include` glob'u ile bulunur (varsayılan `**/*.content.ts`).

```ts
import { defineDictionary } from "dialex";

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

Her sözlük, her yerel ayar için aynı anahtarları tanımlamalıdır. Bunu zorunlu kılmak için CI'da [`dialex check`](../cli/check.md) çalıştırın. Yapılandırmada `locales` ayarlıysa, bir sözlükte yapılandırılmış bir yerel ayar eksik olduğunda Vite eklentisi derleme sırasında da hata verir.
