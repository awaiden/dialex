# React / Vite

<a id="vite-plugin"></a>

## Plugin de Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { i18nPlugin } from "dialex/vite";

export default defineConfig({
  plugins: [react(), i18nPlugin()],
});
```

`i18nPlugin(inlineConfig?)` carga tu configuración, regenera `src/dialex-env.d.ts` y sirve dos módulos virtuales, `virtual:dialex-dictionaries` y `virtual:dialex-config`, con HMR cuando cambia un archivo `.content.ts`. Si `locales` está definido, un diccionario al que le falte alguno hace fallar la compilación.

## Provider y hooks

```tsx
import { I18nProvider, useI18n, useDictionary } from "dialex/react";

function App() {
  const { locale, setLocale } = useI18n();
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
  <I18nProvider defaultLocale="en">
    <App />
  </I18nProvider>
);
```

| Exportación           | Descripción                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `I18nProvider`        | Mantiene el locale activo. Consulta las props más abajo                      |
| `useI18n()`           | Devuelve `{ locale, setLocale }`. Lanza un error fuera del provider          |
| `useDictionary(name)` | Devuelve el diccionario del locale actual, recurriendo al locale por defecto |

## Props del provider

| Prop            | Valor por defecto                | Descripción                                                                                                                                                                  |
| --------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | la configuración, después `"en"` | Locale que se usa cuando nada más decide                                                                                                                                     |
| `initialLocale` |                                  | El locale que se renderiza primero. Pasa el locale con el que renderizó el servidor para que la hydration coincida. Si se define, el locale recordado no se aplica al montar |
| `persist`       | `"cookie"`                       | Dónde se recuerda la elección: `"cookie"`, `"localStorage"` o `false`                                                                                                        |
| `storageKey`    | `"locale"`                       | Clave de la cookie o de localStorage                                                                                                                                         |

El provider renderiza primero el locale por defecto y después aplica el locale recordado tras el montaje (solo si es uno de los `locales` configurados). Así el primer renderizado del cliente es idéntico al marcado renderizado en el servidor, a costa de un renderizado extra para los visitantes recurrentes. Para evitarlo, lee la cookie en el servidor y pásala como `initialLocale`. `<html lang>` se mantiene sincronizado con el locale activo.

`useT(...dictionaryNames)` devuelve una [función `t`](../guide/key-paths.md). Con la [carga diferida](../guide/lazy-loading.md), `useDictionary` suspende hasta que su diccionario se ha cargado.
