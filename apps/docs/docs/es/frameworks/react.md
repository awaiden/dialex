# React / Vite

<a id="vite-plugin"></a>

## Plugin de Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dialexPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [react(), dialexPlugin()],
});
```

`dialexPlugin(inlineConfig?)` carga tu configuración, regenera `src/dialex-env.d.ts` y sirve dos módulos virtuales, `virtual:dialex-dictionaries` y `virtual:dialex-config`, con HMR cuando cambia un archivo `.content.ts`. Si `locales` está definido, un diccionario al que le falte alguno hace fallar la compilación.

El plugin también configura `ssr.noExternal` y `optimizeDeps.exclude` para `dialexjs`, de modo que el renderizado en el servidor (por ejemplo TanStack Start o React Router con Vite) funciona sin configuración adicional de Vite. `include` es un glob normal relativo a la raíz del proyecto, el mismo que usa la CLI; se admite una `/` inicial.

## Provider y hooks

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

| Exportación           | Descripción                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `DialexProvider`      | Mantiene el locale activo. Consulta las props más abajo                      |
| `useDialex()`         | Devuelve `{ locale, setLocale }`. Lanza un error fuera del provider          |
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
