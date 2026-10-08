# Translating the docs

The site is written in English (`docs/`) and translated into Turkish (`docs/tr/`), Spanish (`docs/es/`), German (`docs/de/`) and Simplified Chinese (`docs/zh/`). Each language mirrors the English folder structure file for file.

> **The translations were written by an AI assistant from the English pages and have not been reviewed by native speakers.** Corrections from native speakers are very welcome. Where a translation and the English page disagree, the English page is right.

## Keeping translations in sync

```bash
bun run docs:check-translations     # from the repository root
```

This also runs as part of `vp run -r test`, so CI fails when a translation drifts. For every English page, each translation must have:

- the same **code blocks**, character for character. Whole-line comments inside code may be translated; nothing else may. (The current translations keep code, including its comments, in English.)
- the same **headings** (count and level, in the same order);
- the same **links**, with the same targets. In the front matter of a home page, `link:` values need the language prefix (`/tr/guide/...`);
- the same number of **table rows** and `:::` container lines;
- the same **front matter keys**.

It also checks that every link with a `#fragment` points at a heading or an `<a id>` that exists.

## What to translate, and what to leave alone

Translate prose, headings, table text, container titles (`::: warning Status`) and the text of links. Leave alone: code, identifiers, option and API names, CLI commands and flags, file paths, and the keyword after `:::` (`warning`, `tip`). Text in the extension's own UI (such as the quick fix titles in the VS Code page) stays in English because the extension is not localized.

## Heading anchors

Anchors come from heading text, so translating a heading changes its anchor. Pages link to a few headings by their English anchor (for example `../guide/locale-detection.md#options`). When you translate such a heading, put an explicit anchor with the **English** slug on the line before it:

```md
<a id="options"></a>

## Seçenekler
```

The check tells you when a link has no target.

## Adding or changing a page

1. Edit or add the English page, and add new pages to `PAGES` in `docs/.vuepress/config.ts` so they appear in every language's sidebar.
2. Create the matching file in each language folder (`docs/tr/...`, `docs/es/...`, `docs/de/...`, `docs/zh/...`).
3. Run `bun run docs:check-translations` and `bun run docs:build`.

## Adding a language

1. Add an entry to `LOCALES` and `TRANSLATED` in `docs/.vuepress/locales.ts`: language name, navigation labels, and the theme's built-in strings.
2. Translate every page into `docs/<code>/`.
3. Run the check.

## Terminology

Keep terms consistent across pages:

| English      | Turkish         | Spanish              | German           | Chinese  |
| ------------ | --------------- | -------------------- | ---------------- | -------- |
| dictionary   | sözlük          | diccionario          | Wörterbuch       | 词典     |
| locale       | yerel ayar      | locale               | Locale           | locale   |
| fallback     | yedek           | fallback             | Fallback         | 回退     |
| placeholder  | yer tutucu      | marcador de posición | Platzhalter      | 占位符   |
| key          | anahtar         | clave                | Schlüssel        | 键       |
| adapter      | adaptör         | adaptador            | Adapter          | 适配器   |
| lazy loading | tembel yükleme  | carga diferida       | Lazy Loading     | 懒加载   |
| syntax tree  | sözdizimi ağacı | árbol sintáctico     | Syntaxbaum       | 语法树   |
| provider     | sağlayıcı       | proveedor            | Provider         | 提供者   |
| quick fix    | hızlı düzeltme  | corrección rápida    | Schnellkorrektur | 快速修复 |

Framework and tool names (Next.js, Vite, `middleware`, `hydration`, ...) stay in English.
