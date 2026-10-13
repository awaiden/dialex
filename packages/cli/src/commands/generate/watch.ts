import path from "node:path";

import chokidar from "chokidar";

import { createGitignoreFilter } from "../../utils/files.js";
import { logger } from "../../utils/logger.js";
import { renderGenerated } from "./render.js";
import type { GenerateOptions } from "./types.js";

const WATCH_IGNORED =
  /(^|[\\/])(node_modules|dist|\.next|\.nuxt|\.output|\.turbo|\.git|dialex\.locales)([\\/]|$)/;
const CONFIG_FILE = /(^|[\\/])(dialex|i18n)\.config\.[cm]?[jt]s(on)?$/;

/**
 * Regenerates when a dictionary or config file is added, edited or removed. chokidar 4+ no longer
 * understands globs, so this watches the project directory and decides for itself which events
 * matter, using the same `include` glob as `generate`.
 */
export function startGenerateWatcher(
  root: string,
  options: GenerateOptions,
  regenerate: () => void,
  delay = 100,
  /** Where to report what triggered a regeneration. Defaults to the CLI logger (stdout). */
  log: (message: string) => void = (message) => logger.info(message),
) {
  const dictionaryFiles = () => new Set(renderGenerated(root, options).files);
  let known = dictionaryFiles();
  let outputs = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      regenerate();
      try {
        known = dictionaryFiles();
        const rendered = renderGenerated(root, options);
        outputs = new Set([rendered.outputPath, rendered.dtsPath]);
      } catch {
        // keep the previous list; the next event tries again
      }
    }, delay);
  };

  const gitIgnored = createGitignoreFilter(root);
  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    ignored: (file: string) => WATCH_IGNORED.test(file) || gitIgnored(path.resolve(root, file)),
  });

  watcher.on("all", (event, filePath) => {
    const file = path.resolve(root, filePath);
    if (outputs.has(file)) return; // our own output
    const isConfig = CONFIG_FILE.test(file);

    if (event === "change") {
      if (!known.has(file) && !isConfig) return;
    } else if (event === "add" || event === "unlink") {
      let now: Set<string>;
      try {
        now = dictionaryFiles();
      } catch {
        return;
      }
      const changed = now.size !== known.size || [...now].some((f) => !known.has(f));
      if (!changed && !isConfig) return;
    } else {
      return;
    }

    log(`[${event}] ${path.relative(root, file)} changed, regenerating...`);
    trigger();
  });

  return watcher;
}
