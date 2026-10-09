# dialex generate

Kompiliert `.content.ts`-Wörterbücher zu statischen Modulen für eine Serverausführung ohne Overhead.

Ausgaben:

- `src/dialex.generated.ts`, das `dictionaries` exportiert (der Default-Export, für die Server-Adapter), `config` (eine clientsichere Kopie deiner Konfiguration) und `dialex` (`{ dictionaries, config }`, per Spread an `<DialexProvider {...dialex}>` oder `createDialex({ ...dialex })` übergeben). Mit `lazy: true` enthält sie stattdessen dynamische Imports und einen Export `loaders`.
- `src/dialex-env.d.ts`, die [Erweiterung der Typ-Registry](../guide/type-safety.md).

```bash
dialex generate
dialex generate --watch
dialex gen -o src/custom.generated.ts
```

| Option                | Beschreibung                                                  |
| --------------------- | ------------------------------------------------------------- |
| `-w, --watch`         | Beobachtet Wörterbuchdateien und generiert bei Änderungen neu |
| `-o, --output <path>` | Eigener Ausgabepfad für die generierten Wörterbücher          |
| `-c, --config <path>` | Eigener Konfigurationspfad                                    |

Führe es aus, bevor du eine serverseitige App baust oder startest, üblicherweise über das Skript `dx:generate`, das `init` hinzufügt.

Nichts erzeugt diese Datei für dich, halte sie also aktuell: Führe `dialex generate --watch` in einem zweiten Terminal aus (es reagiert auf hinzugefügte, geänderte und entfernte Wörterbuchdateien sowie auf Konfigurationsänderungen), nutze die Dialex-VS-Code-Erweiterung (sie erzeugt beim Speichern neu) oder führe `dx generate` vor `dev` und `build` aus. [`dialex check`](./check.md) meldet eine veraltete Datei als Fehler, und `dialex check --fix` schreibt sie neu. Ohne `dialex.config.*` gelten die Standardwerte, und `locales` stammen aus deinen Wörterbüchern. `check` vergleicht die generierten Dateien ohne Formatierung (Leerraum, Anführungszeichen, abschließende Kommas), daher darf ein Formatierer wie Prettier, Biome oder oxfmt sie umschreiben. Sie in dessen Ignorierliste einzutragen vermeidet laute Diffs.
