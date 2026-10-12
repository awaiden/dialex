# Benchmarks

Zahlen zu den Teilen einer i18n-Bibliothek, die in den Browsern deiner Nutzer und auf deinen Servern laufen: wie schnell eine Nachricht formatiert wird und wie viele Bytes die Bibliothek zu einem Bundle hinzufügt. Verglichen werden Dialex, [i18next](https://www.i18next.com), [intl-messageformat](https://formatjs.github.io) (der FormatJS-Kern hinter `react-intl`), [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) und [Intlayer](https://intlayer.org).

::: tip Als Orientierung lesen, nicht als Urteil
Ein Micro-Benchmark misst eine Sache auf einer Maschine. Die Kosten deiner App liegen meist woanders: Rendering, Netzwerk, Daten. Nutze diese Zahlen, um die Bibliotheken untereinander zu vergleichen, und führe den Benchmark auf deiner eigenen Hardware aus, bevor du dich darauf verlässt.
:::

## Was gemessen wird

Vier Nachrichten, von jeder Bibliothek auf Englisch formatiert, mit denselben Werten. Bevor etwas gemessen wird, prüft der Runner, dass alle Bibliotheken denselben Text zurückgeben.

| Fall          | Nachricht                                                       |
| ------------- | --------------------------------------------------------------- |
| Lookup        | `Hello, world`                                                  |
| Interpolation | `Hello, {name}!`                                                |
| Plural        | `{count, plural, =0 {No items} one {# item} other {# items}}`   |
| Verschachtelt | Ein `select` auf `gender`, das ein `plural` auf `count` enthält |

Jede Bibliothek wird so verwendet, wie ihre Dokumentation es empfiehlt:

- **dialexjs**: `t("dictionary.key", values)` auf ICU-Strings. `function messages` sind TypeScript-Funktionen, `formatMessage` ist der Formatter allein.
- **dialexjs dictionary object**: `getDictionary("home").title`, das das aufgelöste Wörterbuch liefert. Nur der Lookup-Fall trifft zu, weil eine Nachricht mit Werten über `t()` läuft. `dictionary object` liest aus einem einmal geholten Wörterbuch; `getDictionary per call` löst das Wörterbuch bei jedem Aufruf auf.
- **i18next**: eigene Interpolation und Plural-Schlüssel (`items_one`, `items_other`). Es hat kein Inline-`select`, daher wird der verschachtelte Fall nicht ausgeführt.
- **intl-messageformat**: ein Formatter, der einmal pro Nachricht erzeugt und wiederverwendet wird. `no cache` erzeugt ihn bei jedem Aufruf, was passiert, wenn eine App die Instanz nicht behält.
- **@lingui/core**: vorab kompilierte Nachrichten, wie es `lingui compile` tut.
- **Paraglide JS**: Nachrichten, die `paraglide-js compile` zu Funktionen kompiliert (`m.plural({ count })`), im Standard-Nachrichtenformat von inlang.
- **Intlayer**: Inhalt, der in einer `.content.ts`-Datei deklariert und mit `intlayer build` gebaut wird. Das Wörterbuch wird einmal gelesen, wie es eine Komponente mit `useIntlayer` tut. `getIntlayer per call` liest es bei jedem Aufruf.

## Durchsatz

Operationen pro Sekunde, höher ist besser. Median von 7 Runden à 400 ms nach 300 ms Aufwärmen.

Dialex ist grün. Die Balken sind innerhalb eines Diagramms maßstabsgetreu; vergleiche Längen innerhalb eines Diagramms, nicht zwischen Diagrammen.

<BenchmarkChart metric="plural" title="Plural" subtitle="Operationen pro Sekunde, höher ist besser" unsupported="nicht unterstützt" />

<BenchmarkChart metric="nested" title="Verschachteltes Select und Plural" subtitle="Operationen pro Sekunde, höher ist besser" unsupported="nicht unterstützt" />

<BenchmarkChart metric="interpolation" title="Interpolation" subtitle="Operationen pro Sekunde, höher ist besser" unsupported="nicht unterstützt" />

<BenchmarkChart metric="lookup" title="Lookup" subtitle="Operationen pro Sekunde, höher ist besser" unsupported="nicht unterstützt" />

| Bibliothek                        |     Lookup | Interpolation |     Plural | Verschachteltes Select und Plural |
| --------------------------------- | ---------: | ------------: | ---------: | --------------------------------: |
| dialexjs                          | 43,519,557 |    12,182,375 |  1,314,654 |                         1,224,797 |
| dialexjs (function messages)      | 29,402,418 |    20,147,608 | 26,145,040 |                        16,089,639 |
| dialexjs formatMessage            | 39,919,266 |    17,307,720 |  1,411,691 |                         1,383,457 |
| dialexjs (dictionary object)      | 76,879,058 |           n/a |        n/a |                               n/a |
| dialexjs (getDictionary per call) | 70,281,828 |           n/a |        n/a |                               n/a |
| i18next                           |    409,982 |       308,147 |    186,193 |                               n/a |
| intl-messageformat                | 18,011,740 |     4,011,251 |    431,958 |                           394,071 |
| intl-messageformat (no cache)     |    220,488 |       166,977 |     22,984 |                            18,178 |
| @lingui/core                      |  7,520,241 |     5,259,893 |    269,471 |                           127,467 |
| Paraglide JS                      | 21,550,673 |    15,754,696 |     87,237 |                            90,820 |
| Intlayer                          | 61,550,138 |     2,090,239 |  1,246,861 |                         1,114,859 |
| Intlayer (getIntlayer per call)   |    398,154 |       330,110 |    301,829 |                           297,055 |

Gemessen mit Node v24.21.0 auf einem Intel Core i5-11400H, Linux x64, am 2026-10-12.

## Bundle-Größe

Das kleinste nützliche Programm in jeder Bibliothek: erzeugen, eine Plural-Nachricht laden und formatieren. Für den Browser mit esbuild gebündelt und minifiziert.

<BenchmarkChart metric="size" title="Bundle-Größe" subtitle="Gzip-Bytes, niedriger ist besser" />

| Programm                     | Minifiziert |     Gzip |   Brotli |
| ---------------------------- | ----------: | -------: | -------: |
| dialexjs (t)                 |     7,227 B |  2,739 B |  2,486 B |
| dialexjs/icu (formatMessage) |     6,479 B |  2,401 B |  2,175 B |
| dialexjs (function messages) |     7,268 B |  2,757 B |  2,491 B |
| i18next                      |    43,666 B | 14,043 B | 12,726 B |
| intl-messageformat           |    33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 |    10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |     4,824 B |  2,087 B |  1,869 B |
| Intlayer                     |    17,207 B |  4,901 B |  4,381 B |

Versionen: dialexjs 0.7.2 plus die Laufzeit-Performance-Änderungen (kompilierte Nachrichtenformatierung und gemeinsam genutzte `Intl`-Formatter), i18next 26.4.3, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## Wie du diese Zahlen liest

- **Bei Plural und Zahlen unterscheiden sich die Bibliotheken.** Ein Plural braucht ein `PluralRules` und einen Zahlenformatter. Sie bei jedem Aufruf zu erzeugen ist langsam, daher hält Dialex eines pro Locale und Optionen. Ohne das lag der Plural-Fall bei etwa 36.000 Operationen pro Sekunde, damit bei etwa 1.300.000.
- **Funktionsnachrichten überspringen den Parser.** Eine als TypeScript-Funktion geschriebene Nachricht wird von TypeScript kompiliert, daher kosten Plural und Select so viel wie ein Template-String.
- **`t()` leistet etwas mehr als der Formatter.** `dialexjs` zerlegt den Punktpfad und sucht den Schlüssel, bevor es formatiert; deshalb ist `formatMessage` allein bei der Interpolation schneller; beim Lookup liegen beide im Rahmen der Messschwankung.
- **i18next leistet pro Aufruf mehr.** Es löst bei jedem `t()` Fallback-Ketten, Namespaces und Plugins auf; das ist der Funktionsumfang, den du bezahlst. Das ICU-Plugin ändert seine Zahlen; dieser Benchmark läuft ohne es.
- **Paraglide JS ist unter den anderen Bibliotheken bei der Interpolation am schnellsten.** Eine Nachricht mit Wert wird zu einem Template-String kompiliert. Sein Plural-Code erzeugt bei jedem Aufruf ein neues `Intl.PluralRules` (Version 2.27.0), genau die Kosten, die Dialex beseitigt hat; deshalb ist Plural viel langsamer als die Interpolation (etwa 87.000 gegenüber 16 Millionen Operationen pro Sekunde).
- **Das Lookup von Intlayer ist ein Property-Zugriff.** Ein einfacher String braucht keine Arbeit, weshalb es allen Bibliotheken, die einen Pfad nachschlagen oder formatieren, weit voraus ist. Interpolation, Plural und Select laufen über Knotenfunktionen, und das Wörterbuch bei jedem Aufruf zu lesen ist viel langsamer, als es einmal zu lesen. Ein Dialex-Wörterbuchobjekt zu lesen ist dieselbe Operation und liegt in derselben Größenordnung; mit Werten leisten `t()` und die Knotenfunktionen von Intlayer echte Arbeit, und dort unterscheiden sich die Spalten.
- **Die Größe gilt nur für die Laufzeit.** Die Zahl von Lingui gilt für vorab kompilierte Nachrichten und enthält seine `lingui`-Werkzeuge nicht. Dialex liefert seinen Parser in der Laufzeit mit, daher funktionieren ICU-Strings ohne Kompilierschritt.
- **Paraglide JS und Intlayer werden mit ihren eigenen Build-Werkzeugen gemessen.** Die Zahl von Paraglide ist eine kompilierte Nachricht plus seine Laufzeit. Intlayer braucht sein Bundler-Plugin, um im Browser zu laufen, daher wird es mit `vite-intlayer` und `vanilla-intlayer` gebaut.

## Selbst ausführen

Der Benchmark liegt in `apps/benchmarks`. Baue die Pakete einmal und führe dann aus:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Die Ergebnisse werden als JSON in `apps/benchmarks/results/` geschrieben, zusammen mit der Node-Version und der CPU, auf der gemessen wurde.
