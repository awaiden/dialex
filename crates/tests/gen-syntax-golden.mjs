// Writes tests/golden/syntax.json: how the TypeScript reader sees dictionary files. Covers odd
// shapes written by hand and every `*.content.ts` file in the repository. The config is not here:
// the Rust side reads the file `@dialexjs/config` writes, not the source of `dialex.config.*`.
//
//   bun run crates/tests/gen-syntax-golden.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";

import {
  listLeaves,
  listLocales,
  parseDictionaryText,
} from "../../packages/cli/src/utils/dictionary-edit.ts";
import { parseStaticConfig } from "../../packages/cli/src/utils/static-config.ts";

const shapes = {
  ident: `import { defineDictionary } from "dialexjs";\nconst d = defineDictionary("x", { en: { a: "b" } });\nexport default d;`,
  asConst: `export default defineDictionary("x", { en: { a: "b" } } as const);`,
  satisfies: `export default defineDictionary("x", { en: { a: "b" } }) satisfies Foo;`,
  paren: `export default (defineDictionary("x", { en: { a: "b" } }));`,
  spread: `export default defineDictionary("x", { en: { ...base, a: "b" }, tr: { a: "c" } });`,
  computed: `export default defineDictionary("x", { en: { ["a"]: "b", c: "d" } });`,
  method: `export default defineDictionary("x", { en: { greet(n) { return n }, get g() { return 1 }, a: () => 1, b: function(){}, c: \`t\`, d: \`t\${x}\`, e: 5, f: null, g2: [1], h: x } });`,
  shorthand: `const en = { a: "b" };\nexport default defineDictionary("x", { en });`,
  numeric: `export default defineDictionary("x", { en: { 1: "a", 2.5: "b", 0x10: "c", "q-r": "d" } });`,
  objForm: `export default defineDictionary({ name: "x", dictionary: { en: { a: "b" } } });`,
  plain: `export default { name: "x", dictionary: { en: { a: "b" } } };`,
  nonExport: `module.exports = { name: "x" };`,
  syntaxErr: `export default defineDictionary("x", { en: { a: } });`,
  noDefault: `export const d = defineDictionary("x", { en: { a: "b" } });`,
  tpl: "export default defineDictionary(`x`, { en: { a: `hello` } });",
  nameVar: `const n = "x";\nexport default defineDictionary(n, { en: { a: "b" } });`,
  nested: `export default defineDictionary("x", { en: { a: { b: { c: "d" } } }, tr: { a: { b: { c: "e" } } } });`,
  esc: `export default defineDictionary("x", { en: { a: "line\\nbreak \\u00e9 \\"q\\"", b: 'it\\'s' } });`,
  types: `import type { X } from "y";\n// comment\nexport default defineDictionary<"x", Foo>("x", { /* c */ en: { a: "b" as string } });`,
  duplicate: `export default defineDictionary("x", { en: { a: "1", a: "2" }, en: { b: "3" } });`,
  emptyLocale: `export default defineDictionary("x", { en: {}, tr: { a: "b" } });`,
  localeNotObject: `export default defineDictionary("x", { en: "oops", tr: { a: "b" } });`,
  unicodeKeys: `export default defineDictionary("x", { en: { "日本": "a", ünï: "b" } });`,
};

const files = execSync("git ls-files '*.content.ts'", { encoding: "utf-8" })
  .split("\n")
  .filter(Boolean);
const samples = [
  ...Object.entries(shapes).map(([name, source]) => ({ name, source })),
  ...files.map((file) => ({ name: file, source: fs.readFileSync(file, "utf-8") })),
];

const entries = samples.map(({ name, source }) => {
  try {
    const df = parseDictionaryText("f.content.ts", source);
    if (!df) return { name, source, shape: null };
    const locales = listLocales(df);
    return {
      name,
      source,
      dictionary: {
        name: df.name ?? null,
        complete: df.complete,
        locales,
        leaves: Object.fromEntries(locales.map((l) => [l, listLeaves(df, l)])),
      },
    };
  } catch (error) {
    return { name, source, error: String(error.message).slice(0, 120) };
  }
});

fs.writeFileSync(
  new URL("./golden/syntax.json", import.meta.url),
  JSON.stringify({ dictionaries: entries }, null, 1) + "\n",
);
console.log(`Wrote ${entries.length} dictionaries`);
