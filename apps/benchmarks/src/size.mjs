// Bundle size of the smallest useful program in each library: create it, load one plural
// message, and format it. Bundled for the browser with esbuild, minified, then compressed.
//
//   node src/size.mjs            (after `bun run build:packages`)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));

const programs = {
  "dialexjs (t)": `
    import { createT } from "dialexjs";
    const t = createT(() => ({ items: "{count, plural, one {# item} other {# items}}" }), "en");
    console.log(t("bench.items", { count: globalThis.n }));
  `,
  "dialexjs/icu (formatMessage)": `
    import { formatMessage } from "dialexjs/icu";
    console.log(formatMessage("en", "{count, plural, one {# item} other {# items}}", { count: globalThis.n }));
  `,
  "dialexjs (function messages)": `
    import { createT, plural } from "dialexjs";
    const t = createT(() => ({ items: (count) => plural("en", count, { one: "1 item", other: count + " items" }) }), "en");
    console.log(t("bench.items", globalThis.n));
  `,
  i18next: `
    import i18next from "i18next";
    await i18next.init({ lng: "en", resources: { en: { translation: { items_one: "{{count}} item", items_other: "{{count}} items" } } } });
    console.log(i18next.t("items", { count: globalThis.n }));
  `,
  "intl-messageformat": `
    import { IntlMessageFormat } from "intl-messageformat";
    console.log(new IntlMessageFormat("{count, plural, one {# item} other {# items}}", "en").format({ count: globalThis.n }));
  `,
  "Paraglide JS": `
    import { plural } from "./paraglide/generated/messages.js";
    console.log(plural({ count: globalThis.n }));
  `,
  "@lingui/core": `
    import { i18n } from "@lingui/core";
    i18n.load("en", { items: ["{count, plural, one {# item} other {# items}}"] });
    i18n.activate("en");
    console.log(i18n._("items", { count: globalThis.n }));
  `,
};

const results = {};
for (const [name, source] of Object.entries(programs)) {
  const out = await build({
    stdin: {
      contents: source,
      resolveDir: path.join(here, ".."),
      sourcefile: "entry.mjs",
      loader: "js",
    },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    treeShaking: true,
    write: false,
    logLevel: "silent",
  });
  const code = out.outputFiles[0].contents;
  results[name] = {
    minified: code.length,
    gzip: zlib.gzipSync(code, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(code).length,
  };
  console.log(
    `${name.padEnd(32)} ${String(results[name].minified).padStart(7)} B min  ${String(results[name].gzip).padStart(7)} B gzip  ${String(results[name].brotli).padStart(7)} B brotli`,
  );
}

// Intlayer needs its bundler plugin to run in a browser (it replaces the Node-only config loader and
// inlines the built dictionaries), so it is measured with a Vite build and the `vite-intlayer` plugin.
{
  const { build: viteBuild } = await import("vite");
  const { intlayer } = await import("vite-intlayer");
  const root = path.resolve(here, "..");
  const log = console.log;
  console.log = () => {}; // the plugin prints its own progress
  const built = await viteBuild({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [intlayer()],
    build: {
      write: false,
      minify: "esbuild",
      lib: { entry: path.join(root, "intlayer-app/main.js"), formats: ["es"], fileName: "out" },
    },
  });
  console.log = log;
  const chunks = (Array.isArray(built) ? built : [built])
    .flatMap((r) => r.output)
    .filter((o) => o.type === "chunk");
  const code = Buffer.concat(chunks.map((c) => Buffer.from(c.code)));
  results["Intlayer"] = {
    minified: code.length,
    gzip: zlib.gzipSync(code, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(code).length,
  };
  console.log(
    `${"Intlayer (vite-intlayer)".padEnd(32)} ${String(results.Intlayer.minified).padStart(7)} B min  ${String(results.Intlayer.gzip).padStart(7)} B gzip  ${String(results.Intlayer.brotli).padStart(7)} B brotli`,
  );
}

const versions = {};
for (const pkg of [
  "i18next",
  "intl-messageformat",
  "@lingui/core",
  "@inlang/paraglide-js",
  "intlayer",
  "vite-intlayer",
  "esbuild",
]) {
  versions[pkg] = JSON.parse(
    fs.readFileSync(path.join(here, "..", "node_modules", pkg, "package.json"), "utf-8"),
  ).version;
}
versions.dialexjs = JSON.parse(
  fs.readFileSync(path.join(here, "../../../packages/core/package.json"), "utf-8"),
).version;

fs.mkdirSync(path.join(here, "../results"), { recursive: true });
fs.writeFileSync(
  path.join(here, "../results/size.json"),
  JSON.stringify({ date: new Date().toISOString().slice(0, 10), versions, results }, null, 2) +
    "\n",
);
console.log("\nWrote results/size.json");
