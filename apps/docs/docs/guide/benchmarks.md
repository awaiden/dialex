# Benchmarks

Numbers for the parts of an i18n library that run in your users' browsers and on your servers: how fast a message is formatted, and how many bytes the library adds to a bundle. They compare Dialex with [i18next](https://www.i18next.com), [intl-messageformat](https://formatjs.github.io) (the FormatJS core behind `react-intl`), [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) and [Intlayer](https://intlayer.org).

::: tip Read them as a guide, not a verdict
A micro-benchmark measures one thing on one machine. Your app's cost is usually somewhere else: rendering, network, data. Use these numbers to compare the libraries with each other, and run the benchmark on your own hardware before you rely on them.
:::

## What is measured

Four messages, formatted in English by every library, with the same values. Before anything is timed, the runner checks that all libraries return the same text.

| Case          | Message                                                       |
| ------------- | ------------------------------------------------------------- |
| Lookup        | `Hello, world`                                                |
| Interpolation | `Hello, {name}!`                                              |
| Plural        | `{count, plural, =0 {No items} one {# item} other {# items}}` |
| Nested        | A `select` on `gender` that contains a `plural` on `count`    |

Each library is used the way its documentation recommends:

- **dialexjs**: `t("dictionary.key", values)` on ICU strings. `function messages` are TypeScript functions, `formatMessage` is the formatter on its own.
- **dialexjs dictionary object**: `getDictionary("home").title`, which returns the resolved dictionary. Only the lookup case applies, because a message with values goes through `t()`. `dictionary object` reads from a dictionary obtained once; `getDictionary per call` resolves the dictionary on every call.
- **i18next**: its own interpolation and plural keys (`items_one`, `items_other`). It has no inline `select`, so the nested case is not run.
- **intl-messageformat**: a formatter created once per message and reused. `no cache` creates it on every call, which is what happens when an app does not keep the instance.
- **@lingui/core**: messages compiled ahead of time, as `lingui compile` does.
- **Paraglide JS**: messages compiled to functions by `paraglide-js compile` (`m.plural({ count })`), in the default inlang message format.
- **Intlayer**: content declared in a `.content.ts` file and built by `intlayer build`. The dictionary is read once, as a component does with `useIntlayer`. `getIntlayer per call` reads it on every call.

## Throughput

Operations per second, higher is better. Median of 7 rounds of 400 ms after a 300 ms warm-up.

Dialex is green. Bars are drawn to scale inside one chart, so compare lengths within a chart, not between charts.

<BenchmarkChart metric="plural" title="Plural" subtitle="operations per second, higher is better" unsupported="not supported" />

<BenchmarkChart metric="nested" title="Nested select and plural" subtitle="operations per second, higher is better" unsupported="not supported" />

<BenchmarkChart metric="interpolation" title="Interpolation" subtitle="operations per second, higher is better" unsupported="not supported" />

<BenchmarkChart metric="lookup" title="Lookup" subtitle="operations per second, higher is better" unsupported="not supported" />

| Library                           |     Lookup | Interpolation |     Plural | Nested select and plural |
| --------------------------------- | ---------: | ------------: | ---------: | -----------------------: |
| dialexjs                          | 43,519,557 |    12,182,375 |  1,314,654 |                1,224,797 |
| dialexjs (function messages)      | 29,402,418 |    20,147,608 | 26,145,040 |               16,089,639 |
| dialexjs formatMessage            | 39,919,266 |    17,307,720 |  1,411,691 |                1,383,457 |
| dialexjs (dictionary object)      | 76,879,058 |           n/a |        n/a |                      n/a |
| dialexjs (getDictionary per call) | 70,281,828 |           n/a |        n/a |                      n/a |
| i18next                           |    409,982 |       308,147 |    186,193 |                      n/a |
| intl-messageformat                | 18,011,740 |     4,011,251 |    431,958 |                  394,071 |
| intl-messageformat (no cache)     |    220,488 |       166,977 |     22,984 |                   18,178 |
| @lingui/core                      |  7,520,241 |     5,259,893 |    269,471 |                  127,467 |
| Paraglide JS                      | 21,550,673 |    15,754,696 |     87,237 |                   90,820 |
| Intlayer                          | 61,550,138 |     2,090,239 |  1,246,861 |                1,114,859 |
| Intlayer (getIntlayer per call)   |    398,154 |       330,110 |    301,829 |                  297,055 |

Measured with Node v24.21.0 on an Intel Core i5-11400H, Linux x64, on 2026-10-12.

## Bundle size

The smallest useful program in each library: create it, load one plural message and format it. Bundled for the browser with esbuild and minified.

<BenchmarkChart metric="size" title="Bundle size" subtitle="gzip bytes, lower is better" />

| Program                      | Minified |     Gzip |   Brotli |
| ---------------------------- | -------: | -------: | -------: |
| dialexjs (t)                 |  7,227 B |  2,739 B |  2,486 B |
| dialexjs/icu (formatMessage) |  6,479 B |  2,401 B |  2,175 B |
| dialexjs (function messages) |  7,268 B |  2,757 B |  2,491 B |
| i18next                      | 43,666 B | 14,043 B | 12,726 B |
| intl-messageformat           | 33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 | 10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |  4,824 B |  2,087 B |  1,869 B |
| Intlayer                     | 17,207 B |  4,901 B |  4,381 B |

Versions: dialexjs 0.7.2 plus the runtime performance changes (compiled message formatting and shared `Intl` formatters), i18next 26.4.3, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## How to read these numbers

- **Plurals and numbers are where libraries differ.** A plural needs a `PluralRules` and a number formatter. Creating those on every call is slow, so Dialex keeps one per locale and options. Without it the plural case measured about 36,000 operations per second; with it, about 1,300,000.
- **Function messages skip the parser.** A message written as a TypeScript function is compiled by TypeScript, so plural and select cost the same as a template string.
- **`t()` does a little more than the formatter.** `dialexjs` splits the dotted path and looks the key up before it formats, which is why `formatMessage` alone is faster on interpolation; on lookup the two are within noise.
- **i18next does more per call.** It resolves fallback chains, namespaces and plugins on every `t()`, which is the feature set you pay for. The ICU plugin changes its numbers; this benchmark runs it without one.
- **Paraglide JS is the fastest other library at interpolation.** A message with a value is compiled to a template string. Its plural code creates a new `Intl.PluralRules` on every call (version 2.27.0), which is the cost Dialex removed, so plural is much slower than its interpolation (about 87,000 against 16 million operations per second).
- **Intlayer's lookup is a property read.** A plain string needs no work, which is why it is far ahead of every library that looks a path up or formats. Interpolation, plural and select go through node functions, and reading the dictionary on every call is much slower than reading it once. Reading a Dialex dictionary object is the same operation and lands in the same order of magnitude; with values, `t()` and Intlayer's node functions do real work, and that is where the columns differ.
- **Size is for the runtime only.** Lingui's figure is for messages compiled ahead of time, and does not include its `lingui` toolchain. Dialex ships its parser in the runtime, so ICU strings work without a compile step.
- **Paraglide JS and Intlayer are measured with their own build tools.** Paraglide's figure is one compiled message plus its runtime. Intlayer needs its bundler plugin to run in a browser, so it is built with `vite-intlayer` and `vanilla-intlayer`.

## Run it yourself

The benchmark lives in `apps/benchmarks`. Build the packages once, then run:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Results are written to `apps/benchmarks/results/` as JSON, with the Node version and CPU they were measured on.
