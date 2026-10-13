import fs from "node:fs";
import path from "node:path";

import { loadFile, parseModule, writeFile } from "magicast";
import { addNuxtModule } from "magicast/helpers";
import pc from "picocolors";

import type { SupportedFramework } from "../../utils/detector.js";
import { logger } from "../../utils/logger.js";

/** Creates `dialex.config.ts`, or updates the locales of the one that exists. */
export async function writeDialexConfig(
  root: string,
  framework: SupportedFramework,
  defaultLocale: string,
  localeList: string[],
): Promise<void> {
  const configPath = fs.existsSync(path.join(root, "dialex.config.ts"))
    ? path.join(root, "dialex.config.ts")
    : fs.existsSync(path.join(root, "i18n.config.ts"))
      ? path.join(root, "i18n.config.ts")
      : path.join(root, "dialex.config.ts");
  const configFileName = path.basename(configPath);

  // These keep their source outside src/, so the generated file goes where their imports expect it
  const generatedOutput =
    framework === "react-router"
      ? "app/dialex.generated.ts"
      : framework === "adonis"
        ? "start/dialex.generated.ts"
        : undefined;

  try {
    if (fs.existsSync(configPath)) {
      const mod = await loadFile(configPath);
      if (mod && mod.exports.default) {
        if (mod.exports.default.$args && mod.exports.default.$args[0]) {
          mod.exports.default.$args[0].defaultLocale = defaultLocale;
          mod.exports.default.$args[0].locales = localeList;
          if (generatedOutput) mod.exports.default.$args[0].output = generatedOutput;
        }
        await writeFile(mod, configPath);
        logger.success(`Updated ${pc.bold(configFileName)} via Magicast`);
      }
    } else {
      const mod = parseModule(`import { defineConfig } from "dialexjs";

export default defineConfig({});
`);
      mod.exports.default.$args[0].defaultLocale = defaultLocale;
      mod.exports.default.$args[0].locales = localeList;
      if (generatedOutput) mod.exports.default.$args[0].output = generatedOutput;
      await writeFile(mod, configPath);
      logger.success(`Created ${pc.bold(configFileName)} via Magicast`);
    }
  } catch (err: any) {
    logger.warn(`Magicast config update notice: ${err.message || String(err)}`);
    // Fallback safe string write if AST parser encounters non-standard syntax
    const fallback = `import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "${defaultLocale}",
  locales: [${localeList.map((l) => `"${l}"`).join(", ")}],${
    generatedOutput ? `\n  output: "${generatedOutput}",` : ""
  }
});
`;
    fs.writeFileSync(configPath, fallback, "utf-8");
  }
}

/** Nuxt reads the generated file through its module; it has to be registered in the Nuxt config. */
export async function registerNuxtModule(root: string): Promise<void> {
  const nuxtConfig = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"]
    .map((f) => path.join(root, f))
    .find((f) => fs.existsSync(f));
  if (nuxtConfig) {
    try {
      const nMod = await loadFile(nuxtConfig);
      addNuxtModule(nMod, "dialexjs/nuxt", "dialex", {});
      await writeFile(nMod, nuxtConfig);
      logger.success(
        `Registered dialexjs/nuxt in ${pc.bold(path.basename(nuxtConfig))} via Magicast`,
      );
    } catch {
      logger.warn("Could not update the Nuxt config; add the dialexjs/nuxt module manually.");
    }
  }
}
