# React / Vite

<a id="setup"></a>

## Kurulum

Bir paket yöneticisi eklentisi yoktur. `dx generate`, `dialex` değerini dışa aktaran `src/dialex.generated.ts` dosyasını yazar: sözlükleriniz ve yapılandırmanızın istemci için güvenli bir kopyası. Bunu provider'a yayın:

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client";
import { DialexProvider } from "dialexjs/react";
import { dialex } from "./dialex.generated";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
);
```

Dosyayı güncel tutmak için ikinci bir terminalde `dx generate --watch` çalıştırın ya da kaydettiğinizde dosyayı yeniden üreten VS Code eklentisini kurun. Dosya güncel değilse `dx check` başarısız olur; böylece unutulan bir çalıştırma CI'da yakalanır. Bundler'a takılan bir şey olmadığı için sunucu tarafı oluşturma (örneğin Vite üzerinde TanStack Start veya React Router) ek Vite yapılandırması olmadan çalışır.

## Provider ve hook'lar

```tsx
import { DialexProvider, useDialex, useDictionary } from "dialexjs/react";
import { dialex } from "./dialex.generated";

function App() {
  const { locale, setLocale } = useDialex();
  const dict = useDictionary("home");

  return (
    <div>
      <h1>{dict.title}</h1>
      <button onClick={() => setLocale(locale === "en" ? "tr" : "en")}>
        Switch Locale ({locale})
      </button>
    </div>
  );
}

export default () => (
  <DialexProvider {...dialex} defaultLocale="en">
    <App />
  </DialexProvider>
);
```

| Dışa aktarım          | Açıklama                                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Etkin yerel ayarı ve sözlükleri tutar. Prop'lar: `children`, üretilen `dialex` (`dictionaries`, `config`, `loaders`) ve `defaultLocale` (yapılandırmaya, sonra `"en"`'e geri döner) |
| `useDialex()`         | `{ locale, setLocale }` döndürür. Provider'ın dışında hata verir                                                                                                                    |
| `useDictionary(name)` | Geçerli yerel ayar için sözlüğü döndürür, varsayılan yerel ayara döner                                                                                                              |

## Provider prop'ları

| Prop            | Varsayılan                 | Açıklama                                                                                                                                                                |
| --------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | yapılandırma, sonra `"en"` | Başka hiçbir şey belirleyemediğinde kullanılan yerel ayar                                                                                                               |
| `initialLocale` |                            | İlk render edilecek yerel ayar. Hydration'ın eşleşmesi için sunucunun render ettiği yerel ayarı verin. Ayarlandığında, hatırlanan yerel ayar mount sırasında uygulanmaz |
| `persist`       | `"cookie"`                 | Seçimin nerede hatırlanacağı: `"cookie"`, `"localStorage"` veya `false`                                                                                                 |
| `storageKey`    | `"locale"`                 | Çerez veya localStorage anahtarı                                                                                                                                        |
| `dictionaries`  |                            | `dialex.generated.ts` içindeki sözlükler (`{...dialex}` ile yayın)                                                                                                      |
| `config`        |                            | Aynı dosyadaki istemci için güvenli yapılandırma: `locales`, `defaultLocale`, `fallbacks`, `prefixDefault`, `lazy`                                                      |
| `loaders`       |                            | [Tembel modda](../guide/lazy-loading.md) bulunur: her sözlüğü ilk kullanıldığında yükler                                                                                |

Provider önce varsayılan yerel ayarı render eder, ardından mount sonrasında hatırlanan yerel ayarı uygular (yalnızca yapılandırılmış `locales` arasındaysa). Bu, ilk istemci render'ını sunucuda render edilen işaretlemeyle aynı tutar; bedeli, geri dönen ziyaretçiler için fazladan bir render'dır. Bundan kaçınmak için çerezi sunucuda okuyun ve `initialLocale` olarak verin. `<html lang>`, etkin yerel ayarla eşitlenmiş tutulur.

`useT(...dictionaryNames)` bir [`t` fonksiyonu](../guide/key-paths.md) döndürür. [Tembel yükleme](../guide/lazy-loading.md) ile `useDictionary`, sözlüğü yüklenene kadar askıya alır.
