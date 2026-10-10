# Zed und andere Editoren

Dialex hat einen Language Server, [`@dialexjs/language-server`](https://www.npmjs.com/package/@dialexjs/language-server), der das Language Server Protocol spricht. Editoren, die es unterstützen, erhalten Diagnosen, Hover, Gehe zu Definition, Autovervollständigung und Schnellkorrekturen von Dialex, ohne ein eigenes Plugin. Für Zed gibt es eine Erweiterung, die ihn findet und startet. Die VS-Code-Erweiterung ist unter [VS-Code-Erweiterung](./vscode.md) beschrieben.

::: warning Status
Der Language Server wird gegen einen LSP-Client getestet, und die Zed-Erweiterung wurde in Zed ausprobiert (Diagnosen, Hover, Gehe zu Definition, Autovervollständigung, Schnellkorrekturen und automatische Erzeugung funktionieren). Sie ist noch nicht im Erweiterungsverzeichnis von Zed, installiere sie also als Dev-Erweiterung und melde alles, was falsch aussieht.
:::

## Zed

Installiere die Erweiterung aus dem Repository (sie liegt in `packages/zed`): Führe in der Befehlspalette von Zed **zed: install dev extension** aus und wähle diesen Ordner. Dafür braucht es Rust mit dem Target `wasm32-wasip2`.

Die Erweiterung sucht den Server in deinem Projekt (`@dialexjs/language-server` in `package.json`), dann in deinem `PATH` und installiert und aktualisiert sonst eine eigene Kopie mit npm. Sie startet nur in Projekten mit einer Datei `dialex.config.*` oder `dialexjs` in `package.json`.

Einstellungen stehen in Zeds Einstellungen unter `lsp.dialex`:

```json
{
  "lsp": {
    "dialex": {
      "settings": {
        "unusedKeys": false,
        "autoGenerate": true,
        "configPath": ""
      }
    }
  }
}
```

Der Server startet für TypeScript-Dateien von selbst. Wenn du es explizit haben möchtest oder er nicht startet, füge ihn der Serverliste der Sprache hinzu:

```json
{
  "languages": {
    "TypeScript": { "language_servers": ["dialex", "..."] },
    "TSX": { "language_servers": ["dialex", "..."] }
  }
}
```

## Andere Editoren

Jeder LSP-Client kann den Server über stdio ausführen:

```bash
npx @dialexjs/language-server --stdio
```

Neovim 0.11 oder neuer:

```lua
vim.lsp.config("dialex", {
  cmd = { "npx", "@dialexjs/language-server", "--stdio" },
  filetypes = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  root_markers = { "dialex.config.ts", "package.json" },
})
vim.lsp.enable("dialex")
```

Helix, in `languages.toml`:

```toml
[language-server.dialex]
command = "npx"
args = ["@dialexjs/language-server", "--stdio"]

[[language]]
name = "typescript"
language-servers = ["typescript-language-server", "dialex"]
```

::: warning Ungetestete Rezepte
Diese beiden Ausschnitte folgen der dokumentierten Konfiguration des jeweiligen Editors, wurden aber nicht mit den echten Editoren ausgeführt. Prüfe sie gegen die Dokumentation deiner Version.
:::

## Funktionen

Der Server bietet:

| Funktion              | Was du bekommst                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnosen             | Fehlende Schlüssel und Locales, ungültiges [ICU](./icu.md), `[TODO]`-Platzhalter, veraltete Übersetzungen sowie `getDictionary("x")`- oder `t("x.y")`-Aufrufe, die ins Leere zeigen |
| Hover                 | Der Text eines Schlüssels in jedem Locale                                                                                                                                           |
| Gehe zu Definition    | Springt dorthin, wo das Wörterbuch den Schlüssel schreibt                                                                                                                           |
| Autovervollständigung | Wörterbuchnamen und Schlüsselpfade innerhalb von `t("...")` und `getDictionary("...")`                                                                                              |
| Schnellkorrekturen    | Einen fehlenden Schlüssel in ein Locale kopieren (mit `[TODO]` markiert), alle fehlenden Schlüssel hinzufügen oder einen Schlüssel anlegen, auf den Code verweist                   |
| Generierte Dateien    | Erzeugt `dialex.generated.ts` neu, wenn sich ein Wörterbuch oder die Konfiguration ändert, in Projekten, die bereits eine haben                                                     |

## Einstellungen

Der Server liest diese aus dem Abschnitt `dialex` der Editorkonfiguration:

| Einstellung    | Standard | Beschreibung                                                                             |
| -------------- | -------- | ---------------------------------------------------------------------------------------- |
| `enable`       | `true`   | Alle Funktionen ausschalten                                                              |
| `unusedKeys`   | `false`  | Schlüssel und Wörterbücher ausblenden, die keine Quelldatei zu verwenden scheint         |
| `autoGenerate` | `true`   | `dialex.generated.ts` neu erzeugen, wenn sich Wörterbücher oder die Konfiguration ändern |
| `configPath`   | —        | Konfigurationsdatei relativ zu jedem Projektstamm; leer verwendet `dialex.config.*`      |

## Grenzen

- Wörterbücher und Konfigurationen werden aus dem Syntaxbaum gelesen, der Server führt also nie den Code deines Projekts aus. Wörterbücher mit Spreads oder berechneten Schlüsseln lassen sich nicht analysieren und zeigen einen Hinweis; führe dafür `dialex check` aus.
- Generierte Dateien werden nur in Projekten aktualisiert, die bereits eine haben. Führe einmal `dialex generate` aus, um sie zu erstellen.
- Es gibt keine Editorbefehle: Die Neuerzeugung läuft automatisch.
