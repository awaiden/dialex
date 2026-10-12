/**
 * Checks that the API reference covers the package.
 *
 *   bun run check-api-coverage
 *
 * - every export of every `dialexjs/*` entry point and of `@dialexjs/cli/api` is named somewhere in
 *   `docs/api/*.md` (the English pages: the translations are held to them by check-translations);
 * - every name imported from those entry points in a code block of the docs exists.
 *
 * It reads the built declarations in `packages/*\/dist`, so build the packages first. Without a
 * build it only warns, unless CI is set.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const DOCS = path.resolve(import.meta.dirname, "../docs");

/** Names a declaration file exports: inline declarations and `export { ... }` lists. */
function exportsOf(file: string): Set<string> {
  const text = fs.readFileSync(file, "utf8");
  const names = new Set<string>();
  for (const m of text.matchAll(
    /^export\s+(?:declare\s+)?(?:default\s+)?(?:function|const|class|interface|type|enum|namespace)\s+([A-Za-z0-9_$]+)/gm,
  )) {
    names.add(m[1]);
  }
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop();
      if (name) names.add(name);
    }
  }
  names.delete("default");
  return names;
}

function entryPoints(): Map<string, string> {
  const found = new Map<string, string>();
  const core = path.join(ROOT, "packages/core");
  const pkg = JSON.parse(fs.readFileSync(path.join(core, "package.json"), "utf8"));
  for (const [subpath, target] of Object.entries<any>(pkg.exports)) {
    if (subpath === "./package.json") continue;
    const file = typeof target === "string" ? target : (target.import ?? target.default);
    const name = subpath === "." ? "dialexjs" : `dialexjs/${subpath.slice(2)}`;
    found.set(name, path.join(core, file.replace(/\.mjs$/, ".d.mts")));
  }
  found.set("@dialexjs/cli/api", path.join(ROOT, "packages/cli/dist/api.d.mts"));
  return found;
}

function markdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ["de", "es", "tr", "zh", ".vuepress", "node_modules"].includes(entry.name)
        ? []
        : markdownFiles(full);
    }
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

const entries = entryPoints();
const missingBuild = [...entries.values()].filter((file) => !fs.existsSync(file));
if (missingBuild.length > 0) {
  const message = `declarations not built (${path.relative(ROOT, missingBuild[0])} ...); run \`bun run build:packages\``;
  if (process.env.CI) {
    console.error(`✖ check-api-coverage: ${message}`);
    process.exit(1);
  }
  console.warn(`⚠ check-api-coverage skipped: ${message}`);
  process.exit(0);
}

const problems: string[] = [];

// 1. Every export is named in the API reference
const api = markdownFiles(path.join(DOCS, "api"))
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const exportsByEntry = new Map<string, Set<string>>();
for (const [entry, file] of entries) {
  const names = exportsOf(file);
  exportsByEntry.set(entry, names);
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`(?<![A-Za-z0-9_$])${escaped}(?![A-Za-z0-9_$])`).test(api)) {
      problems.push(`${entry} exports ${name}, which docs/api does not mention`);
    }
  }
}

// 2. Every name the docs import exists
const IMPORT =
  /import\s+(?:type\s+)?(?:[A-Za-z0-9_$]+\s*,\s*)?\{([^}]+)\}\s+from\s+["'](dialexjs(?:\/[a-z0-9/-]+)?|@dialexjs\/cli\/api)["']/g;
for (const file of markdownFiles(DOCS)) {
  const text = fs.readFileSync(file, "utf8");
  for (const block of text.matchAll(
    /```(?:ts|tsx|typescript|js|jsx|svelte|vue)[^\n]*\n([\s\S]*?)```/g,
  )) {
    for (const m of block[1].matchAll(IMPORT)) {
      const available = exportsByEntry.get(m[2]);
      if (!available) {
        problems.push(`${path.relative(DOCS, file)} imports from unknown entry point "${m[2]}"`);
        continue;
      }
      for (const part of m[1].split(",")) {
        const name = part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0]
          .trim();
        if (name && !available.has(name) && name !== "default") {
          problems.push(
            `${path.relative(DOCS, file)} imports ${name} from "${m[2]}", which does not export it`,
          );
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problems:\n`);
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  process.exit(1);
}
const total = [...exportsByEntry.values()].reduce((sum, names) => sum + names.size, 0);
console.log(
  `✔ ${total} exports of ${entries.size} entry points are covered, and every documented import resolves.`,
);
