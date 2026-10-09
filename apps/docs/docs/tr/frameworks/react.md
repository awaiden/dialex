# React / Vite

<a id="vite-plugin"></a>

## Vite eklentisi

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dialexPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [react(), dialexPlugin()],
});
```

`dialexPlugin(inlineConfig?)` yapılandırmanızı yükler, `src/dialex-env.d.ts` dosyasını yeniden üretir ve bir `.content.ts` dosyası değiştiğinde HMR ile `virtual:dialex-dictionaries` ve `virtual:dialex-config` adlı iki sanal modülü sunar. `locales` ayarlıysa, bunlardan birini eksik olan bir sözlük derlemeyi başarısız kılar.

## Provider ve hook'lar

```tsx
import { DialexProvider, useDialex, useDictionary } from "dialexjs/react";

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
  <DialexProvider defaultLocale="en">
    <App />
  </DialexProvider>
);
```

| Dışa aktarım          | Açıklama                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| `DialexProvider`      | Etkin yerel ayarı tutar. Aşağıdaki prop'lara bakın                     |
| `useDialex()`         | `{ locale, setLocale }` döndürür. Provider'ın dışında hata verir       |
| `useDictionary(name)` | Geçerli yerel ayar için sözlüğü döndürür, varsayılan yerel ayara döner |

## Provider prop'ları

| Prop            | Varsayılan                 | Açıklama                                                                                                                                                                |
| --------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | yapılandırma, sonra `"en"` | Başka hiçbir şey belirleyemediğinde kullanılan yerel ayar                                                                                                               |
| `initialLocale` |                            | İlk render edilecek yerel ayar. Hydration'ın eşleşmesi için sunucunun render ettiği yerel ayarı verin. Ayarlandığında, hatırlanan yerel ayar mount sırasında uygulanmaz |
| `persist`       | `"cookie"`                 | Seçimin nerede hatırlanacağı: `"cookie"`, `"localStorage"` veya `false`                                                                                                 |
| `storageKey`    | `"locale"`                 | Çerez veya localStorage anahtarı                                                                                                                                        |

Provider önce varsayılan yerel ayarı render eder, ardından mount sonrasında hatırlanan yerel ayarı uygular (yalnızca yapılandırılmış `locales` arasındaysa). Bu, ilk istemci render'ını sunucuda render edilen işaretlemeyle aynı tutar; bedeli, geri dönen ziyaretçiler için fazladan bir render'dır. Bundan kaçınmak için çerezi sunucuda okuyun ve `initialLocale` olarak verin. `<html lang>`, etkin yerel ayarla eşitlenmiş tutulur.

`useT(...dictionaryNames)` bir [`t` fonksiyonu](../guide/key-paths.md) döndürür. [Tembel yükleme](../guide/lazy-loading.md) ile `useDictionary`, sözlüğü yüklenene kadar askıya alır.
