# Bewährte Vorgehensweisen

Diese Empfehlungen gelten für jedes Framework. Jede ergibt sich aus der Funktionsweise von Dialex: Die Wörterbücher werden zu `dialex.generated.ts` kompiliert, das Locale wird einmal pro Anfrage oder pro App ermittelt, und die Typen stammen aus deinen Wörterbüchern.

## Wörterbücher organisieren

- Lege pro Funktion oder Seite ein Wörterbuch an, direkt neben dem Code, der es verwendet (`checkout.content.ts` neben der Checkout-Seite). Kleine Dateien lassen sich leicht prüfen, übersetzen und lazy laden.
- Lege Text, der in der ganzen App geteilt wird, in ein Wörterbuch `common` und halte alles andere heraus, damit es nicht zum Sammelbecken wird.
- Gib jedem Wörterbuch dieselben Locales. `dx check` meldet fehlende Schlüssel und Locales, und die Editor-Erweiterungen zeigen sie beim Tippen an.

## Schlüssel nach Bedeutung benennen

Ein Schlüssel sagt, wofür der Text da ist, nicht was er gerade sagt. Ändert sich der Wortlaut, bleiben Schlüssel und alle Aufrufstellen gleich.

```ts
// Good: the key describes the role
defineDictionary("checkout", {
  en: { payButton: "Pay now", emptyCart: "Your cart is empty" },
  tr: { payButton: "Şimdi öde", emptyCart: "Sepetiniz boş" },
});

// Avoid: the key repeats the English text, and breaks when the text changes
defineDictionary("checkout", {
  en: { payNow: "Pay now", yourCartIsEmpty: "Your cart is empty" },
});
```

Fasse zusammengehörige Schlüssel unter einem Objekt zusammen (`nav.about`, `nav.contact`) und halte die Verschachtelung flach, zwei bis drei Ebenen. Tiefere Bäume sind in `t("...")`-Aufrufen schwer lesbar.

## Nachrichten schreiben, die Übersetzer vollenden können

- Verwende [ICU-Nachrichten](./icu.md) für Plurale, Auswahl und Zahlen: `{count, plural, one {# item} other {# items}}`. Baue nie einen Satz aus Teilen zusammen (`"You have " + n + " items"`), denn Wortstellung und Pluralformen unterscheiden sich zwischen Sprachen.
- Bevorzuge ICU-Zeichenketten gegenüber Funktionswerten für Text, der an Übersetzer geht. Funktionen sind für Logik in Ordnung, die nur Entwickler anfassen, aber Übersetzungswerkzeuge und `dx check` können eine ICU-Zeichenkette prüfen und nicht in eine Funktion hineinsehen.
- Halte Platzhalter in jedem Locale gleich. `dx check` meldet ein Locale, dessen Argumente von den anderen abweichen.

```ts
defineDictionary("cart", {
  en: { items: "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}" },
  tr: { items: "{count, plural, =0 {Sepetiniz boş} other {# ürün}}" },
});

t("cart.items", { count: 3 }); // "3 items"; `count` is checked at compile time
```

## Die generierte Datei aktuell halten

- Committe `dialex.generated.ts` und `dialex-env.d.ts`. Die App importiert sie, und ein frischer Checkout sollte ohne Generierungsschritt bauen.
- Halte sie beim Entwickeln mit `dx generate --watch` aktuell oder nutze die VS-Code- oder Zed-Erweiterung, die sie bei einer Wörterbuchänderung für dich neu erzeugt.
- Führe in der CI `dx check --fail-on-stale` aus. Es schlägt fehl, wenn die committete generierte Datei nicht mehr zu den Wörterbüchern passt, wenn Schlüssel oder Locales fehlen und wenn Übersetzungen veraltet sind.

```yaml
# .github/workflows/ci.yml
- run: bun install --frozen-lockfile
- run: bunx dx check --fail-on-stale
```

## Das Locale an einer Stelle ermitteln

- Ermittle das Locale einmal pro Anfrage (auf dem Server) oder einmal pro App (im Browser) und gib es weiter. Lies Cookies oder `navigator.language` nicht in einzelnen Komponenten.
- Gib dem Client bei serverseitigem Rendering das Locale mit, das der Server verwendet hat (`initialLocale`), damit das erste Client-Rendering zum HTML passt. Sonst blitzt die falsche Sprache auf oder die Hydration meldet eine Abweichung.
- Setze `<html lang>` auf das aktive Locale. Die Provider für React, Svelte und Solid erledigen das für dich; auf dem Server schreibst du es in das gerenderte HTML.
- Merke dir die Wahl des Besuchers im Cookie `locale`, das die Server-Adapter lesen, statt in `localStorage`, das der Server nicht sehen kann.

## Nur laden, was eine Seite braucht

- Kleine Apps brauchen kein Lazy Loading: Alle Wörterbücher in einem Bundle sind am einfachsten und am schnellsten. Schalte es ein, wenn die Wörterbücher einen spürbaren Teil des Bundles ausmachen.
- Mit `lazy: "locale"` lädt ein Besucher nur die Wörterbücher der geöffneten Seite, in der verwendeten Sprache. Siehe [Lazy Loading](./lazy-loading.md).
- Lade vor, was die nächste Navigation braucht (`preloadDictionaries(dialex, "checkout")`), damit die Seite nicht auf einen Download wartet.

## Mit Prüfschritt übersetzen

- `dx translate` füllt fehlende Schlüssel mit `[TODO]`-Platzhaltern oder maschinellen Übersetzungen. Behandle die Ausgabe wie jede andere Änderung: Prüfe den Diff vor dem Mergen.
- Committe `dialex.lock.json`. Sie hält fest, aus welchem Quelltext jede Übersetzung entstand, sodass `dx check` und `dx translate --stale` erkennen, wenn sich das Englische geändert hat und die Übersetzung nicht.
- Suche vor einem Release nach `[TODO]`. `dx check` meldet jeden Platzhalter, der noch vorhanden ist.

## Mit den echten Wörterbüchern testen

- Rendere Komponenten mit demselben `dialex`-Export wie die App und prüfe den Text eines Locales. [Testen](./testing.md) bietet Wrapper für React und Vue.
- Teste mindestens das Standard-Locale und ein weiteres, damit ein fehlender Schlüssel oder eine Pluralform im Testlauf auffällt und nicht in der Produktion.

## Mit dem Editor arbeiten

- Installiere die [VS-Code-Erweiterung](./vscode.md) oder nutze [Zed und andere Editoren](./zed.md) über den Language Server. Du erhältst Diagnosen, Hover, Gehe zu Definition, Autovervollständigung und Schnellkorrekturen für Schlüssel.
- Speichere ein Wörterbuch in einer Variablen (`const home = useDictionary("home")`), und der Editor löst `home.title` weiterhin auf.
- Halte generierte Dateien und Build-Ausgaben aus dem Scan heraus: Dialex beachtet bereits `.gitignore`, und `exclude` in `dialex.config.ts` deckt den Rest ab.

## Checkliste

| Vor dem Release                                   | Befehl oder Einstellung                    |
| ------------------------------------------------- | ------------------------------------------ |
| Wörterbücher und generierte Datei stimmen überein | `dx check --fail-on-stale`                 |
| Keine fehlenden Schlüssel oder Locales            | `dx check`                                 |
| Keine übrig gebliebenen Platzhalter               | `[TODO]`                                   |
| Übersetzungen passen zum Quelltext                | `dx translate --stale`, `dialex.lock.json` |
| `<html lang>` folgt dem Locale                    | Provider oder Server-Markup                |
| Das Bundle enthält nur nötige Wörterbücher        | `lazy: "locale"`                           |
