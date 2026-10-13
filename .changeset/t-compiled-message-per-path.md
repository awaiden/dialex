---
"dialexjs": patch
---

`t()` keeps the compiled message with its path, so a repeated call with values skips the lookup by message text. Plural and select messages are about 10% faster in a single-locale app (measured old against new in one process); a server that renders several locales in turn is unchanged.
