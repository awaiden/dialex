# React / Vite

<a id="setup"></a>

## Configuración

No hay ningún plugin del bundler. `dx generate` escribe `src/dialex.generated.ts`, que exporta `dialex`: tus diccionarios y una copia de tu configuración segura para el cliente. Pásalo al provider con spread:

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

Mantén el archivo al día con `dx generate --watch` en una segunda terminal, o instala la extensión de VS Code, que lo regenera al guardar. `dx check` falla cuando el archivo está desactualizado, así que una ejecución olvidada se detecta en CI. Como nada se conecta al bundler, el renderizado en el servidor (por ejemplo TanStack Start o React Router con Vite) funciona sin configuración adicional de Vite.

## Provider y hooks

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

| Exportación           | Descripción                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Contiene el locale activo y los diccionarios. Props: `children`, el `dialex` generado (`dictionaries`, `config`, `loaders`) y `defaultLocale` (recurre a la configuración y luego a `"en"`) |
| `useDialex()`         | Devuelve `{ locale, setLocale }`. Lanza un error fuera del provider                                                                                                                         |
| `useDictionary(name)` | Devuelve el diccionario del locale actual, recurriendo al locale por defecto                                                                                                                |

## Props del provider

| Prop            | Valor por defecto                | Descripción                                                                                                                                                                  |
| --------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | la configuración, después `"en"` | Locale que se usa cuando nada más decide                                                                                                                                     |
| `initialLocale` |                                  | El locale que se renderiza primero. Pasa el locale con el que renderizó el servidor para que la hydration coincida. Si se define, el locale recordado no se aplica al montar |
| `persist`       | `"cookie"`                       | Dónde se recuerda la elección: `"cookie"`, `"localStorage"` o `false`                                                                                                        |
| `storageKey`    | `"locale"`                       | Clave de la cookie o de localStorage                                                                                                                                         |
| `dictionaries`  |                                  | Los diccionarios de `dialex.generated.ts` (usa `{...dialex}`)                                                                                                                |
| `config`        |                                  | La configuración segura para el cliente del mismo archivo: `locales`, `defaultLocale`, `fallbacks`, `prefixDefault`, `lazy`                                                  |
| `loaders`       |                                  | Presente en el [modo diferido](../guide/lazy-loading.md): carga cada diccionario la primera vez que se usa                                                                   |

El provider renderiza primero el locale por defecto y después aplica el locale recordado tras el montaje (solo si es uno de los `locales` configurados). Así el primer renderizado del cliente es idéntico al marcado renderizado en el servidor, a costa de un renderizado extra para los visitantes recurrentes. Para evitarlo, lee la cookie en el servidor y pásala como `initialLocale`. `<html lang>` se mantiene sincronizado con el locale activo.

`useT(...dictionaryNames)` devuelve una [función `t`](../guide/key-paths.md). Con la [carga diferida](../guide/lazy-loading.md), `useDictionary` suspende hasta que su diccionario se ha cargado.
