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
| dialexjs                          | 45,921,949 |    17,591,571 |  9,956,907 |                8,572,741 |
| dialexjs (function messages)      | 30,294,716 |    21,592,553 | 26,256,191 |               17,178,301 |
| dialexjs formatMessage            | 41,122,519 |    24,645,778 | 14,808,836 |               11,676,472 |
| dialexjs (dictionary object)      | 80,403,999 |           n/a |        n/a |                      n/a |
| dialexjs (getDictionary per call) | 77,900,218 |           n/a |        n/a |                      n/a |
| i18next                           |    391,482 |       315,556 |    200,486 |                      n/a |
| intl-messageformat                | 21,248,346 |     4,068,286 |    431,805 |                  394,363 |
| intl-messageformat (no cache)     |    220,735 |       165,743 |     22,636 |                   18,146 |
| @lingui/core                      |  7,628,934 |     5,609,820 |    271,897 |                  129,683 |
| Paraglide JS                      | 21,122,876 |    16,040,431 |     86,959 |                   91,792 |
| Intlayer                          | 64,030,320 |     2,126,902 |  1,351,726 |                1,228,197 |
| Intlayer (getIntlayer per call)   |    351,302 |       281,777 |    262,436 |                  252,884 |

Measured with Node v24.21.0 on an Intel Core i5-11400H, Linux x64, on 2026-10-13.

## Bundle size

The smallest useful program in each library: create it, load one plural message and format it. Bundled for the browser with esbuild and minified.

<BenchmarkChart metric="size" title="Bundle size" subtitle="gzip bytes, lower is better" />

| Program                      | Minified |     Gzip |   Brotli |
| ---------------------------- | -------: | -------: | -------: |
| dialexjs (t)                 |  8,025 B |  3,029 B |  2,760 B |
| dialexjs/icu (formatMessage) |  7,060 B |  2,619 B |  2,397 B |
| dialexjs (function messages) |  8,066 B |  3,052 B |  2,772 B |
| i18next                      | 43,721 B | 14,080 B | 12,762 B |
| intl-messageformat           | 33,567 B |  9,908 B |  8,883 B |
| Paraglide JS                 | 10,702 B |  3,952 B |  3,528 B |
| @lingui/core                 |  4,824 B |  2,087 B |  1,869 B |
| Intlayer                     | 17,207 B |  4,901 B |  4,381 B |

Versions: dialexjs 0.9.1, i18next 26.4.4, intl-messageformat 12.1.3, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, intlayer 9.7.0, vite-intlayer 9.7.0.

## How to read these numbers

- **Plurals and numbers are where libraries differ.** A plural needs a `PluralRules` and a number formatter. Creating those on every call is slow, so Dialex keeps one per locale and options. Without it the plural case measured about 36,000 operations per second; with it, about 700,000, and about 9,900,000 once the category and the formatted number of a small count are remembered per locale.
- **Function messages skip the parser.** A message written as a TypeScript function is compiled by TypeScript, so plural and select cost the same as a template string.
- **`t()` does a little more than the formatter.** `dialexjs` splits the dotted path and looks the key up before it formats, which is why `formatMessage` alone is faster once values are formatted. A plain string without values is returned as it is, so `t()` is faster on lookup.
- **i18next does more per call.** It resolves fallback chains, namespaces and plugins on every `t()`, which is the feature set you pay for. The ICU plugin changes its numbers; this benchmark runs it without one.
- **Paraglide JS is the fastest other library at interpolation.** A message with a value is compiled to a template string. Its plural code creates a new `Intl.PluralRules` on every call (version 2.27.0), which is the cost Dialex removed, so plural is much slower than its interpolation (about 87,000 against 16 million operations per second).
- **Intlayer's lookup is a property read.** A plain string needs no work, which is why it is far ahead of every library that looks a path up or formats. Interpolation, plural and select go through node functions, and reading the dictionary on every call is much slower than reading it once. Reading a Dialex dictionary object is the same operation and lands in the same order of magnitude; with values, `t()` and Intlayer's node functions do real work, and that is where the columns differ.
- **Size is for the runtime only.** Lingui's figure is for messages compiled ahead of time, and does not include its `lingui` toolchain. Dialex ships its parser in the runtime, so ICU strings work without a compile step. The closures and caches that make formatting faster cost about 2 KB minified (0.7 KB gzip) over the interpreter they replaced.
- **Paraglide JS and Intlayer are measured with their own build tools.** Paraglide's figure is one compiled message plus its runtime. Intlayer needs its bundler plugin to run in a browser, so it is built with `vite-intlayer` and `vanilla-intlayer`.

## Run it yourself

The benchmark lives in `apps/benchmarks`. Build the packages once, then run:

```bash
bun run build:packages
bun run --cwd apps/benchmarks bench     # throughput
bun run --cwd apps/benchmarks size      # bundle size
```

Results are written to `apps/benchmarks/results/` as JSON, with the Node version and CPU they were measured on.
