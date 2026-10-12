# Linting mit ESLint und oxlint

`@dialexjs/eslint-plugin` meldet Dialex-Probleme dort, wo Ihre übrigen Lint-Fehler ohnehin erscheinen: im Terminal, in der CI und in jedem Editor, der ESLint oder oxlint ausführt. Es ist ein Paket für beide Linter, weil oxlint Plugins im ESLint-Stil lädt.

Es braucht eine `dialex.config.*` oberhalb der geprüften Datei und tut in Projekten ohne eine nichts. Wie `dialex check` liest es Wörterbücher und die Konfiguration aus dem Syntaxbaum und führt nie Projektcode aus.

## ESLint

Installieren Sie es und fügen Sie seine Konfiguration zu `eslint.config.js` hinzu:

```sh
npm install --save-dev @dialexjs/eslint-plugin
```

```js
import dialex from "@dialexjs/eslint-plugin";

export default [dialex.configs.recommended];
```

## oxlint

oxlint hat keine teilbaren Konfigurationen; tragen Sie das Plugin und die Regeln selbst in `.oxlintrc.json` ein:

```json
{
  "jsPlugins": ["@dialexjs/eslint-plugin"],
  "rules": {
    "dialex/no-unknown-dictionary": "error",
    "dialex/no-unknown-path": "error",
    "dialex/no-dynamic-key": "warn",
    "dialex/valid-dictionary": "error"
  }
}
```

Die JS-Plugins von oxlint sind in der Alpha-Phase und führen Plugin-Regeln nicht auf `.vue`-, `.svelte`- oder `.astro`-Dateien aus. Diese decken `dialex check` und die Editor-Erweiterungen weiterhin ab.

## Regeln

| Regel                          | Meldet                                                                                                             | `recommended` |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| `dialex/no-unknown-dictionary` | `getDictionary("x")`, `useDictionary("x")` oder `@DialexDictionary("x")` nennt ein Wörterbuch, das nicht existiert | `error`       |
| `dialex/no-unknown-path`       | `t("a.nope")`, wobei `a` ein bekanntes Wörterbuch ist, das diesen Schlüssel nicht hat                              | `error`       |
| `dialex/no-dynamic-key`        | Ein Wörterbuchname oder Schlüssel, der kein String-Literal ist und von Dialex nicht geprüft werden kann            | `warn`        |
| `dialex/valid-dictionary`      | Alles, was `dialex check` in einer Wörterbuchdatei findet                                                          | `error`       |
| `dialex/no-literal-string`     | Text, der in JSX steht, statt aus einem Wörterbuch zu kommen                                                       | aus           |

### no-unknown-dictionary

Dieselbe Prüfung wie die Diagnose `unknown-dictionary`. Ein im Code mit `dictionaries: { name: ... }` registriertes Wörterbuch gilt als bekannt, und Kommentare werden nie geprüft.

### no-unknown-path

Dieselbe Prüfung wie `unknown-path`. Schlüssel von Wörterbüchern, die Dialex nicht kennt, werden ignoriert, weil `t()` zu einer anderen Bibliothek gehören kann.

### no-dynamic-key

`getDictionary(name)` und ``t(`home.${key}`)`` lassen sich nicht überprüfen. Ein einfaches `t` wird nur in Dateien geprüft, die aus `dialexjs` importieren, da auch andere Bibliotheken diesen Namen verwenden.

### valid-dictionary

Läuft auf Wörterbuchdateien, auf dem Text im Editor, und meldet die Wörterbuch-[Codes](./diagnostics.md) wie `missing-key`, `missing-locale`, `invalid-icu` und `todo-placeholder`. Ungenutzte Schlüssel und Wörterbücher bleiben `dialex check` überlassen, das das ganze Projekt sieht. Codes überspringen Sie mit `ignore`:

```json
{ "dialex/valid-dictionary": ["error", { "ignore": ["todo-placeholder"] }] }
```

### no-literal-string

Markiert JSX-Text mit Buchstaben und die Werte von `title`, `alt`, `placeholder`, `aria-label` und `label`. In `recommended` ist sie aus, weil die meisten Projekte Text haben, der bleiben darf. Optionen:

```json
{
  "dialex/no-literal-string": [
    "warn",
    { "attributes": ["title", "alt"], "ignore": ["^OK$"], "ignoreComponents": ["Trans", "code"] }
  ]
}
```

`attributes` ersetzt die Attributliste, `ignore` ist eine Liste regulärer Ausdrücke, die gegen den getrimmten Text geprüft werden, und `ignoreComponents` nennt Elemente, deren Inhalt übersprungen wird (standardmäßig `Trans`, `code`, `pre`, `script` und `style`).

## Konfiguration

Regeln werden einmal unter `lint.rules` in `dialex.config.ts` konfiguriert. `dialex check`, die Editor-Erweiterungen und diese ESLint- und oxlint-Regeln lesen sie alle, sodass eine Prüfung überall mit denselben Optionen an oder aus ist.

```ts
import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ["en", "tr"],
  lint: {
    rules: {
      "unused-key": "off",
      "missing-key": "warn",
      "literal-string": ["warn", { ignore: ["^OK$"] }],
    },
  },
});
```

Die Schlüssel sind die [Diagnosecodes](./diagnostics.md), dazu `dynamic-key` und `literal-string`, die nur das Linter-Plugin auswertet. Ein Wert ist `"off"`, `"warn"`, `"error"` oder `[level, options]`. Die Stufe ändert, wie `dialex check` und die Editoren das Problem melden. In ESLint ist es der Schweregrad, den `dialex.configs.recommended` der Regel gibt; er wird aus der `dialex.config.*` im Verzeichnis gelesen, in dem ESLint läuft, und `literal-string` ist in `recommended` nur an, wenn Sie es hier setzen.

oxlint liest Schweregrade aus `.oxlintrc.json`, die sich nicht berechnen lässt; führen Sie die Regeln dort mit der gewünschten Stufe auf. `"off"` und Optionen aus `dialex.config.ts` gelten weiterhin, eine dort abgeschaltete Prüfung bleibt also still. `valid-dictionary` ist eine Regel für viele Codes und wird vom Linter in einer Stufe angezeigt; Stufen pro Code gelten in `dialex check` und den Editoren. Optionen, die einer Regel in der eigenen Konfiguration des Linters übergeben werden, überschreiben die aus `dialex.config.ts`.

## Eine Meldung unterdrücken

Verwenden Sie die eigenen Kommentare des Linters, etwa `// eslint-disable-next-line dialex/no-unknown-dictionary`. Die `dialex-ignore`-Kommentare aus [Diagnosen](./diagnostics.md) gelten für `dialex check` und die Editoren; das Plugin liest sie nicht.

## Editoren

Zeigt Ihr Editor diese Probleme bereits über ESLint oder oxlint an, schalten Sie Dialex' eigene Anzeige aus, damit jedes Problem nur einmal erscheint. Hover, Autovervollständigung und Schnellkorrekturen funktionieren weiter. In VS Code:

```json
{ "dialex.diagnostics": false }
```

In Zed setzen Sie `diagnostics` unter `lsp.dialex.settings` auf `false` ([Zed und andere Editoren](./zed.md)).
