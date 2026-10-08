# Angular

`dialex/angular` stellt das aktive Locale, die Wörterbücher und `t` als Angular-Signals bereit.

::: warning Versionen
Entwickelt und getestet mit Angular 22. Es verwendet nur `signal`, `computed`, `inject`, `InjectionToken`, `makeEnvironmentProviders` und `afterNextRender` und ist daher für Angular 17 und neuer geschrieben, ältere Versionen wurden aber nicht getestet. Es wurde nicht in einer Angular-CLI-Anwendung ausgeführt; die Tests betreiben einen echten Angular-Anwendungs-Injector in einer DOM-Umgebung.
:::

## Einrichtung

Die Angular CLI führt das Vite-Plugin von Dialex nicht aus, daher werden die Wörterbücher explizit übergeben. Generiere sie mit der CLI:

```bash
dialex generate        # writes src/i18n.generated.ts
```

```ts
// src/app/app.config.ts
import { ApplicationConfig } from "@angular/core";
import { provideDialex } from "dialex/angular";
import dictionaries from "../i18n.generated";

export const appConfig: ApplicationConfig = {
  providers: [
    provideDialex({
      dictionaries,
      defaultLocale: "en",
      locales: ["en", "tr"],
    }),
  ],
};
```

Führe `dialex generate` (oder `dialex generate --watch`) erneut aus, wenn du ein Wörterbuch änderst.

## In einer Komponente verwenden

```ts
import { Component } from "@angular/core";
import { injectDictionary, injectI18n, injectT } from "dialex/angular";

@Component({
  selector: "app-header",
  template: `
    <h1>{{ dict().title }}</h1>
    <p>{{ t("home.items", { count: 3 }) }}</p>
    <button (click)="toggle()">{{ i18n.locale() }}</button>
  `,
})
export class HeaderComponent {
  protected readonly i18n = injectI18n();
  protected readonly dict = injectDictionary("home"); // Signal of the dictionary
  protected readonly t = injectT();

  toggle() {
    this.i18n.setLocale(this.i18n.locale() === "en" ? "tr" : "en");
  }
}
```

| Funktion                 | Liefert                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `injectI18n()`           | Den Store: `locale` (ein `Signal<string>`), `setLocale(locale)`, `dictionary(name)`, `t`                      |
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
  dictionaries,
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
  providers: [provideDialex({ dictionaries, defaultLocale: "tr", persist: false })],
});
```

Für Code, der Angular nicht benötigt, verwende [`createTestI18n`](../guide/testing.md).
