# ICU mesajları

ICU MessageFormat ayrıştırıcısı ve biçimlendiricisi. `dialexjs`, `formatMessage`, `parseMessage`, hata sınıflarını ve düğüm ile değer tiplerini yeniden dışa aktarır; `dialexjs/icu` ek olarak inceleme yardımcılarını dışa aktarır ve çalışma zamanının geri kalanını yüklemez. Mesaj sözdiziminin kendisi için [ICU mesajları](../guide/icu.md) sayfasına bakın.

```ts
import { formatMessage } from "dialexjs/icu";
```

## `formatMessage(locale, message, values?)`

```ts
function formatMessage(locale: string, message: string | IcuNode[], values?: IcuValues): string;
```

| Parametre | Açıklama                                                            |
| --------- | ------------------------------------------------------------------- |
| `locale`  | Çoğul kuralları, sayılar ve tarihler için kullanılan BCP 47 etiketi |
| `message` | Mesaj metni ya da `parseMessage`'ın döndürdüğü düğümler             |
| `values`  | Ada göre argümanlar. Varsayılan `{}`                                |

```ts
formatMessage("en", "{count, plural, =0 {No items} one {# item} other {# items}}", { count: 3 });
// "3 items"
```

Dize olarak verilen bir mesaj bir kez derlenir ve önbelleğe alınır (en fazla 500 farklı mesaj); bu yüzden aynı mesajı yeniden biçimlendirmek ayrıştırma yapmaz.

| Fırlatır         | Ne zaman                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `IcuSyntaxError` | Mesaj geçerli ICU değilse                                                                           |
| `IcuFormatError` | Bir değer eksikse, bir `plural`/`number` argümanı sonlu bir sayı değilse ya da bir tarih geçersizse |

## `parseMessage(message)`

```ts
function parseMessage(message: string): IcuNode[];
```

Bir mesajı düğümlere ayrıştırır ve sorunun konumuyla `IcuSyntaxError` fırlatır. Bir mesajı doğrulamak ya da argümanlarını incelemek için kullanın.

## `getArguments(nodes)`

```ts
function getArguments(nodes: IcuNode[]): IcuArgument[];
```

Ayrıştırılmış bir mesajın, iç içe dallardakiler dahil, farklı argümanlarını ilk görünme sırasıyla listeler.

```ts
getArguments(parseMessage("{n, plural, one {# file} other {# files}} for {name}"));
// [{ name: "n", type: "plural", selectors: ["one", "other"] }, { name: "name", type: "argument" }]
```

## `argumentSignature(nodes)`

```ts
function argumentSignature(nodes: IcuNode[]): string;
```

Bir mesajın argümanlarının, çoğul ve select dallarının metnini yok sayan karşılaştırılabilir bir tanımı. Bir anahtarın iki çevirisi aynı argümanları kullanıyorsa aynı imzaya sahiptir; `dialex check` bunu `icu-args-mismatch` bildirmek için kullanır.

## `isIcuStructured(message)`

```ts
function isIcuStructured(message: string): boolean;
```

Bir mesajın düz `{name}` yer tutucularının aksine `plural`, `selectordinal`, `select`, `number`, `date` ya da `time` kullanıp kullanmadığı. Bir ayrıştırma hatasına ne kadar katı davranılacağını belirler.

## `findPlurals(nodes)`

```ts
function findPlurals(nodes: IcuNode[]): Extract<IcuNode, { type: "plural" }>[];
```

Ayrıştırılmış bir mesajdaki, iç içe olanlar dahil her `plural` ve `selectordinal` düğümü. `dialex check`, bir dilin ihtiyaç duyduğu ama mesajda bulunmayan çoğul kategorilerini bulmak için bunu kullanır.

<a id="types-and-errors"></a>

## Tipler ve hatalar

| Ad                | Açıklama                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `IcuNode`         | Ayrıştırılmış bir mesajın düğümü: `literal`, `argument`, `number`, `date`, `time`, `plural`, `select` ya da `pound` (`#`) |
| `IcuValue`        | `string \| number \| boolean \| Date \| null \| undefined`                                                                |
| `IcuValues`       | `Record<string, IcuValue>`                                                                                                |
| `IcuArgument`     | `{ name, type, selectors? }`: bir mesajın bir argümanı                                                                    |
| `IcuArgumentType` | `"argument" \| "number" \| "date" \| "time" \| "plural" \| "selectordinal" \| "select"`                                   |
| `IcuSyntaxError`  | `Error`'u genişletir. `position`, sorunun mesajdaki sıfır tabanlı konumudur                                               |
| `IcuFormatError`  | `Error`'u genişletir. Eksik ya da geçersiz değerlerde fırlatılır                                                          |
