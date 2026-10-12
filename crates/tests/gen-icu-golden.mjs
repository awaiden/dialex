// Writes tests/golden/icu.json: what the TypeScript implementation returns for a corpus of ICU
// messages. The Rust crate's tests compare against it, so the port cannot drift.
//
//   bun run crates/tests/gen-icu-golden.mjs
import fs from "node:fs";

import { messageType } from "../../packages/cli/src/utils/message-arguments.ts";
import {
  argumentSignature,
  findPlurals,
  getArguments,
  isIcuStructured,
  parseMessage,
} from "../../packages/core/src/icu/index.ts";

const base = [
  "Hello, world",
  "",
  "Hello, {name}!",
  "{a}{b}{c}",
  "{a} and {b}",
  "'{'literal'}' {name}",
  "It''s {name}",
  "don't {name}",
  "'{' '}' ''",
  "{ name }",
  "{count, plural, =0 {No items} one {# item} other {# items}}",
  "{count, plural, one {# item} other {# items}}",
  "{count,plural,one{# item}other{# items}}",
  "{count, plural, offset:1 =0 {Nobody} =1 {Just you} one {You and # other} other {You and # others}}",
  "{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}",
  "{gender, select, female {She} male {He} other {They}} has {count, plural, one {# item} other {# items}}",
  "{gender, select, female {{count, plural, one {She has # item} other {She has # items}}} male {{count, plural, one {He has # item} other {He has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}",
  "{n, number}",
  "{n, number, integer}",
  "{n, number, percent}",
  "{n, number, ::currency/EUR}",
  "{d, date}",
  "{d, date, short}",
  "{d, time, medium}",
  "{count, plural, one {{kind, select, a {# apple} other {# fruit}}} other {{kind, select, a {# apples} other {# fruits}}}}",
  "{1, select, 1 {one} 2 {two} other {many}}",
  "{k, select, b {B} 10 {ten} 2 {two} a {A} other {O}}",
  "{k, select, b {{x} {n, plural, one {#} other {#}}} 10 {{y, number}} 2 {{z, date}} other {{w}}}",
  "{p, plural, other {{k, select, 3 {{a}} 1 {{b}} other {{c}}}}}",
  "{ k , select , other { { n , plural , one {#} other {#} } } }",
  "{count,plural,one{# item}other{# items}} {x,number}",
  "{x, selectordinalx, other {y}}",
  "{ plural, plural, other {x}}",
  "a { b, date}",
  "{count, plural, =1.0 {never} =2 {two} other {#}}",
  "{ unclosed",
  "{count, plural, one {# item}}",
  "{count, plural, few {x} other {y} few {z}}",
  "{count, plural, nope {x} other {y}}",
  "{x, bogus, y}",
  "{count, plural, offset: other {x}}",
  "}",
  "{a",
  "{a,",
  "{a, number",
  "{,}",
  "{a b}",
  "日本語 {名前} です",
  "emoji 😀 {name} 😀 {n, plural, one {# 😀} other {# 😀s}}",
  "tab\t{a}\n{b}",
  "{a, select, other {x}}",
  "{a, select, x {} other {}}",
  "{ a , plural , one { # } other { # } }",
  "{a-b} {a.b} {$x}",
  "{n, plural, =0 {none} other {{m, number} of #}}",
  "{when, date, long} at {when, time, short}",
];

const pieces = [
  "Hello ",
  "{name}",
  " ",
  "{count, plural, one {# item} other {# items}}",
  "{role, select, admin {Admin} other {User}}",
  "{n, number}",
  "'{'",
  "''",
  "{d, date, short}",
  "{x, selectordinal, one {#st} other {#th}}",
  "text",
];
let seed = 7;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const generated = [];
for (let i = 0; i < 250; i++) {
  const n = 1 + Math.floor(rand() * 4);
  let message = "";
  for (let j = 0; j < n; j++) message += pieces[Math.floor(rand() * pieces.length)];
  generated.push(message);
}

const corpus = [...new Set([...base, ...generated])];
const out = corpus.map((message) => {
  let parsed;
  try {
    const nodes = parseMessage(message);
    parsed = {
      nodes,
      args: getArguments(nodes),
      type: messageType(message) ?? null,
      signature: argumentSignature(nodes),
      plurals: findPlurals(nodes).map((p) => ({
        name: p.name,
        ordinal: p.ordinal,
        options: Object.keys(p.options),
      })),
    };
  } catch (error) {
    parsed = { error: { message: error.message, position: error.position } };
  }
  return { message, structured: isIcuStructured(message), ...parsed };
});

fs.writeFileSync(
  new URL("./golden/icu.json", import.meta.url),
  JSON.stringify(out, null, 1) + "\n",
);
console.log(`Wrote ${out.length} messages`);
