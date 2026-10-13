import path from "node:path";

import { logger } from "../../utils/logger.js";
import type { GenerateOptions } from "./types.js";
import { startGenerateWatcher } from "./watch.js";
import { generateDictionaries } from "./write.js";

export type { GenerateOptions, RenderedGenerate } from "./types.js";
export { LOCALES_DIR, renderGenerated } from "./render.js";
export { generateDictionaries } from "./write.js";
export { startGenerateWatcher } from "./watch.js";

export async function runGenerate(options: GenerateOptions = {}) {
  const root = options.cwd || process.cwd();
  const quiet = options.json === true;

  const doGenerate = () => {
    try {
      const { files, outputPath, dtsPath, configFile, notes } = generateDictionaries(root, options);
      if (quiet) {
        console.log(
          JSON.stringify(
            {
              success: true,
              files: files.map((f) => path.relative(root, f)),
              outputPath: path.relative(root, outputPath),
              dtsPath: path.relative(root, dtsPath),
              notes,
            },
            null,
            2,
          ),
        );
      } else {
        if (!configFile) {
          logger.info("No dialex.config.* found, using defaults (run `dialex init` to add one).");
        }
        logger.success(
          `Generated dictionaries for ${files.length} file${files.length === 1 ? "" : "s"}:`,
        );
        logger.info(`→ ${path.relative(root, outputPath)}`);
        logger.info(`→ ${path.relative(root, dtsPath)}`);
        for (const note of notes) logger.info(note);
      }
      return true;
    } catch (err: any) {
      if (quiet) {
        console.log(
          JSON.stringify(
            {
              success: false,
              error: err.message || String(err),
            },
            null,
            2,
          ),
        );
      } else {
        logger.error(`Generation failed: ${err.message || String(err)}`);
      }
      return false;
    }
  };

  const ok = doGenerate();
  if (!ok && !options.watch) {
    process.exit(1);
  }

  if (options.watch) {
    logger.info("Watching for dictionary changes (-w, --watch)...");
    startGenerateWatcher(root, options, doGenerate);
  }
}
