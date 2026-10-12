// Writes tests/golden/edit.json: what `copyLeaf` and `setString` produce in the TypeScript
// implementation, so the Rust edits can be compared with them.
//
//   bun run crates/tests/gen-edit-golden.mjs
import fs from "node:fs";

import {
  TODO_PREFIX,
  copyLeaf,
  listLeaves,
  listLocales,
  parseDictionaryText,
  renderDictionaryFile,
  setString,
} from "../../packages/cli/src/utils/dictionary-edit.ts";

const HOME = `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    nav: {
      home: "Home",
      about: "About",
      contact: "Contact",
    },
    greeting: (name: string) => \`Hello, \${name}!\`,
    items: "{count, plural, one {# item} other {# items}}",
    note: "Pipes | and *stars*\\nsecond line",
    method(n: number) {
      return n * 2;
    },
  },
  tr: {
    title: "Hoş Geldiniz",
    nav: {
      home: "Ana sayfa",
      about: "Hakkında",
    },
    greeting: (name: string) => \`Merhaba, \${name}!\`,
    items: "{count, plural, other {# ürün}}",
  },
});
`;

const SOURCES = {
  home: HOME,
  singleLine: `export default defineDictionary("x", { en: { a: "A", b: "B" }, tr: { a: "a" } });\n`,
  noTrailingComma: `export default defineDictionary("x", {
  en: {
    a: "A",
    b: "B"
  },
  tr: {
    a: "a"
  }
});
`,
  emptyLocale: `export default defineDictionary("x", {
  en: { a: "A" },
  tr: {},
});
`,
  missingLocale: `export default defineDictionary("x", {
  en: { a: "A", n: { deep: { er: "D" } } },
});
`,
  tabs: `export default defineDictionary("x", {\n\ten: {\n\t\ta: "A",\n\t\tb: "B",\n\t},\n\ttr: {\n\t\ta: "a",\n\t},\n});\n`,
  quotedKeys: `export default defineDictionary("x", {
  en: { "a-b": "A", "c.d": "C", e: "E" },
  tr: { e: "e" },
});
`,
};

const operations = [];
for (const [name, source] of Object.entries(SOURCES)) {
  const df = parseDictionaryText("f.content.ts", source);
  const locales = listLocales(df);
  const seen = new Set();
  for (const from of locales) {
    for (const leaf of listLeaves(df, from)) {
      for (const to of [...locales, "de"]) {
        if (to === from) continue;
        const key = `${from}>${to}>${leaf.path.join(".")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const fresh = parseDictionaryText("f.content.ts", source);
        const ok = copyLeaf(fresh, from, to, leaf.path, (v) => `${TODO_PREFIX}${v}`);
        operations.push({
          kind: "copy",
          name,
          source,
          from,
          to,
          path: leaf.path,
          result: ok ? renderDictionaryFile(fresh) : null,
        });
      }
    }
  }
  for (const [locale, path, value] of [
    ["en", ["title"], "Changed"],
    ["en", ["nav", "pricing"], "[TODO] pricing"],
    ["tr", ["nav", "pricing"], "[TODO] pricing"],
    ["tr", ["brand", "new", "deep"], "[TODO] deep"],
    ["de", ["a"], "[TODO] a"],
    ["en", ["greeting"], "x"],
  ]) {
    const fresh = parseDictionaryText("f.content.ts", source);
    const result = setString(fresh, locale, path, value);
    operations.push({
      kind: "set",
      name,
      source,
      locale,
      path,
      value,
      status: result,
      result: result === "skipped" ? null : renderDictionaryFile(fresh),
    });
  }
}

fs.writeFileSync(
  new URL("./golden/edit.json", import.meta.url),
  JSON.stringify(operations, null, 1) + "\n",
);
console.log(`Wrote ${operations.length} operations`);
