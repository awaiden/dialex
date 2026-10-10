# Svelte

`dialexjs/svelte`, Svelte 4 ve 5 bileşenlerine bir yerel ayar deposu ve depo olarak sözlükler sağlar. Düz Vite uygulamalarında ve SvelteKit bileşenlerinde çalışır. `svelte/store` ve Svelte'in bağlamını kullanır; kurulacak rune veya derleme adımı yoktur. SvelteKit'te sunucuda yerel ayar algılama için [SvelteKit](./sveltekit.md) sayfasına bakın.

## Kurulum

Çalışma zamanı kütüphanesini ve CLI'ı kurun:

```bash
npm install dialexjs
npm install -D @dialexjs/cli
```

## Kurulum adımları

Yerel ayarlarınızla `dialex.config.ts` oluşturun (veya paketleri ve bir başlangıç sözlüğünü de ekleyen `dialex init` komutunu çalıştırın):

```ts
// dialex.config.ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
});
```

Bir sözlüğü onu kullanan kodun yanına yazın. Her yerel ayarın anahtarları aynıdır:

```ts
// src/home.content.ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "One dictionary, every language",
    greeting: (name: string) => `Hello, ${name}!`,
    items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}",
  },
  tr: {
    title: "Tek sözlük, her dil",
    greeting: (name: string) => `Merhaba, ${name}!`,
    items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}",
  },
});
```

Sözlükleri `dialex.generated.ts` dosyasına ve tip bildirimlerine derleyin. Bir sözlük değiştiğinde yeniden çalıştırın veya `dx generate --watch` komutunu açık tutun:

```bash
npx dx generate
```

`provideDialex` işlevini kök bileşeninizin script'inde, üretilen `dialex` dışa aktarımıyla bir kez çağırın:

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "./dialex.generated";
  import Home from "./lib/Home.svelte";

  provideDialex({ ...dialex });
</script>

<Home />
```

## Sözlükleri kullanma

`useDictionary(name)`, geçerli yerel ayarın sözlüğünü içeren bir depo döndürür. Şablonda başına `$` koyun. Anahtarlar tiplidir ve sözlüklerinizden otomatik tamamlanır:

```svelte
<!-- src/lib/Home.svelte -->
<script lang="ts">
  import { useDictionary } from "dialexjs/svelte";

  const home = useDictionary("home");
</script>

<h1>{$home.title}</h1>
<p>{$home.greeting("Alex")}</p>
```

## ICU mesajları ve çoğullar

`useT(...names)`, bir `t` fonksiyonu içeren bir depo döndürür. Onu `$t("home.items", { count })` olarak çağırın; `count` mesajdan tip denetimine tabi tutulur. [Tembel yükleme](../guide/lazy-loading.md) ile okuduğunuz sözlükleri adlandırın ki yüklensinler:

```svelte
<script lang="ts">
  import { useT } from "dialexjs/svelte";

  const t = useT("home");
  let count = $state(2);
</script>

<p>{$t("home.items", { count })}</p>
<button onclick={() => count++}>+1</button>
```

## Yerel ayarı değiştirme

`useDialex()`, `locale` deposunu ve `setLocale` işlevini döndürür. Sağlayıcı seçimi `locale` çerezinde saklar, `<html lang>` değerini günceller ve her `$` deposu bunu izler:

```svelte
<script lang="ts">
  import { useDialex } from "dialexjs/svelte";

  import { locales } from "../dialex.generated";

  const { locale, setLocale } = useDialex();
</script>

<select value={$locale} onchange={(event) => setLocale(event.currentTarget.value)}>
  {#each locales as code (code)}
    <option value={code}>{code.toUpperCase()}</option>
  {/each}
</select>
```

## API

| Dışa aktarım                           | Açıklama                                                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDialex(source, options?)`      | Dialex'i bileşen ve altındaki her şey için kullanılabilir yapar. Kök bileşende bir kez çağırın. Seçenekler: `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` veya `false`), `storageKey`, `onLocaleChange(locale)` |
| `useDialex()`                          | `{ locale, setLocale, store }` döndürür. `locale` okunabilir bir depodur. `provideDialex` altında olmayan bir bileşenin dışında hata fırlatır                                                                                               |
| `useDictionary(name)`                  | Geçerli yerel ayarın sözlüğünü, yedek zincirini izleyerek içeren okunabilir bir depo                                                                                                                                                        |
| `useT(...names)`                       | Geçerli yerel ayar için `t("dictionary.key", values?)` içeren okunabilir bir depo                                                                                                                                                           |
| `createSvelteDialex(source, options?)` | Svelte bağlamı olmayan reaktif çekirdek; düz modüller ve testler için. `{ locale, setLocale, store, dictionary(name), translator(...names) }` döndürür                                                                                      |

## Sunucu tarafı oluşturma ve SvelteKit

SvelteKit'te yerel ayarı `hooks.server.ts` içinde [`dialexHandle`](./sveltekit.md) ile çözün, kök `+layout.server.ts` dosyasından döndürün ve `initialLocale` olarak geçirin; böylece sunucu ve ilk istemci oluşturması uyuşur:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { provideDialex } from "dialexjs/svelte";

  import { dialex } from "../dialex.generated";

  let { data, children } = $props();

  provideDialex({ ...dialex }, { initialLocale: data.locale });
</script>

{@render children()}
```

```ts
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => ({ locale: locals.locale });
```

## Tembel yükleme

`dialex.config.ts` içinde `lazy: true` veya `"locale"` ile `useDictionary`, sözlük gelene kadar boş bir nesne döndürür ve sonra depoyu günceller. Sonraki sayfanın ihtiyacı olanı önceden yükleyin:

```ts
import { preloadDictionaries } from "dialexjs/svelte";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Test

Reaktif çekirdeği bir bileşen oluşturmadan test edin. `createSvelteDialex` aynı `dialex` dışa aktarımını alır ve `get` ile okuyabileceğiniz depolar döndürür:

```ts
import { createSvelteDialex } from "dialexjs/svelte";
import { get } from "svelte/store";
import { expect, it } from "vitest";

import { dialex } from "./dialex.generated";

it("switches to Turkish", () => {
  const app = createSvelteDialex({ ...dialex }, { persist: false });
  const home = app.dictionary("home");

  expect(get(home).title).toBe("One dictionary, every language");
  app.setLocale("tr");
  expect(get(home).title).toBe("Tek sözlük, her dil");
});
```

## En iyi uygulamalar

- `provideDialex` işlevini yalnızca kök bileşende çağırın. Altındaki bileşenler `useDictionary` ve `useT` kullanır; ikinci bir `provideDialex` ayrı bir yerel ayar başlatır.
- `useDictionary` ve `useT` işlevlerini, Svelte'in bağlamını kullandıkları için bir bileşenin script'inin en üst düzeyinde çağırın. Olay işleyicilerinin içinde veya bir `await` sonrasında çağırmayın.
- Bir sözlüğü bir kez bir depoya okuyun ve şablonda `$name.key` kullanın. Bir üst bileşen metni aşağı aktarabiliyorsa aynı ad için birçok küçük bileşende `useDictionary` çağırmaktan kaçının.
- Yerel ayarı sunucu belirlediğinde `initialLocale` geçirin. Bu olmadan sağlayıcı önce varsayılan yerel ayarı gösterir ve hatırlananı bağlandıktan sonra uygular.

## Sorun giderme

- **`useDialex requires provideDialex() in a parent component`**: `provideDialex` bir üst bileşende çağrılmadı veya depoları kullanan bileşenden sonra çalışıyor. Kök bileşenin script'inde çağırın.
- **Anahtarlar otomatik tamamlanmıyor**: `dx generate` çalıştırın ve `dialex-env.d.ts` dosyasının `tsconfig` içine dahil olduğundan emin olun. `package.json` içinde `svelte` varsa CLI `dialexjs/svelte` bildirimlerini ekler.
- **Dil yüklenirken yanıp sönüyor**: sunucu bir yerel ayarı oluşturdu, istemci başka biriyle başladı. Sunucunun yerel ayarını `initialLocale` olarak geçirin.
