# Angular

`dialexjs/angular` stellt das aktive Locale, die Wörterbücher und `t` als Angular-Signals bereit.

::: warning Versionen
Entwickelt und getestet mit Angular 22. Es verwendet nur `signal`, `computed`, `inject`, `InjectionToken`, `makeEnvironmentProviders` und `afterNextRender` und ist daher für Angular 17 und neuer geschrieben, ältere Versionen wurden aber nicht getestet. Es wurde nicht in einer Angular-CLI-Anwendung ausgeführt; die Tests betreiben einen echten Angular-Anwendungs-Injector in einer DOM-Umgebung.
:::

## Einrichtung

Angular erhält die Wörterbücher explizit, wie die Server-Adapter. Erzeuge sie mit der CLI:

```bash
dialex generate        # writes src/dialex.generated.ts
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideDialex } from "dialexjs/angular";

import { dialex } from "../dialex.generated";

export const appConfig: ApplicationConfig = {
  providers: [provideDialex({ ...dialex })],
};
```

Führe `dialex generate` (oder `dialex generate --watch`) erneut aus, wenn du ein Wörterbuch änderst.

## In einer Komponente verwenden

```ts
import { Component } from "@angular/core";
import { injectDictionary, injectDialex, injectT } from "dialexjs/angular";

@Component({
  selector: "app-header",
  template: `
    <h1>{{ dict().title }}</h1>
    <p>{{ t("home.items", { count: 3 }) }}</p>
    <button (click)="toggle()">{{ dialex.locale() }}</button>
  `,
})
export class HeaderComponent {
  protected readonly dialex = injectDialex();
  protected readonly dict = injectDictionary("home"); // Signal of the dictionary
  protected readonly t = injectT();

  toggle() {
    this.dialex.setLocale(this.dialex.locale() === "en" ? "tr" : "en");
  }
}
```

| Funktion                 | Liefert                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `injectDialex()`         | Den Store: `locale` (ein `Signal<string>`), `setLocale(locale)`, `dictionary(name)`, `t`                      |
| `injectDictionary(name)` | Ein `Signal` mit dem Wörterbuch für das aktive Locale, unter Beachtung der [Fallbacks](../guide/fallbacks.md) |
| `injectT()`              | Eine [`t`-Funktion](../guide/key-paths.md) für das aktive Locale, mit [ICU](../guide/icu.md)-Unterstützung    |

Rufe sie in einem Injection-Kontext auf, etwa in einem Feld-Initialisierer oder im Konstruktor. Da `t` bei jedem Aufruf das Locale-Signal liest, hält ein Aufruf aus einem Template dieses Template aktuell, wenn sich das Locale ändert.

### Warum es keine `| t`-Pipe gibt

Angular-Pipes benötigen den eigenen Compiler von Angular, und Dialex wird wie seine anderen Adapter als reines JavaScript ausgeliefert. Die Funktion `t` funktioniert in Templates genauso: `{{ t('home.title') }}`.

## Optionen

| Option          | Standard     | Beschreibung                                                                                                                                                               |
| --------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dictionaries`  | erforderlich | `defineDictionary`-Ergebnisse oder eine Map `{ name: { locale: content } }`, meist aus `dialex generate`                                                                   |
| `defaultLocale` | `"en"`       | Locale, das verwendet wird, wenn nichts anderes entscheidet                                                                                                                |
| `locales`       |              | Unterstützte Locales. Ein gespeichertes Locale außerhalb dieser Liste wird ignoriert                                                                                       |
| `fallbacks`     |              | Explizite [Fallback-Ketten](../guide/fallbacks.md)                                                                                                                         |
| `initialLocale` |              | Das Locale, das zuerst gerendert wird: ein String oder eine Funktion, die im Injection-Kontext läuft. Ist es gesetzt, wird das gespeicherte Locale danach nicht angewendet |
| `persist`       | `"cookie"`   | Wo die Wahl gespeichert wird: `"cookie"`, `"localStorage"` oder `false`                                                                                                    |
| `storageKey`    | `"locale"`   | Cookie- oder localStorage-Schlüssel                                                                                                                                        |

Das gespeicherte Locale wird nach dem ersten Rendering angewendet, sodass das serverseitig gerenderte Markup und das erste Client-Rendering immer übereinstimmen. `<html lang>` folgt dem aktiven Locale.

## Server-Side-Rendering

Mit Angular SSR findet das erste Rendering auf dem Server statt. Teile Dialex daher mit, welches Locale die Anfrage möchte, indem du `initialLocale` als Funktion übergibst. Sie läuft im Injection-Kontext und kann daher `inject()` für das verwenden, was dein Server bereitstellt:

```ts
import { inject } from "@angular/core";
import { REQUEST } from "@angular/core"; // location depends on your Angular SSR version

provideDialex({
  ...dialex,
  initialLocale: () => {
    const request = inject(REQUEST, { optional: true });
    const cookie = request?.headers.get("cookie") ?? "";
    return /(?:^|;\s*)locale=([^;]+)/.exec(cookie)?.[1] ?? "en";
  },
});
```

::: warning Ungetestetes Rezept
Die Funktion `initialLocale` ist durch Tests abgedeckt, dieses `REQUEST`-Beispiel wurde jedoch nicht in einem echten Angular-SSR-Setup ausgeführt. Name und Importpfad des Tokens haben sich zwischen Angular-Versionen geändert; prüfe die SSR-Dokumentation deiner Version.
:::

## Lazy Loading

Wörterbücher werden beim Start übergeben, daher gilt [Lazy Loading](../guide/lazy-loading.md) nicht für Angular. Teile große Wörterbücher auf, indem du nur die benötigten in die übergebenen `dictionaries` importierst.

## Testen

`provideDialex` funktioniert in `TestBed` wie jeder Provider:

```ts
TestBed.configureTestingModule({
  providers: [provideDialex({ ...dialex, defaultLocale: "tr", persist: false })],
});
```

Für Code, der Angular nicht benötigt, verwende [`createTestDialex`](../guide/testing.md).

## Bewährte Vorgehensweisen

- Konfiguriere Dialex einmal mit `provideDialex({ ...dialex })` in `app.config.ts` und lies es mit `injectDictionary` und `injectT` in Komponenten. Sie liefern Signals, sodass Templates sich von selbst aktualisieren.
- Übergib bei Angular SSR `initialLocale` als Funktion, die die Anfrage liest, damit Server und Browser in derselben Sprache starten.
- Wechsle das Locale mit `setLocale` aus `injectDialex()` und überlasse den Rest den Signals; es gibt absichtlich keine `| t`-Pipe, weil eine reine Pipe dem Locale nicht folgen würde.

## Fehlerbehebung

- **`NG0203: inject() must be called from an injection context`**: `injectDictionary` oder `injectT` wurde außerhalb eines Konstruktors, Feldinitialisierers oder `runInInjectionContext` aufgerufen.
- **Text aktualisiert sich im Template nicht**: Das Signal wurde einmal im Klassenrumpf gelesen. Rufe es im Template (`dict().title`) oder in einem `computed` auf.
- **`[dialex] Dictionary "x" not found`**: Das Wörterbuch ist nicht in `dialex.generated.ts`. Führe `dx generate` aus und prüfe, ob `include` in `dialex.config.ts` zur Datei passt.
