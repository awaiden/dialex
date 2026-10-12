# dialex lock

Zeichnet die vorhandenen Übersetzungen als aktuell zu ihrem jetzigen Ausgangstext auf, damit eine spätere Änderung der Quelle bemerkt werden kann. Es schreibt `dialex.lock.json` neben deine Konfiguration.

```bash
dialex lock                  # adopt the lock file; leave out-of-date translations alone
dialex lock --all            # also accept translations that are already out of date
dialex lock -s en --json
```

| Option                  | Beschreibung                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `-s, --source <locale>` | Die Locale, aus der die Übersetzungen entstanden. Standard: `translate.sourceLocale`, dann `defaultLocale` |
| `--all`                 | Auch bereits veraltete Übersetzungen aufzeichnen (so akzeptieren, wie sie sind)                            |
| `--json`                | Maschinenlesbares JSON ausgeben                                                                            |
| `-c, --config <path>`   | Eigener Konfigurationspfad                                                                                 |

## Was es tut

Für jeden String in einer anderen Locale als der Ausgangs-Locale speichert es einen kurzen Hash des Textes der Ausgangs-Locale für denselben Schlüssel, außer wenn:

- der Wert noch mit `[TODO] ` beginnt (er ist noch nicht übersetzt);
- sich der Ausgangstext seit einer Aufzeichnung geändert hat und `--all` nicht angegeben ist (er ist veraltet und wird stattdessen aufgelistet);
- der Wert eine Funktion oder ein anderer Nicht-String-Wert ist.

Führe es einmal aus, wenn du die Lock-Datei übernimmst, und erneut, nachdem du die Übersetzungen geprüft hast, die [`dialex check`](./check.md) als veraltet gemeldet hat. [`dialex translate`](./translate.md) und [`dialex import`](./import.md) zeichnen auf, was sie schreiben; danach brauchst du `lock` also nicht.

Wurde die Lock-Datei aus einer anderen Ausgangs-Locale geschrieben, sagt sie nichts über diese aus, und es wird eine neue begonnen.

## Ausgabe

```json
{ "success": true, "sourceLocale": "en", "recorded": 5, "stale": [] }
```

| Feld           | Beschreibung                                                                    |
| -------------- | ------------------------------------------------------------------------------- |
| `success`      | `true`, außer der Befehl ist fehlgeschlagen (etwa eine unlesbare Konfiguration) |
| `sourceLocale` | Die verwendete Ausgangs-Locale                                                  |
| `recorded`     | Wie viele Übersetzungen neu als aktuell aufgezeichnet wurden                    |
| `stale`        | Schlüssel, die noch veraltet sind und unangetastet blieben (nur ohne `--all`)   |

Der Exit-Code ist `0`, und `1`, wenn der Befehl nicht laufen konnte.

## Die Datei

```json
{ "version": 1, "sourceLocale": "en", "locales": { "tr": { "home.title": "a1b2c3d4" } } }
```

Die Schlüssel sind sortiert, sodass die Datei kleine, stabile Diffs erzeugt. Checke sie ein, damit das ganze Team denselben Stand sieht. Eine Übersetzung ohne Eintrag, etwa eine von Hand geschriebene, wird nie als veraltet gemeldet.
