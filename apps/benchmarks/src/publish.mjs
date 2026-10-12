// Copies the measured results next to the documentation, where the <BenchmarkChart> component
// reads them. Run after `bench` and `size`.
//
//   node src/publish.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => JSON.parse(fs.readFileSync(path.join(here, "../results", file), "utf-8"));

const throughput = read("throughput.json");
const size = read("size.json");

const target = path.resolve(here, "../../docs/docs/.vuepress/data/benchmarks.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(
  target,
  JSON.stringify(
    {
      meta: throughput.meta,
      versions: size.versions,
      throughput: throughput.results,
      size: size.results,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Wrote ${path.relative(process.cwd(), target)}`);
