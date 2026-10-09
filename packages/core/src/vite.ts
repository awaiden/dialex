import fs from "node:fs";
import type { Plugin, ResolvedConfig } from "vite";
import { loadConfig } from "unconfig";
import fg from "fast-glob";
import type { DialexConfig } from "./index.js";
import { generateDts } from "./scanner.js";

const DICTIONARY_IGNORE = ["**/node_modules/**", "**/dist/**", "**/.next/**"];

/**
 * `include` is a glob relative to the project root, the same pattern the CLI and the scanner use.
 * A leading `/` or `./` is accepted, because that is how Vite spells root-relative globs.
 */
function normalizeInclude(include: string | string[]): string[] {
  return [include].flat().map((pattern) => pattern.replace(/^\.?\//, ""));
}

function findDictionaryFiles(root: string, include: string | string[]): string[] {
  return fg
    .sync(normalizeInclude(include), { cwd: root, absolute: true, ignore: DICTIONARY_IGNORE })
    .sort();
}

function syncDts(root: string, include: string | string[], locales?: string[]) {
  generateDts(root, findDictionaryFiles(root, include), locales);
}

/**
 * Reads the dictionary name from source text without executing it, for lazy loading.
 * Understands `defineDictionary("name", ...)` and `{ name: "name", dictionary: ... }`.
 */
export function readDictionaryName(source: string): string | undefined {
  return (
    /defineDictionary\(\s*(["'`])([^"'`\n]+)\1/.exec(source)?.[2] ??
    /\bname\s*:\s*(["'`])([^"'`\n]+)\1/.exec(source)?.[2]
  );
}

const MISSING_LOCALE_CHECK = `
function check(def, source) {
  if (configLocales.length > 0) {
    for (const locale of configLocales) {
      if (!(locale in def.dictionary)) {
        throw new Error(\`[dialex] Dictionary "\${def.name}" in \${source} is missing locale: "\${locale}"\`);
      }
    }
  }
}`;

function eagerModuleCode(files: string[], locales: string[]): string {
  const imports = files.map((file, i) => `import dict${i} from ${JSON.stringify(file)};`);
  const entries = files.map((file, i) => `  [dict${i}, ${JSON.stringify(file)}],`);

  return `
    ${imports.join("\n    ")}
    const dictionaries = {};
    const configLocales = ${JSON.stringify(locales)};
    ${MISSING_LOCALE_CHECK}

    for (const [mod, path] of [
${entries.join("\n")}
    ]) {
      const def = mod && mod.default ? mod.default : mod;
      if (def && def.name && def.dictionary) {
        check(def, path);
        dictionaries[def.name] = def.dictionary;
      }
    }

    export const lazy = false;
    export function loadDictionary(name) {
      return Promise.resolve(dictionaries[name]);
    }
    export default dictionaries;
  `;
}

function lazyModuleCode(files: string[], locales: string[]): string {
  const loaders = files.map((file) => {
    const name = readDictionaryName(fs.readFileSync(file, "utf-8"));
    if (!name) {
      throw new Error(
        `[dialex] Cannot determine the dictionary name of ${file} for lazy loading. ` +
          'Use defineDictionary("name", ...) or a literal `name` property.',
      );
    }
    return `  ${JSON.stringify(name)}: () => import(${JSON.stringify(file)}),`;
  });

  return `
    const loaders = {
${loaders.join("\n")}
    };
    const dictionaries = {};
    const pending = {};
    const configLocales = ${JSON.stringify(locales)};
    ${MISSING_LOCALE_CHECK}

    export const lazy = true;
    export function loadDictionary(name) {
      if (!pending[name]) {
        const load = loaders[name];
        pending[name] = load
          ? load().then((mod) => {
              const def = mod.default || mod;
              check(def, name);
              dictionaries[name] = def.dictionary;
              return def.dictionary;
            })
          : Promise.resolve(undefined);
      }
      return pending[name];
    }
    export default dictionaries;
  `;
}

const VIRTUAL_MODULE_ID = "virtual:dialex-dictionaries";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

const VIRTUAL_CONFIG_ID = "virtual:dialex-config";
const RESOLVED_VIRTUAL_CONFIG_ID = "\0" + VIRTUAL_CONFIG_ID;

export function dialexPlugin(inlineConfig: DialexConfig = {}): Plugin {
  let resolvedConfig: DialexConfig = {};
  let viteConfig: ResolvedConfig;

  let knownFiles: string[] = [];

  return {
    name: "vite-plugin-dialex",
    config() {
      // `dialexjs/react` and `dialexjs/vue` import the virtual modules below. In SSR, Vite loads
      // installed packages through Node, which cannot resolve `virtual:` specifiers, so those
      // packages must go through Vite. The dependency optimizer cannot resolve them either.
      return {
        ssr: { noExternal: ["dialexjs"] },
        optimizeDeps: { exclude: ["dialexjs"] },
      };
    },
    async configResolved(config) {
      viteConfig = config;
      const { config: loadedConfig } = await loadConfig<DialexConfig>({
        sources: [
          {
            files: "dialex.config",
            extensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "json", ""],
          },
          {
            files: "i18n.config",
            extensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "json", ""],
          },
        ],
        merge: false,
        defaults: {},
        cwd: viteConfig.root,
      });

      resolvedConfig = {
        defaultLocale: "en",
        include: "**/*.content.ts",
        ...loadedConfig,
        ...inlineConfig,
      };
    },
    buildStart() {
      // Generate type definitions at the start of the build/dev server
      syncDts(viteConfig.root, resolvedConfig.include || "**/*.content.ts", resolvedConfig.locales);
    },
    handleHotUpdate(ctx) {
      // Re-generate if a new content file is added/removed/changed
      // In a real app we might only regenerate if files are added/deleted, but this is fast enough.
      if (ctx.file.endsWith(".content.ts")) {
        syncDts(
          viteConfig.root,
          resolvedConfig.include || "**/*.content.ts",
          resolvedConfig.locales,
        );
      }
    },
    configureServer(server) {
      // New or deleted dictionary files change the virtual module, which Vite cannot know
      // because it no longer globs. Edits to existing files are ordinary module updates.
      const refresh = (file: string) => {
        if (!file.endsWith(".ts") && !file.endsWith(".js") && !file.endsWith(".mjs")) return;
        const include = resolvedConfig.include || "**/*.content.ts";
        const files = findDictionaryFiles(viteConfig.root, include);
        if (files.join("\n") === knownFiles.join("\n")) return;
        knownFiles = files;
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_VIRTUAL_CONFIG_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_CONFIG_ID) {
        // `translate` holds provider objects that must never reach client bundles.
        const { translate: _translate, ...clientConfig } = resolvedConfig;
        return `export default ${JSON.stringify(clientConfig)};`;
      }

      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const include = resolvedConfig.include || "**/*.content.ts";
        const locales = resolvedConfig.locales || [];
        knownFiles = findDictionaryFiles(viteConfig.root, include);
        return resolvedConfig.lazy
          ? lazyModuleCode(knownFiles, locales)
          : eagerModuleCode(knownFiles, locales);
      }
    },
  };
}
