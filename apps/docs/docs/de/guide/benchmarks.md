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
| dialexjs                          | 45,921,949 |    17,591,571 |  9,956,907 |                         8,572,741 |
| dialexjs (function messages)      | 30,294,716 |    21,592,553 | 26,256,191 |                        17,178,301 |
| dialexjs formatMessage            | 41,122,519 |    24,645,778 | 14,808,836 |                        11,676,472 |
| dialexjs (dictionary object)      | 80,403,999 |           n/a |        n/a |                               n/a |
| dialexjs (getDictionary per call) | 77,900,218 |           n/a |        n/a |                               n/a |
| i18next                           |    391,482 |       315,556 |    200,486 |                               n/a |
| intl-messageformat                | 21,248,346 |     4,068,286 |    431,805 |                           394,363 |
| intl-messageformat (no cache)     |    220,735 |       165,743 |     22,636 |                            18,146 |
| @lingui/core                      |  7,628,934 |     5,609,820 |    271,897 |                           129,683 |
| Paraglide JS                      | 21,122,876 |    16,040,431 |     86,959 |                            91,792 |
| Intlayer                          | 64,030,320 |     2,126,902 |  1,351,726 |                         1,228,197 |
| Intlayer (getIntlayer per call)   |    351,302 |       281,777 |    262,436 |                           252,884 |

Gemessen mit Node v24.21.0 auf einem Intel Core i5-11400H, Linux x64, am 2026-10-13.

## Bundle-Größe

Das kleinste nützliche Programm in jeder Bibliothek: erzeugen, eine Plural-Nachricht laden und formatieren. Für den Browser mit esbuild gebündelt und minifiziert.

<BenchmarkChart metric="size" title="Bundle-Größe" subtitle="Gzip-Bytes, niedriger ist besser" />

| Programm                     | Minifiziert |     Gzip |   Brotli |
| ---------------------------- | ----------: | -------: | -------: |
| dialexjs (t)                 |     8,025 B |  3,029 B |  2,760 B |
| dialexjs/icu (formatMessage) |     7,060 B |  2,619 B |  2,397 B |
| dialexjs (function messages) |     8,066 B |  3,052 B |  2,772 B |
| i18next                      |    43,721 B | 14,080 B | 12,762 B |
| intl-messageformat           |    33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 |    10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |     4,824 B |  2,087 B |  1,869 B |
| Intlayer                     |    17,207 B |  4,901 B |  4,381 B |

Versionen: dialexjs 0.9.1, i18next 26.4.4, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## Wie du diese Zahlen liest

- **Bei Plural und Zahlen unterscheiden sich die Bibliotheken.** Ein Plural braucht ein `PluralRules` und einen Zahlenformatter. Sie bei jedem Aufruf zu erzeugen ist langsam, daher hält Dialex eines pro Locale und Optionen. Ohne das lag der Plural-Fall bei etwa 36.000 Operationen pro Sekunde, damit bei etwa 700.000 und bei etwa 9.900.000, sobald Kategorie und formatierte Zahl kleiner Zähler pro Locale gemerkt werden.
- **Funktionsnachrichten überspringen den Parser.** Eine als TypeScript-Funktion geschriebene Nachricht wird von TypeScript kompiliert, daher kosten Plural und Select so viel wie ein Template-String.
- **`t()` leistet etwas mehr als der Formatter.** `dialexjs` zerlegt den Punktpfad und sucht den Schlüssel, bevor es formatiert; deshalb ist `formatMessage` allein schneller, sobald Werte formatiert werden. Ein einfacher String ohne Werte wird unverändert zurückgegeben, daher ist `t()` beim Lookup schneller.
- **i18next leistet pro Aufruf mehr.** Es löst bei jedem `t()` Fallback-Ketten, Namespaces und Plugins auf; das ist der Funktionsumfang, den du bezahlst. Das ICU-Plugin ändert seine Zahlen; dieser Benchmark läuft ohne es.
- **Paraglide JS ist unter den anderen Bibliotheken bei der Interpolation am schnellsten.** Eine Nachricht mit Wert wird zu einem Template-String kompiliert. Sein Plural-Code erzeugt bei jedem Aufruf ein neues `Intl.PluralRules` (Version 2.27.0), genau die Kosten, die Dialex beseitigt hat; deshalb ist Plural viel langsamer als die Interpolation (etwa 87.000 gegenüber 16 Millionen Operationen pro Sekunde).
- **Das Lookup von Intlayer ist ein Property-Zugriff.** Ein einfacher String braucht keine Arbeit, weshalb es allen Bibliotheken, die einen Pfad nachschlagen oder formatieren, weit voraus ist. Interpolation, Plural und Select laufen über Knotenfunktionen, und das Wörterbuch bei jedem Aufruf zu lesen ist viel langsamer, als es einmal zu lesen. Ein Dialex-Wörterbuchobjekt zu lesen ist dieselbe Operation und liegt in derselben Größenordnung; mit Werten leisten `t()` und die Knotenfunktionen von Intlayer echte Arbeit, und dort unterscheiden sich die Spalten.
- **Die Größe gilt nur für die Laufzeit.** Die Zahl von Lingui gilt für vorab kompilierte Nachrichten und enthält seine `lingui`-Werkzeuge nicht. Dialex liefert seinen Parser in der Laufzeit mit, daher funktionieren ICU-Strings ohne Kompilierschritt. Die Closures und Caches, die das Formatieren beschleunigen, kosten etwa 2 KB minifiziert (0,7 KB gzip) gegenüber dem Interpreter, den sie ersetzen.
- **Paraglide JS und Intlayer werden mit ihren eigenen Build-Werkzeugen gemessen.** Die Zahl von Paraglide ist eine kompilierte Nachricht plus seine Laufzeit. Intlayer braucht sein Bundler-Plugin, um im Browser zu laufen, daher wird es mit `vite-intlayer` und `vanilla-intlayer` gebaut.

## Selbst ausführen

Der Benchmark liegt in `apps/benchmarks`. Baue die Pakete einmal und führe dann aus:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Die Ergebnisse werden als JSON in `apps/benchmarks/results/` geschrieben, zusammen mit der Node-Version und der CPU, auf der gemessen wurde.
