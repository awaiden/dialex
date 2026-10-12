# Fehlerbehebung

Finde das Symptom, lies die Ursache, wende die Lösung an. Probleme, die nur ein Framework betreffen, stehen auf dessen Seite; der Rest steht hier. Was eine `check`-Meldung bedeutet, steht in der [Diagnose-Referenz](./diagnostics.md).

## Typen und generierte Dateien

### `t("home.title")` oder `getDictionary("home")` wird nicht vervollständigt oder typisiert

Die Typen stammen aus `dialex-env.d.ts`, das `dialex generate` schreibt. Prüfe der Reihe nach:

1. Die Datei existiert: Führe `dialex generate` aus.
2. TypeScript bezieht sie ein. Füge sie (oder ihren Ordner) zu `include` in `tsconfig.json` hinzu und starte den TypeScript-Server im Editor neu.
3. `moduleResolution` ist `"bundler"`, `"node16"` oder `"nodenext"` (siehe [Voraussetzungen](./requirements.md)).
4. Die generierte Datei ist aktuell: Führe `dialex generate --watch` aus oder nutze die Editor-Erweiterung, die beim Speichern neu generiert.

### Ich habe ein Wörterbuch geändert und die Typen haben sich nicht aktualisiert

Nichts baut die generierten Dateien für dich neu. Führe `dialex generate` aus, lass `dialex generate --watch` laufen oder nutze die [VS-Code-Erweiterung](./vscode.md). `dialex check` meldet eine veraltete Datei als Fehler, sodass ein CI-Lauf sie findet.

### `Cannot find module 'dialexjs/react'` (oder ein anderer Subpfad)

`moduleResolution` ist `"node"` (auch `node10` genannt), das die `exports`-Map des Pakets nicht liest. Setze es auf `"bundler"` oder `"nodenext"`.

### `dialex check` sagt, die generierte Datei sei veraltet, obwohl ich sie gerade generiert habe

Ein Formatter (Prettier, Biome, oxfmt) hat sie womöglich umgeschrieben. `check` ignoriert Leerraum, Anführungszeichen und abschließende Kommas, Formatierung allein verursacht das also nicht: Suche nach anderen `locales` oder `include`, einem nach dem letzten Lauf geänderten Wörterbuch oder einem `dialex generate` mit `-o`, während `check` den Standardpfad ansieht. Nimm die generierten Dateien in die Ignore-Liste deines Formatters auf, um störende Diffs zu vermeiden.

## Locales und Wörterbücher

### `[dialex] Dictionary "x" not found`

Das Wörterbuch steht nicht in `dialex.generated.ts`. Prüfe, dass seine Datei zu `include` passt (Standard `**/*.content.ts`), nicht durch `.gitignore` oder `exclude` ausgeschlossen ist, `export default defineDictionary("x", ...)` verwendet und der Name exakt übereinstimmt. Führe dann `dialex generate` aus.

### `[dialex] Locale "tr" not found in dictionary "x", using "en"`

Das Wörterbuch hat keinen `tr`-Inhalt, daher wurde die [Fallback-Kette](./fallbacks.md) verwendet. Füge die Locale hinzu oder führe `dialex check --fix` aus, um die fehlenden Schlüssel anzulegen.

### Die App rendert immer die Standard-Locale

Keine Quelle lieferte eine unterstützte Locale. Die Erkennungsreihenfolge ist ein eigener Extraktor, das erste URL-Segment, `?locale=` / `?lang=`, das Cookie `locale` / `lang`, dann `Accept-Language`. Prüfe: `locales` ist gesetzt (ohne wird ein Pfadpräfix wie `/tr` ignoriert), der Client sendet das Cookie oder den Header wirklich, und der Adapter ist vor den Routen registriert. Siehe [Locale-Erkennung](./locale-detection.md).

### Die Locale ändert sich im Client, aber der Server rendert eine andere

Server und Client lösen die Locale getrennt auf. Übergib dem Provider die Locale, mit der der Server gerendert hat, als `initialLocale`, damit das erste Client-Rendering passt. Eine gemerkte Locale wird absichtlich nach dem Mount angewendet, damit die Hydration übereinstimmt.

### `useDialex must be used within a DialexProvider`

Die Komponente wird außerhalb des Providers gerendert. Setze `<DialexProvider {...dialex}>` an die Wurzel, über jede Komponente, die einen Hook nutzt, und importiere die Hooks aus demselben Einstiegspunkt wie den Provider.

### Das Wörterbuch ist beim ersten Rendern leer

Du nutzt `lazy`-Laden, daher ist ein Wörterbuch leer (oder suspendiert in React), bis es geladen ist. Nenne die Wörterbücher, die du liest (`useT("home")`), umschließe React mit `<Suspense>` oder rufe [`preloadDictionaries`](../api/client-frameworks.md#preloaddictionaries) vor dem Rendern auf. Siehe [Lazy Loading](./lazy-loading.md).

## Nachrichten

### `t("cart.items", { count })` gibt die rohe Nachricht zurück

Entweder ließ sich der String nicht parsen (die Konsole zeigt `[dialex] Could not format ...`) oder es wurde kein Werteobjekt übergeben: Ein String ohne Werte wird unverändert zurückgegeben. Führe `dialex check` für den genauen ICU-Fehler aus.

### Wörtliche Klammern oder Apostrophe erscheinen falsch

In ICU beginnen und beenden `{` und `}` Argumente, und `'` maskiert sie. Schreibe eine wörtliche Klammer als `'{'` und einen Apostroph als `''`. Ein einzelnes `'` vor einem Buchstaben bleibt unverändert. Siehe [ICU-Nachrichten](./icu.md).

### Ein Plural zeigt in einer anderen Sprache die falsche Form

Die Sprache braucht Kategorien, die deine Nachricht nicht liefert (Russisch braucht `few` und `many`, Arabisch sechs). `dialex check` warnt mit `icu-plural-categories`. Füge die Optionen hinzu; `other` ist der Fallback.

## CLI und native Binärdateien

### `dx` ist langsam, oder ich will wissen, ob die native Binärdatei läuft

Führe `DIALEX_NATIVE=1 dx check` aus: Endet es mit `native check declined`, steht der Grund in der Meldung. Siehe [Native Binärdateien](./native.md).

### `dialex: this command needs the Node CLI (@dialexjs/cli), which was not found`

Die native Binärdatei wurde allein gestartet, ohne die Node-CLI daneben. Installiere `@dialexjs/cli` im Projekt, setze `DIALEX_NODE_CLI` auf deren `dist/index.mjs` oder nutze `DIALEX_NATIVE=0`.

### `dx` läuft in Node, obwohl ich das Paket installiert habe

Das Plattformpaket wurde nicht installiert (`--no-optional`, eine nicht unterstützte Plattform oder Alpine/musl) oder die Plattform wird nicht unterstützt. `npm ls @dialexjs/cli-linux-x64` (nimm deine Plattform) zeigt, ob es da ist. Das Ergebnis ist dasselbe, nur langsamer.

### `dialex check` meldet nichts für ein Wörterbuch

Das Wörterbuch nutzt Spreads, berechnete Schlüssel oder importierte Werte und ließ sich nicht aus dem Syntaxbaum lesen. `dialex check` wertet eine solche Datei aus; der Editor überspringt sie. Siehe [Wörterbücher](./dictionaries.md#what-the-tools-can-read).

### `dialex translate` sagt, es sei kein Provider konfiguriert

Setze `translate.provider` in `dialex.config.ts`. Siehe [`dialex translate`](../cli/translate.md).

## Editoren

### Der Editor zeigt keine Diagnosen, Hover oder Vervollständigung

- Der Workspace hat kein Dialex-Projekt: Es braucht eine `dialex.config.*` oder eine `*.content.ts`-Datei neben einer `package.json`.
- Die Erweiterung oder der Server ist deaktiviert: Prüfe die Einstellung `dialex.enable`.
- Das Wörterbuch nutzt Spreads oder berechnete Schlüssel: Es wird als nicht analysierbar gemeldet und übersprungen.
- Die Datei wird von `.gitignore` oder `exclude` ignoriert.
- Der Language Server ist nicht gestartet: In Zed braucht er Node.js; der Grund steht im Server-Log.

### Ungenutzte Schlüssel werden nie angezeigt

Sie sind standardmäßig aus. Schalte die Einstellung `unusedKeys` ein; sie erscheinen dann als ausgeblendeter Text.

## Immer noch festgefahren

Führe `dialex check --json` und `dialex --version` aus und eröffne ein Issue auf [GitHub](https://github.com/awaiden/dialex/issues) mit der Ausgabe, deiner `dialex.config.*` und dem kleinsten Wörterbuch, das das Problem zeigt.
