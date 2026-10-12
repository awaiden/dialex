# Benchmarks

Throughput and bundle size of Dialex next to i18next, intl-messageformat, Lingui, Paraglide JS and
Intlayer. The results feed the [Benchmarks](../docs/docs/guide/benchmarks.md) page of the docs.

```bash
bun run --cwd apps/benchmarks all
```

| Script      | What it does                                                                              |
| ----------- | ----------------------------------------------------------------------------------------- |
| `bench`     | Builds the Paraglide and Intlayer messages, then times the four cases in each library     |
| `size`      | Bundles the smallest useful program of each library and measures minified, gzip, brotli   |
| `docs:data` | Copies `results/*.json` to `apps/docs/docs/.vuepress/data/benchmarks.json` for the charts |
| `report`    | Prints the results as Markdown tables (the tables in the docs are written from these)     |
| `all`       | `bench`, `size` and `docs:data`                                                           |

Build the packages first (`bun run build:packages` at the repository root), because Dialex is
measured from its built output. Before anything is timed, every case is checked to return the same
text in every library.

Each run writes `results/throughput.json` and `results/size.json` with the Node version, CPU and
package versions. Numbers from different machines are not comparable.
