# KI-Assistenten & MCP

Dialex ist so konzipiert, dass es nahtlos mit KI-Coding-Assistenten wie Claude, Cursor, ChatGPT und Codex zusammenarbeitet. Es bietet einen dedizierten Model Context Protocol (MCP)-Server, installierbare Agenten-Skills, maschinenlesbare JSON-Ausgaben für alle CLI-Befehle und eine automatisierte Einrichtung.

## Einrichtung mit `dialex init`

Wenn Sie Dialex in einem neuen Projekt einrichten, führen Sie Folgendes aus:

```bash
dialex init --ai
```

Dadurch wird automatisch Folgendes ausgeführt:

1. Der Dialex-MCP-Server wird in `.mcp.json` installiert und registriert.
2. Die Dialex-Skill-Definition wird unter `.claude/skills/dialex/SKILL.md` hinzugefügt.
3. Wichtige Internationalisierungsrichtlinien werden zu `AGENTS.md` hinzugefügt.

## MCP-Server (`@dialexjs/mcp`)

Das Paket `@dialexjs/mcp` läuft über stdio und stellt Werkzeuge bereit, die Wörterbücher untersuchen, die Parität prüfen und sichere Syntaxbaum-Bearbeitungen durchführen. Es führt niemals Projektcode aus und ruft keine kostenpflichtigen Übersetzungs-APIs auf.

### Konfiguration

Fügen Sie Dialex zu Ihrer `.mcp.json` hinzu:

```json
{
  "mcpServers": {
    "dialex": {
      "command": "npx",
      "args": ["@dialexjs/mcp"]
    }
  }
}
```

### Verfügbare Werkzeuge

| Werkzeug                   | Typ        | Beschreibung                                                                               |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `dialex_config`            | Lesen      | Liest die statische Konfiguration (`locales`, `defaultLocale`), ohne Code auszuführen      |
| `dialex_list_dictionaries` | Lesen      | Listet alle gefundenen Wörterbuchdateien und deren Locales auf                             |
| `dialex_get_dictionary`    | Lesen      | Gibt Übersetzungsschlüssel und -werte pro Locale zurück                                    |
| `dialex_check`             | Lesen      | Führt Paritäts- und Referenzanalysen durch und gibt Probleme sowie Annotationen zurück     |
| `dialex_find_usages`       | Lesen      | Durchsucht eine Datei nach Wörterbuchaufrufen (`getDictionary`, `t(...)`)                  |
| `dialex_missing`           | Lesen      | Listet Schlüssel auf, die fehlen oder noch `[TODO]`-Platzhalter enthalten                  |
| `dialex_set_key`           | Bearbeiten | Setzt sicher einen String über AST; verhindert Überschreiben, außer wenn `overwrite: true` |
| `dialex_add_missing`       | Bearbeiten | Fügt fehlende Schlüssel über alle Locales hinweg als `[TODO]`-Vorlagen ein                 |
| `dialex_generate`          | Werkzeug   | Erzeugt `i18n.generated.ts` und `dialex-env.d.ts` neu                                      |

### Dokumentationsressourcen

Der Server stellt integrierte Markdown-Ressourcen unter `dialex://docs/<topic>` bereit:

- `dialex://docs/guide`
- `dialex://docs/translate`
- `dialex://docs/icu`
- `dialex://docs/adapters`

## Agenten-Skills

Dialex veröffentlicht Skills, die mit der `skills`-CLI kompatibel sind:

```bash
npx skills add awaiden/dialex
```

Zwei Skills sind enthalten:

- `dialex`: Kernkonzepte, Wörterbuchstruktur und Framework-Adapter-Muster.
- `dialex-translate`: Workflow zum Erkennen fehlender Übersetzungen, Einfügen von Platzhaltern und Überprüfen der ICU-Parität.

## Maschinenlesbare JSON-Ausgabe

Alle Dialex-CLI-Befehle unterstützen `--json` für die Integration in automatisierte Pipelines und KI-Agenten:

```bash
dialex check --json
dialex generate --json
dialex export --json
dialex import translations.json --json
dialex translate --dry-run --json
```

Die Ausgabe wird als strukturiertes JSON an stdout ausgegeben, während Protokolle und Warnungen unterdrückt werden. Bei Fehlern wird der Prozess mit einem Exit-Code ungleich null beendet.
