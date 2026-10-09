---
"dialexjs": minor
"@dialexjs/cli": minor
---

`t()` checks ICU arguments. `dx generate` writes `MessageArguments` into `dialex-env.d.ts` (read from each dictionary's default locale), so `t("cart.items", { count })` fails to compile when `count` is missing, misspelled or not a number. `plural`, `selectordinal` and `number` are `number`, `date` and `time` are `Date | number`, `select` is the union of its options, and a plain `{name}` takes a string, number, boolean or `Date`.

A message that has ICU arguments can no longer be called without values (`t("cart.owner")` was allowed and returned the raw string). Pass the values, or remove the braces if they were literal.

Adapters that scan the project at runtime (no `dictionaries` passed) no longer write `dialex-env.d.ts`; it was a second writer that could undo the generated file. Run `dx generate`.
