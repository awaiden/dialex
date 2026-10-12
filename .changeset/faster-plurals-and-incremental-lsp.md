---
"dialexjs": patch
"@dialexjs/cli": patch
"@dialexjs/language-server": patch
---

A second round of speed-ups.

- **Plural messages are about 7 times faster.** The results of `Intl.PluralRules.select` and of the `#` number format for counts 0 to 255 are remembered per locale (exactly what Intl returned, so every locale and numbering system stays correct), and messages with two or three parts get unrolled closures. `t()` on a plural: 1.3 M to 9.9 M operations per second; nested select and plural: 1.2 M to 8.5 M; interpolation: 12.2 M to 16.9 M; lookup: 43.5 M to 46.3 M.
- **Bundle size:** the `t` program is 8,025 B minified (3,029 B gzip), up from 7,227 B (2,739 B). The compiled closures and caches are the price of the speed above; the 10% size target was not met.
- **`dx` starts without Node.** With npm or Yarn classic on Linux and macOS, the install step replaces the JavaScript launcher with the native binary (about 25 ms of launcher overhead down to under 1 ms). `--ignore-scripts`, pnpm, Windows and every other case keep the JavaScript launcher.
- **Language server re-analysis is about 4 times faster.** After one edit in a project of 1,000 dictionaries it takes about 20 ms instead of about 75 ms: unchanged dictionaries and source files are reused, the tree is not walked again for a content edit, and unchanged diagnostics are not sent again.
