// Prints the results as Markdown tables, for the documentation.
import fs from "node:fs";

const throughput = JSON.parse(
  fs.readFileSync(new URL("../results/throughput.json", import.meta.url), "utf-8"),
);
const size = JSON.parse(fs.readFileSync(new URL("../results/size.json", import.meta.url), "utf-8"));

const fmt = (n) => (n === null ? "n/a" : n.toLocaleString("en-US"));
const cases = ["lookup", "interpolation", "plural", "nested"];
const rows = Object.entries(throughput.results);

console.log("| Library | Lookup | Interpolation | Plural | Nested select and plural |");
console.log("| --- | ---: | ---: | ---: | ---: |");
for (const [name, r] of rows)
  console.log(`| ${name} | ${cases.map((c) => fmt(r[c])).join(" | ")} |`);

console.log("\n| Program | Minified | Gzip | Brotli |");
console.log("| --- | ---: | ---: | ---: |");
for (const [name, r] of Object.entries(size.results)) {
  console.log(`| ${name} | ${fmt(r.minified)} B | ${fmt(r.gzip)} B | ${fmt(r.brotli)} B |`);
}
console.log("\n", JSON.stringify({ meta: throughput.meta, versions: size.versions }, null, 1));
