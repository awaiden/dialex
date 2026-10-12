# Comparison

How Dialex differs from the libraries it is most often compared with: [i18next](https://www.i18next.com), [FormatJS](https://formatjs.github.io) (`react-intl` and `intl-messageformat`), [Lingui](https://lingui.dev), [Paraglide JS](https://paraglidejs.com) and [Intlayer](https://intlayer.org). All of them are good libraries, and the right one depends on how your team writes and translates text.

For numbers on speed and size, see [Benchmarks](./benchmarks.md).

## At a glance

| Question             | Dialex                                      | i18next                              | FormatJS                            | Lingui                                                       |
| -------------------- | ------------------------------------------- | ------------------------------------ | ----------------------------------- | ------------------------------------------------------------ |
| Where the text lives | TypeScript dictionaries next to the code    | JSON resources, loaded by namespace  | Messages in the code, plus catalogs | Messages in the code, extracted to catalogs                  |
| Message syntax       | ICU MessageFormat, or a TypeScript function | Its own `{{value}}` and plural keys  | ICU MessageFormat                   | ICU MessageFormat                                            |
| Typed keys           | Generated from your dictionaries            | Through resource type declarations   | Message ids are strings             | No keys: the source text is the id                           |
| Typed ICU arguments  | Generated from each message                 | Not part of the key types            | Not by default                      | Values come from the template, so TypeScript checks them     |
| Missing translations | `dialex check` fails the build              | Reported at runtime, with fallbacks  | Reported through `onError`          | Counted by `lingui extract`; `lingui compile --strict` fails |
| Extraction step      | None: the dictionaries are the source       | Optional tooling                     | `formatjs extract`                  | `lingui extract`                                             |
| Translator hand-off  | JSON, CSV and XLIFF export and import       | JSON, with many services integrating | JSON, in several vendor formats     | PO and JSON catalogs                                         |
| Lazy loading         | Per dictionary or per locale, generated     | Backends and namespaces              | Your own dynamic imports            | Your own dynamic imports                                     |

The cells describe each library's documented defaults. Every one of them can be extended with plugins or your own code.

## Dialex and i18next

i18next is the most widely used i18n library for JavaScript, with a large ecosystem of backends, language detectors and framework bindings. It keeps translations as JSON resources and offers runtime features such as namespaces, fallbacks and plugins.

Dialex makes a different trade. Dictionaries are TypeScript, compiled into one typed registry, so a wrong key or a wrong argument is a type error, and a missing locale fails `dialex check` before you ship. There is no runtime resource loading to configure; with [lazy loading](./lazy-loading.md) a dictionary is a code-split module.

Choose i18next when you need its plugin ecosystem, backends that fetch translations at runtime, or a runtime that is not tied to TypeScript. Choose Dialex when you want the compiler to guard your text.

## Dialex and FormatJS

FormatJS is the reference implementation of ICU MessageFormat for JavaScript, and `react-intl` builds React components on it. Messages are defined in code with `defineMessages` or `formatMessage`, extracted with the `formatjs` CLI, and can be precompiled.

Dialex uses the same message syntax, so ICU messages carry over. The difference is the surrounding workflow: Dialex does not need an extraction step, because the dictionary is the source, and it generates types for keys and arguments. The runtime is also smaller, as shown in [Benchmarks](./benchmarks.md).

Choose FormatJS when you want the standard implementation and its React components, or when your translation process is built around `formatjs extract`.

## Dialex and Lingui

Lingui keeps the message in the source (`t` and `Trans` macros), extracts catalogs to PO or JSON, and compiles them into a small runtime. The result is a very small bundle and an authoring style where the English text is written in the component.

Dialex keeps the text in dictionaries instead, so a key names its purpose and every locale sits beside the others in the file. Both approaches use ICU MessageFormat.

Choose Lingui when you prefer writing messages inline and have a PO-based translation process. Choose Dialex when you prefer named keys, and want them checked by the type system.

## Paraglide JS and Intlayer at a glance

Two libraries that also work at build time, next to Dialex:

| Question             | Dialex                                      | Paraglide JS                                                | Intlayer                                                    |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Where the text lives | TypeScript dictionaries next to the code    | JSON message files per locale                               | `.content` files next to the components                     |
| Message syntax       | ICU MessageFormat, or a TypeScript function | Inlang format; ICU MessageFormat 1 and i18next by plugin    | Its own nodes (`t`, `plural`, `enu`, `select`), or ICU      |
| Typed keys           | Generated from your dictionaries            | Each message is a generated function                        | Through a `Dictionary` type on each declaration             |
| Typed ICU arguments  | Generated from each message                 | Parameters of the generated functions are typed             | Not covered in its documentation                            |
| Missing translations | `dialex check` fails the build              | The inlang CLI checks translations in CI                    | `intlayer content test` checks for them                     |
| Extraction step      | None: the dictionaries are the source       | None: messages are written in the JSON files                | `intlayer extract` moves strings out of components          |
| Translator hand-off  | JSON, CSV and XLIFF export and import       | Fink editor for non-developers; import and export by plugin | CMS and editor, `fill` with AI, JSON and YAML files         |
| Lazy loading         | Per dictionary or per locale, generated     | Unused messages are dropped by the bundler                  | `importMode`: `static`, `dynamic` or `fetch` per dictionary |

## Dialex and Paraglide JS

[Paraglide JS](https://paraglidejs.com) is a compiler from the inlang project. Messages live in JSON files, and the compiler turns each one into a function (`m.greeting({ name })`) with typed parameters, so a bundler can drop the messages you do not use. The message format is pluggable: the default is the inlang format, and plugins add ICU MessageFormat 1 and i18next files.

Dialex also generates types from your messages, but it keeps the text of a feature together in one dictionary, with every locale side by side, and runs ICU strings in a small runtime. Paraglide's per-message functions give the finest tree-shaking; Dialex's [lazy loading](./lazy-loading.md) splits by dictionary or by locale.

Choose Paraglide JS when per-message tree-shaking matters most, or when you want the inlang editor tools. Choose Dialex when you prefer dictionaries grouped by feature, ICU strings and function messages in one file, and a parity check across locales.

## Dialex and Intlayer

[Intlayer](https://intlayer.org) declares content in `.content` files next to each component (TypeScript, JSON, YAML or Markdown), each with a `key`, and builds them into dictionaries. Around that it offers a CMS and an editor, `fill` to complete translations with AI, `extract` to move strings out of components, and `content test` to find missing translations.

Dialex also keeps text in `*.content.ts` files next to the code, but it stays a library and a command line tool: messages are plain ICU strings or functions, and the only service it talks to is the one you choose for `dialex translate`.

Choose Intlayer when you want an editor for non-developers, per-component content with its own node types, and AI fill built into the workflow. Choose Dialex when you want standard ICU MessageFormat and no hosted service.

## When Dialex is not the right fit

- You need to load or change translations at runtime from a service, without a deploy.
- Your translators work in a tool that only reads PO files, and you do not want a conversion step. Dialex exports JSON, CSV and XLIFF.
- Your project is plain JavaScript. The main value of Dialex is the types it generates.
- You depend on an ecosystem plugin that only i18next, FormatJS or Lingui provide.

## Moving to Dialex

- Keep your ICU messages as they are; the syntax is the same.
- Turn each namespace or catalog into one `defineDictionary` file, and let `dialex check` find the keys that differ between locales.
- Import existing translations with [`dialex import`](../cli/import.md) from JSON, CSV or XLIFF.
