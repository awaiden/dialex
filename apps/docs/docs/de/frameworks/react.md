# React / Vite

## Vite-Plugin

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dialexPlugin } from "dialexjs/vite";

export default defineConfig({
  plugins: [react(), dialexPlugin()],
});
```

`dialexPlugin(inlineConfig?)` lädt deine Konfiguration, generiert `src/dialex-env.d.ts` neu und stellt zwei virtuelle Module bereit, `virtual:dialex-dictionaries` und `virtual:dialex-config`, mit HMR, wenn sich eine `.content.ts`-Datei ändert. Ist `locales` gesetzt, lässt ein Wörterbuch, dem eines davon fehlt, den Build fehlschlagen.

## Provider und Hooks

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

| Export                | Beschreibung                                                                            |
| --------------------- | --------------------------------------------------------------------------------------- |
| `DialexProvider`      | Hält das aktive Locale. Siehe die Props unten                                           |
| `useDialex()`         | Liefert `{ locale, setLocale }`. Wirft außerhalb des Providers einen Fehler             |
| `useDictionary(name)` | Liefert das Wörterbuch für das aktuelle Locale und fällt auf das Standard-Locale zurück |

## Provider-Props

| Prop            | Standard                   | Beschreibung                                                                                                                                                                                               |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | Konfiguration, dann `"en"` | Locale, das verwendet wird, wenn nichts anderes entscheidet                                                                                                                                                |
| `initialLocale` |                            | Das Locale, das zuerst gerendert wird. Übergib das Locale, mit dem der Server gerendert hat, damit die Hydration übereinstimmt. Ist es gesetzt, wird das gespeicherte Locale beim Mounten nicht angewendet |
| `persist`       | `"cookie"`                 | Wo die Wahl gespeichert wird: `"cookie"`, `"localStorage"` oder `false`                                                                                                                                    |
| `storageKey`    | `"locale"`                 | Cookie- oder localStorage-Schlüssel                                                                                                                                                                        |

Der Provider rendert zuerst das Standard-Locale und wendet das gespeicherte Locale nach dem Mounten an (nur wenn es eines der konfigurierten `locales` ist). So bleibt das erste Client-Rendering identisch mit dem serverseitig gerenderten Markup, auf Kosten eines zusätzlichen Renderings für wiederkehrende Besucher. Um das zu vermeiden, lies den Cookie auf dem Server und übergib ihn als `initialLocale`. `<html lang>` wird mit dem aktiven Locale synchron gehalten.

`useT(...dictionaryNames)` liefert eine [`t`-Funktion](../guide/key-paths.md). Mit [Lazy Loading](../guide/lazy-loading.md) suspendiert `useDictionary`, bis sein Wörterbuch geladen ist.
