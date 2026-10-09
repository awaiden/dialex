# Angular

`dialexjs/angular`, etkin yerel ayarı, sözlükleri ve `t` işlevini Angular signal'leri olarak sağlar.

::: warning Sürümler
Angular 22 ile geliştirildi ve test edildi. Yalnızca `signal`, `computed`, `inject`, `InjectionToken`, `makeEnvironmentProviders` ve `afterNextRender` kullanır; bu yüzden Angular 17 ve sonrası için yazılmıştır, ancak daha eski sürümler test edilmemiştir. Bir Angular CLI uygulaması içinde çalıştırılmamıştır; testler, bir DOM ortamında gerçek bir Angular uygulama injector'ını sürer.
:::

## Kurulum

Angular CLI, Dialex'in Vite eklentisini çalıştırmaz; bu yüzden sözlükler açıkça verilir. Bunları CLI ile üretin:

```bash
dialex generate        # writes src/dialex.generated.ts
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideDialex } from "dialexjs/angular";
import dictionaries from "../dialex.generated";

export const appConfig: ApplicationConfig = {
  providers: [
    provideDialex({
      dictionaries,
      defaultLocale: "en",
      locales: ["en", "tr"],
    }),
  ],
};
```

Bir sözlüğü her değiştirdiğinizde `dialex generate` (veya `dialex generate --watch`) komutunu yeniden çalıştırın.

## Bir bileşende kullanma

```ts
import { Component } from "@angular/core";
import { injectDictionary, injectI18n, injectT } from "dialexjs/angular";

@Component({
  selector: "app-header",
  template: `
    <h1>{{ dict().title }}</h1>
    <p>{{ t("home.items", { count: 3 }) }}</p>
    <button (click)="toggle()">{{ i18n.locale() }}</button>
  `,
})
export class HeaderComponent {
  protected readonly i18n = injectI18n();
  protected readonly dict = injectDictionary("home"); // Signal of the dictionary
  protected readonly t = injectT();

  toggle() {
    this.i18n.setLocale(this.i18n.locale() === "en" ? "tr" : "en");
  }
}
```

| İşlev                    | Döndürdüğü                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `injectI18n()`           | Store: `locale` (bir `Signal<string>`), `setLocale(locale)`, `dictionary(name)`, `t`               |
| `injectDictionary(name)` | Etkin yerel ayar için sözlüğü içeren, [yedekleri](../guide/fallbacks.md) izleyen bir `Signal`      |
| `injectT()`              | Etkin yerel ayar için, [ICU](../guide/icu.md) destekli bir [`t` fonksiyonu](../guide/key-paths.md) |

Bunları bir enjeksiyon bağlamında çağırın; örneğin bir alan başlatıcısında veya constructor içinde. `t` her çağrıldığında yerel ayar signal'ini okuduğu için, onu bir şablondan çağırmak yerel ayar değiştiğinde o şablonu güncel tutar.

### Neden `| t` pipe'ı yok

Angular pipe'ları Angular'ın kendi derleyicisini gerektirir ve Dialex, diğer adaptörleri gibi düz JavaScript olarak dağıtılır. `t` fonksiyonu şablonlarda aynı şekilde çalışır: `{{ t('home.title') }}`.

## Seçenekler

| Seçenek         | Varsayılan | Açıklama                                                                                                                                              |
| --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | zorunlu    | `defineDictionary` sonuçları veya bir `{ name: { locale: content } }` haritası; genellikle `dialex generate` çıktısı                                  |
| `defaultLocale` | `"en"`     | Başka hiçbir şey belirleyemediğinde kullanılan yerel ayar                                                                                             |
| `locales`       |            | Desteklenen yerel ayarlar. Bu listenin dışındaki hatırlanan bir yerel ayar yok sayılır                                                                |
| `fallbacks`     |            | Açık [yedek zincirleri](../guide/fallbacks.md)                                                                                                        |
| `initialLocale` |            | İlk render edilecek yerel ayar: bir metin ya da enjeksiyon bağlamında çalışan bir fonksiyon. Ayarlandığında hatırlanan yerel ayar sonradan uygulanmaz |
| `persist`       | `"cookie"` | Seçimin nerede hatırlanacağı: `"cookie"`, `"localStorage"` veya `false`                                                                               |
| `storageKey`    | `"locale"` | Çerez veya localStorage anahtarı                                                                                                                      |

Hatırlanan yerel ayar ilk render'dan sonra uygulanır; böylece sunucuda render edilen işaretleme ile ilk istemci render'ı her zaman uyuşur. `<html lang>`, etkin yerel ayarı izler.

## Sunucu tarafı render

Angular SSR ile ilk render sunucuda gerçekleşir; bu yüzden `initialLocale` değerini bir fonksiyon olarak vererek Dialex'e isteğin hangi yerel ayarı istediğini söyleyin. Fonksiyon enjeksiyon bağlamında çalışır; böylece sunucunuzun sağladığı şeyleri `inject()` edebilir:

```ts
import { inject } from "@angular/core";
import { REQUEST } from "@angular/core"; // location depends on your Angular SSR version

provideDialex({
  dictionaries,
  initialLocale: () => {
    const request = inject(REQUEST, { optional: true });
    const cookie = request?.headers.get("cookie") ?? "";
    return /(?:^|;\s*)locale=([^;]+)/.exec(cookie)?.[1] ?? "en";
  },
});
```

::: warning Test edilmemiş tarif
`initialLocale` fonksiyonu testlerle kapsanmıştır, ancak bu `REQUEST` örneği gerçek bir Angular SSR kurulumunda çalıştırılmamıştır. Belirtecin adı ve içe aktarma yolu Angular sürümleri arasında değişmiştir; sürümünüzün SSR belgelerine bakın.
:::

## Tembel yükleme

Sözlükler başlangıçta verilir; bu yüzden [tembel yükleme](../guide/lazy-loading.md) Angular için geçerli değildir. Büyük sözlükleri, verdiğiniz `dictionaries` içine yalnızca ihtiyacınız olanları içe aktararak bölün.

## Test etme

`provideDialex`, `TestBed` içinde diğer sağlayıcılar gibi çalışır:

```ts
TestBed.configureTestingModule({
  providers: [provideDialex({ dictionaries, defaultLocale: "tr", persist: false })],
});
```

Angular gerektirmeyen kod için [`createTestI18n`](../guide/testing.md) kullanın.
