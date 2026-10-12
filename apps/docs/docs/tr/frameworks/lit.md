# Lit

`dialexjs/lit`, Lit ve herhangi bir özel öğe (custom element) ile çalışır. `createDialex()` yerel ayarı ve sözlükleri tutar; `DialexController` ise yerel ayar değişince bir öğeyi yeniden oluşturan bir [reaktif denetleyicidir](https://lit.dev/docs/composition/controllers/).

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

Yerel ayar durumunu kendi modülünde bir kez oluştur. Her öğe onu oradan içe aktarır; böylece hepsi tek bir yerel ayarı paylaşır:

```ts
// src/i18n.ts
import { createDialex } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

export const i18n = createDialex({ ...dialex });
```

## Sözlükleri kullanma

Bir öğeye `DialexController` ekle. `dictionary(name)` geçerli yerel ayarın sözlüğünü, `t(...names)` ise bir `t("dictionary.key", values?)` fonksiyonu döndürür:

```ts
import { DialexController } from "dialexjs/lit";
// src/home-page.ts
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { i18n } from "./i18n";

@customElement("home-page")
export class HomePage extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    const home = this.dx.dictionary("home");
    const t = this.dx.t("home");

    return html`
      <h1>${home.title}</h1>
      <p>${home.greeting("Alex")}</p>
      <p>${t("home.items", { count: 2 })}</p>
    `;
  }
}
```

Değerler ICU mesajından tür denetimine tabi tutulur; bu yüzden yukarıdaki `count` bir sayı olmalıdır.

## Yerel ayarı değiştirme

`setLocale`, denetleyiciyi kullanan her öğe için yerel ayarı değiştirir. `createDialex` seçimi `locale` çerezinde hatırlar, oluşturulurken uygular ve `<html lang>` değerini eşzamanlı tutar:

```ts
import { DialexController } from "dialexjs/lit";
// src/language-switcher.ts
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { locales } from "./dialex.generated";
import { i18n } from "./i18n";

@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  private dx = new DialexController(this, i18n);

  render() {
    return html`
      <select
        @change=${(event: Event) => this.dx.setLocale((event.target as HTMLSelectElement).value)}
      >
        ${locales.map(
          (code) =>
            html`<option value=${code} ?selected=${code === this.dx.locale}>${code}</option>`,
        )}
      </select>
    `;
  }
}
```

## Lit olmadan

`createDialex` Lit'e bağlı değildir. Her bileşen yerel ayarı okuyabilir ve değişikliklere abone olabilir; bu yüzden düz özel öğelerle ve diğer kütüphanelerle çalışır:

```ts
import { i18n } from "./i18n";

class PlainElement extends HTMLElement {
  private unsubscribe?: () => void;

  connectedCallback() {
    this.unsubscribe = i18n.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  render() {
    this.textContent = i18n.getDictionary("home").title;
  }
}

customElements.define("plain-element", PlainElement);
```

## API

`createDialex({ ...dialex })` üretilen `dictionaries`, `config` ve `loaders` değerlerini, ayrıca `defaultLocale`, `initialLocale`, `persist` (`"cookie"`, `"localStorage"` veya `false`), `storageKey` ve `onLocaleChange(locale)` değerlerini kabul eder.

| Dışa aktarım                         | Açıklama                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `createDialex(options)`              | Paylaşılan yerel ayar durumunu oluşturur: `locale`, `setLocale`, `subscribe`, `getDictionary(name)`, `t(...names)`                |
| `new DialexController(host, dialex)` | Bir reaktif denetleyici. Yerel ayar değişince ya da tembel bir sözlük yüklenince `host` için güncelleme ister                     |
| `controller.locale`                  | Etkin yerel ayar                                                                                                                  |
| `controller.setLocale(locale)`       | Aynı `createDialex` örneğini kullanan her öğe için yerel ayarı değiştirir                                                         |
| `controller.dictionary(name)`        | Geçerli yerel ayarın sözlüğü, yedek zincirini izleyerek                                                                           |
| `controller.t(...names)`             | Geçerli yerel ayara bağlı bir `t("dictionary.key", values?)` fonksiyonu. Tembel yükleme ile yüklenmesi için sözlüklerin adını ver |

## Tembel yükleme

`dialex.config.ts` içinde `lazy: true` veya `"locale"` ile `dictionary(name)`, sözlük yüklenene kadar boş bir nesne döndürür ve öğe sözlük gelince yeniden oluşturulur. Sonraki görünümün ihtiyaç duyduğunu `preloadDictionaries` ile önceden yükle:

```ts
import { preloadDictionaries } from "dialexjs/lit";

import { dialex } from "./dialex.generated";

preloadDictionaries(dialex, { locale: "tr" }, "checkout");
```

## Bağlantılar ve gezinme

URL'leriniz locale taşıyorsa (`/tr/about`), bağlantıları [Yönlendirme Yardımcıları](../guide/routing.md) sayfasındaki `localizePath` ve uygulamanın gösterdiği locale ile oluşturun. Dialex'in Lit için hazır bir bağlantı bileşeni yoktur: kendi yazacağınız birkaç satır `location.assign()` ve yönlendirmelerin aynı şekilde çalışmasını sağlar ve bir yola tam olarak ne olduğunu gösterir. Üretilen `config` zaten `locales`, `defaultLocale` ve `prefixDefault` değerlerini taşır, bu yüzden hiçbir şey tekrar yazılmaz.

```ts
import { localizePath } from "dialexjs/routing";
import { html } from "lit";

import { config } from "./dialex.generated";
import { i18n } from "./i18n";

const localize = (path: string, to = i18n.locale) => localizePath(path, to, config);

html`<a href=${localize("/about")}>About</a>`;

// Programmatic navigation without a router:
location.assign(localize("/cart"));
```

## En iyi uygulamalar

- Uygulama başına tek bir `createDialex` örneği oluştur ve içe aktar. İki örnek yerel ayarını paylaşmaz.
- Sözlüğü `render()` içinde oku; böylece öğe yerel ayar değişiminden sonra yeni metni gösterir. Yapıcıda (constructor) okunan değer eski dilde kalır.
- Sayı veya seçim içeren metin için `t("home")` kullan, düz dizeleri `dictionary("home")` üzerinden oku.
- Bir örnek tek bir yerel ayar tutar; bu tarayıcıya uygundur. Sunucuda bir örneği istekler arasında paylaşma; her istek için `initialLocale` ile bir tane oluştur.

## Sorun giderme

- **Öğe yerel ayar değişince güncellenmiyor**: denetleyici, `setLocale`'in çağrıldığından farklı bir `createDialex` örneğiyle oluşturulmuş. Her yerde aynı `i18n` modülünü içe aktar.
- **Tembel yüklemede metin boş**: sözlük henüz gelmedi. Geldiğinde öğe yeniden oluşturulur; daha erken yüklemek için `preloadDictionaries` kullan.
- **Anahtarlar otomatik tamamlanmıyor**: `dx generate` çalıştır ve `dialex-env.d.ts` dosyasını `tsconfig`'ine dahil et. `package.json` içinde `lit` varsa CLI `dialexjs/lit` bildirimlerini ekler.
