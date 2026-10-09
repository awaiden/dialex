import fs from "node:fs";
import type { Plugin, ResolvedConfig } from "vite";
import { loadConfig } from "unconfig";
import fg from "fast-glob";
import type { DialexConfig } from "./index.js";
import { generateDts } from "./scanner.js";

function findDictionaryFiles(root: string, include: string | string[]): string[] {
  return fg.sync(include, { cwd: root, absolute: true, ignore: ["**/node_modules/**"] });
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

function eagerModuleCode(include: string | string[], locales: string[]): string {
  const globPattern = Array.isArray(include)
    ? include.map((p) => `'${p}'`).join(", ")
    : `'${include}'`;

  return `
    const modules = import.meta.glob(${globPattern}, { eager: true });
    const dictionaries = {};
    const configLocales = ${JSON.stringify(locales)};
    ${MISSING_LOCALE_CHECK}

    for (const path in modules) {
      const mod = modules[path];
      const def = mod.default || mod;
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

  return {
    name: "vite-plugin-dialex",
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
        return resolvedConfig.lazy
          ? lazyModuleCode(findDictionaryFiles(viteConfig.root, include), locales)
          : eagerModuleCode(include, locales);
      }
    },
  };
}
