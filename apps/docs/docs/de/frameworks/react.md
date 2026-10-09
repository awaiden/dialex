# React / Vite

<a id="setup"></a>

## Einrichtung

Es gibt kein Bundler-Plugin. `dx generate` schreibt `src/dialex.generated.ts`, das `dialex` exportiert: deine Wörterbücher und eine clientsichere Kopie deiner Konfiguration. Übergib es per Spread an den Provider:

```tsx
import { DialexProvider } from "dialexjs/react";
// src/main.tsx
import { createRoot } from "react-dom/client";

import App from "./App";
import { dialex } from "./dialex.generated";

createRoot(document.getElementById("root")!).render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
);
```

Halte die Datei aktuell mit `dx generate --watch` in einem zweiten Terminal, oder installiere die VS-Code-Erweiterung, die sie beim Speichern neu erzeugt. `dx check` schlägt fehl, wenn die Datei veraltet ist, sodass ein vergessener Lauf in der CI auffällt. Da sich nichts in den Bundler einklinkt, funktioniert Server-Side-Rendering (zum Beispiel TanStack Start oder React Router mit Vite) ohne zusätzliche Vite-Konfiguration.

## Provider und Hooks

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

| Export                | Beschreibung                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DialexProvider`      | Hält das aktive Locale und die Wörterbücher. Props: `children`, das generierte `dialex` (`dictionaries`, `config`, `loaders`) und `defaultLocale` (fällt auf die Konfiguration zurück, dann auf `"en"`) |
| `useDialex()`         | Liefert `{ locale, setLocale }`. Wirft außerhalb des Providers einen Fehler                                                                                                                             |
| `useDictionary(name)` | Liefert das Wörterbuch für das aktuelle Locale und fällt auf das Standard-Locale zurück                                                                                                                 |

## Provider-Props

| Prop            | Standard                   | Beschreibung                                                                                                                                                                                               |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultLocale` | Konfiguration, dann `"en"` | Locale, das verwendet wird, wenn nichts anderes entscheidet                                                                                                                                                |
| `initialLocale` |                            | Das Locale, das zuerst gerendert wird. Übergib das Locale, mit dem der Server gerendert hat, damit die Hydration übereinstimmt. Ist es gesetzt, wird das gespeicherte Locale beim Mounten nicht angewendet |
| `persist`       | `"cookie"`                 | Wo die Wahl gespeichert wird: `"cookie"`, `"localStorage"` oder `false`                                                                                                                                    |
| `storageKey`    | `"locale"`                 | Cookie- oder localStorage-Schlüssel                                                                                                                                                                        |
| `dictionaries`  |                            | Die Wörterbücher aus `dialex.generated.ts` (per `{...dialex}`)                                                                                                                                             |
| `config`        |                            | Die clientsichere Konfiguration aus derselben Datei: `locales`, `defaultLocale`, `fallbacks`, `prefixDefault`, `lazy`                                                                                      |
| `loaders`       |                            | Im [Lazy-Modus](../guide/lazy-loading.md) vorhanden: lädt jedes Wörterbuch bei der ersten Verwendung                                                                                                       |

Der Provider rendert zuerst das Standard-Locale und wendet das gespeicherte Locale nach dem Mounten an (nur wenn es eines der konfigurierten `locales` ist). So bleibt das erste Client-Rendering identisch mit dem serverseitig gerenderten Markup, auf Kosten eines zusätzlichen Renderings für wiederkehrende Besucher. Um das zu vermeiden, lies den Cookie auf dem Server und übergib ihn als `initialLocale`. `<html lang>` wird mit dem aktiven Locale synchron gehalten.

`useT(...dictionaryNames)` liefert eine [`t`-Funktion](../guide/key-paths.md). Mit [Lazy Loading](../guide/lazy-loading.md) suspendiert `useDictionary`, bis sein Wörterbuch geladen ist.
