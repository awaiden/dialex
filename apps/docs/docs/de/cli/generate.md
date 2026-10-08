# dialex generate

Kompiliert `.content.ts`-Wörterbücher zu statischen Modulen für eine Serverausführung ohne Overhead.

Ausgaben:

- `src/i18n.generated.ts`, die statische Wörterbuch-Map, die du als `dictionaries` übergibst.
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

Führe es aus, bevor du eine serverseitige App baust oder startest, üblicherweise über das Skript `i18n:generate`, das `init` hinzufügt.
