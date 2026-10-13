# FAQ

Kurze Antworten mit Links zur Seite, die die Einzelheiten enthält.

## Entwurf

### Warum sind Wörterbücher TypeScript-Dateien und kein JSON?

Damit der Compiler sie prüfen kann. Ein Wörterbuch ist Code: Seine Schlüssel sind typisiert, ein Wert kann eine Funktion mit typisierten Parametern sein, und Editoren können von `t("home.title")` zur Definition springen. JSON bleibt an den Rändern verfügbar: [`dialex export`](../cli/export.md) schreibt JSON, CSV oder XLIFF für Übersetzer, und [`dialex import`](../cli/import.md) schreibt ihre Arbeit zurück in die TypeScript-Dateien.

### Kann ich Übersetzungen zur Laufzeit aus einer API oder Datenbank laden?

Dialex ist für Übersetzungen gebaut, die mit der App ausgeliefert werden. Ein Wörterbuch ist ein beliebiges Objekt; du kannst eines selbst füllen und als `dictionaries` an einen Adapter oder Provider übergeben, aber dann ist es nicht typisiert, geprüft oder für dich generiert. Für Inhalte, die sich ohne Deployment ändern, nimm dein CMS und halte UI-Strings in Dialex.

### Wie groß ist die Laufzeit?

Die Funktion `t()` mit ICU-Parser und -Formatter hat etwa 8 KB minifiziert (3 KB gzip); `dialexjs/icu` allein etwa 7 KB. Die Framework-Adapter sind darüber klein. Die gemessenen Zahlen und den Vergleich mit anderen Bibliotheken findest du unter [Benchmarks](./benchmarks.md).

### Funktioniert es mit Server-Side Rendering?

Ja. Die Server-Adapter lösen die Locale pro Request auf, und die UI-Provider nehmen ein `initialLocale`, damit das erste Client-Rendering zu dem des Servers passt. Eine gemerkte Locale wird absichtlich nach dem Mount angewendet, damit die Hydration nie abweicht. Siehe deine [Framework-Seite](../frameworks/README.md).

## Locales

### Wie füge ich eine Sprache hinzu?

1. Füge sie zu `locales` in `dialex.config.ts` hinzu.
2. Führe `dialex check --fix` aus: Jedes Wörterbuch erhält die fehlenden Schlüssel, kopiert aus der Standard-Locale und mit `[TODO]` markiert.
3. Übersetze sie: von Hand, mit [`dialex translate`](../cli/translate.md) und einem Provider oder über [`export`/`import`](../cli/export.md).
4. Führe `dialex generate` und `dialex check` aus.

### Wählt Dialex die Sprache aus dem Browser?

Auf dem Server ja: Adapter lesen `Accept-Language`, die URL, den Query-String und Cookies, in dieser [Reihenfolge](./locale-detection.md). Im Browser lesen die Provider `navigator.language` nicht: Sie nutzen die vom Server aufgelöste Locale und die Wahl des Nutzers (in einem Cookie oder `localStorage` gehalten). React Native übernimmt die Gerätesprachen über `deviceLocales`.

### Was passiert, wenn eine Übersetzung fehlt?

Die Suche folgt der [Fallback-Kette](./fallbacks.md): die Locale selbst, explizite `fallbacks`, die Sprache ohne Region (`pt-BR` zu `pt`), dann die Standard-Locale. Hat nichts den Schlüssel, warnt `t()` und gibt den Pfad zurück. `dialex check` meldet fehlende Schlüssel, damit sie nicht in die Produktion gelangen.

### Unterstützt es Rechts-nach-links-Sprachen?

Dialex übersetzt Text und formatiert Zahlen und Datumswerte; es setzt nicht die Textrichtung. Die Provider halten `<html lang>` mit der Locale synchron. Leite `dir` selbst aus der Locale ab, etwa `dir={["ar", "he", "fa"].includes(locale) ? "rtl" : "ltr"}`.

### Wie funktionieren Plurale in Sprachen mit vielen Formen?

Nachrichten nutzen ICU `plural` und `selectordinal` mit den CLDR-Regeln der Locale über `Intl.PluralRules`. Russisch braucht `one`, `few`, `many` und `other`; Arabisch hat sechs Kategorien. `dialex check` warnt, wenn einer Nachricht eine Kategorie fehlt, die ihre Sprache braucht. Siehe [ICU-Nachrichten](./icu.md).

## Arbeitsablauf

### Muss ich `dialex generate` ständig ausführen?

Führe während der Entwicklung `dialex generate --watch` aus oder nutze die [VS-Code-Erweiterung](./vscode.md), die beim Speichern neu generiert. In der CI führe `dialex check` aus: Es schlägt fehl, wenn die generierten Dateien veraltet sind.

### Wo soll ich die generierten Dateien einchecken?

Beides funktioniert. Eingecheckt, besteht ein frischer Klon die Typprüfung ohne Build-Schritt; ignoriert, muss jede Installation `dialex generate` ausführen. `dialex check` vergleicht die generierten Dateien mit dem, was `generate` schreiben würde; wenn du sie eincheckst, hält die CI sie also ehrlich.

### Wie arbeiten Übersetzer damit?

Gib ihnen die Ausgabe von [`dialex export`](../cli/export.md) (JSON, CSV oder XLIFF); sie sehen nie TypeScript. Hole ihre Arbeit mit [`dialex import`](../cli/import.md) zurück, das ICU-Nachrichten validiert und unbekannte Schlüssel ablehnt. Oder lass einen Provider mit [`dialex translate`](../cli/translate.md) übersetzen und nutze `dialex lock`, um zu bemerken, wenn sich ein Ausgangstext später ändert.

### Sendet `dialex translate` meinen Code irgendwohin?

Nein. Es wird nichts gesendet, solange du keinen Provider konfigurierst, und dann gehen nur die zu übersetzenden Strings (nicht dein Code) in Paketen an diesen Provider. `dialex translate --dry-run` listet auf, was gesendet würde.

### Kann ich es in einem Monorepo nutzen?

Ja. Jedes Paket mit einer `dialex.config.*` (oder nur `*.content.ts`-Dateien) ist ein Projekt. Die CLI arbeitet vom Ordner aus, in dem du sie ausführst, und das Editor-Tooling findet jedes Projekt im Workspace und hält verschachtelte Projekte auseinander. Die `.gitignore`-Dateien des Repositorys werden beachtet.

## Werkzeuge

### Warum überspringt der Editor eines meiner Wörterbücher?

Er kann es nicht lesen, ohne Code auszuführen: Es nutzt einen Spread, einen berechneten Schlüssel, einen importierten Wert oder einen berechneten Namen. Nutze Objektliterale oder akzeptiere, dass `dialex check` (das die Datei auswertet) die Prüfung für diese Datei ist. Siehe [Wörterbücher](./dictionaries.md#what-the-tools-can-read).

### Was bedeutet „vor 1.0“ für mich?

Die API kann sich zwischen Minor-Versionen ändern. Breaking Changes erscheinen in einem Minor-Release, stehen im [Changelog](./changelog.md), und Patch-Releases bleiben kompatibel. Pinne die Minor-Version, die du nutzt.
