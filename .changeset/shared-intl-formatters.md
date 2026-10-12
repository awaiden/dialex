---
"dialexjs": patch
---

Faster message formatting. ICU messages and the `plural`, `number`, `date`, `relativeTime` and `list` helpers reuse one `Intl` formatter per locale and options instead of creating a new one on every call, and each message is compiled once into a closure instead of walked on every call.

Measured with the new `apps/benchmarks` (operations per second, `t()` on ICU strings):

| Case          | Before |  After |
| ------------- | -----: | -----: |
| Lookup        |  6.8 M | 43.5 M |
| Interpolation |  4.0 M | 12.2 M |
| Plural        | 0.70 M | 1.31 M |
| Nested        | 0.65 M | 1.22 M |

The plural case was about 36,000 operations per second before the shared formatters (the "Before" column above already includes them). The runtime got larger by about 19% (`t` program: 6,081 B to 7,227 B minified, 2,301 B to 2,739 B gzip) because of the compiler.

Documentation: new Benchmarks and Comparison pages, in five languages.
