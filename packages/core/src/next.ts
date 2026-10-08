import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { loadConfigSync } from "unconfig";
import type { I18nConfig } from "./index.js";
import { generateDts } from "./scanner.js";

function resolveI18nConfig(root: string, inlineConfig: I18nConfig = {}): I18nConfig {
  let loadedConfig: I18nConfig = {};
  try {
    const result = loadConfigSync<I18nConfig>({
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
      cwd: root,
    });
    if (result && result.config) {
      loadedConfig = result.config;
    }
  } catch {
    // Fallback if config loading fails
  }

  return {
    defaultLocale: "en",
    include: "**/*.content.ts",
    ...loadedConfig,
    ...inlineConfig,
  };
}

export function syncI18nFiles(root: string, config: I18nConfig) {
  const include = config.include || "**/*.content.ts";
  const files = fg.sync(include, { cwd: root, absolute: true, ignore: ["**/node_modules/**"] });

  // 1. Generate type declarations
  generateDts(root, files, config.locales);

  // 2. Prepare cache directory for virtual modules
  let cacheDir = path.join(root, "node_modules", ".cache", "dialex");
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch {
    cacheDir = path.join(root, ".dialex");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  const dictFilePath = path.join(cacheDir, "dictionaries.mjs");
  const configFilePath = path.join(cacheDir, "config.mjs");

  // 3. Write config module
  // `translate` holds provider objects that must never reach client bundles.
  const { translate: _translate, ...clientConfig } = config;
  const configContent = `export default ${JSON.stringify(clientConfig)};\n`;
  const existingConfig = fs.existsSync(configFilePath)
    ? fs.readFileSync(configFilePath, "utf-8")
    : "";
  if (existingConfig !== configContent) {
    fs.writeFileSync(configFilePath, configContent, "utf-8");
  }

  // 4. Write dictionaries module
  const imports: string[] = [];
  const listItems: string[] = [];

  files.forEach((file, index) => {
    let relPath = path.relative(cacheDir, file).replace(/\\/g, "/");
    relPath = relPath.replace(/\.(ts|tsx|js|mjs)$/, "");
    if (!relPath.startsWith(".")) {
      relPath = "./" + relPath;
    }
    imports.push(`import dict${index} from '${relPath}';`);
    listItems.push(`dict${index}`);
  });

  const dictContent = `/* eslint-disable */
${imports.join("\n")}

const configLocales = ${JSON.stringify(config.locales || [])};
const dictionaries = {};
const list = [${listItems.join(", ")}];

for (const mod of list) {
  const def = mod.default || mod;
  if (def && def.name && def.dictionary) {
    if (configLocales && configLocales.length > 0) {
      for (const locale of configLocales) {
        if (!(locale in def.dictionary)) {
          throw new Error(\`[dialex] Dictionary "\${def.name}" is missing locale: "\${locale}"\`);
        }
      }
    }
    dictionaries[def.name] = def.dictionary;
  }
}

export const lazy = false;
export function loadDictionary(name) {
  return Promise.resolve(dictionaries[name]);
}

export default dictionaries;
`;

  const existingDict = fs.existsSync(dictFilePath) ? fs.readFileSync(dictFilePath, "utf-8") : "";
  if (existingDict !== dictContent) {
    fs.writeFileSync(dictFilePath, dictContent, "utf-8");
  }

  return { dictFilePath, configFilePath };
}

/**
 * Next.js plugin wrapper for dialex.
 * Compatible with Next.js App Router & Pages Router (Webpack & Turbopack).
 */
export function withI18n(nextConfig: any = {}, inlineConfig: I18nConfig = {}) {
  const applyConfig = (baseConfig: any) => {
    const root = process.cwd();
    const config = resolveI18nConfig(root, inlineConfig);
    const { dictFilePath, configFilePath } = syncI18nFiles(root, config);

    return {
      ...baseConfig,
      webpack(webpackConfig: any, options: any) {
        webpackConfig.resolve = webpackConfig.resolve || {};
        webpackConfig.resolve.alias = {
          ...webpackConfig.resolve.alias,
          "virtual:dialex-dictionaries": dictFilePath,
          "virtual:dialex-config": configFilePath,
          "virtual:pregnancy-government-dictionaries": dictFilePath,
          "virtual:pregnancy-government-config": configFilePath,
        };

        webpackConfig.plugins = webpackConfig.plugins || [];
        webpackConfig.plugins.push({
          apply(compiler: any) {
            compiler.hooks.beforeCompile.tapPromise("DialexNextPlugin", async () => {
              syncI18nFiles(root, config);
            });

            compiler.hooks.compilation.tap(
              "DialexNextPlugin",
              (_compilation: any, { normalModuleFactory }: any) => {
                if (normalModuleFactory?.hooks?.resolveForScheme) {
                  normalModuleFactory.hooks.resolveForScheme
                    .for("virtual")
                    .tap("DialexNextPlugin", (resourceData: any) => {
                      if (
                        resourceData.resource?.startsWith("virtual:dialex-dictionaries") ||
                        resourceData.resource?.startsWith(
                          "virtual:pregnancy-government-dictionaries",
                        )
                      ) {
                        resourceData.path = dictFilePath;
                        resourceData.resource = dictFilePath;
                        return true;
                      }
                      if (
                        resourceData.resource?.startsWith("virtual:dialex-config") ||
                        resourceData.resource?.startsWith("virtual:pregnancy-government-config")
                      ) {
                        resourceData.path = configFilePath;
                        resourceData.resource = configFilePath;
                        return true;
                      }
                    });
                }
              },
            );
          },
        });

        if (typeof baseConfig?.webpack === "function") {
          return baseConfig.webpack(webpackConfig, options);
        }
        return webpackConfig;
      },
      turbopack: {
        ...baseConfig?.turbopack,
        resolveAlias: {
          ...baseConfig?.turbopack?.resolveAlias,
          "virtual:dialex-dictionaries": dictFilePath,
          "virtual:dialex-config": configFilePath,
          "virtual:pregnancy-government-dictionaries": dictFilePath,
          "virtual:pregnancy-government-config": configFilePath,
        },
      },
      experimental: {
        ...baseConfig?.experimental,
        turbo: {
          ...baseConfig?.experimental?.turbo,
          resolveAlias: {
            ...baseConfig?.experimental?.turbo?.resolveAlias,
            "virtual:dialex-dictionaries": dictFilePath,
            "virtual:dialex-config": configFilePath,
            "virtual:pregnancy-government-dictionaries": dictFilePath,
            "virtual:pregnancy-government-config": configFilePath,
          },
        },
      },
    };
  };

  if (typeof nextConfig === "function") {
    return (phase: string, context: any) => {
      const resolved = nextConfig(phase, context);
      if (resolved instanceof Promise) {
        return resolved.then(applyConfig);
      }
      return applyConfig(resolved);
    };
  }

  return applyConfig(nextConfig);
}
