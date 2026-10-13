import fs from "node:fs";

import { generateDictionaries, renderGenerated, startGenerateWatcher } from "@dialexjs/cli/api";
import type { Connection } from "vscode-languageserver/node.js";

import type { ProjectRoot } from "../features.js";
import type { Settings } from "./settings.js";

export interface GenerationContext {
  connection: Connection;
  folders(): string[];
  projectsIn(folder: string): ProjectRoot[];
  settings(): Settings;
  /** True when the client sends file events itself; otherwise the server watches the disk. */
  clientWatches(): boolean;
  /** Called after a watcher-triggered regeneration, so the analysis is refreshed. */
  afterWatchRegenerate(): void;
}

/** Keeps the generated files of the projects that have them current, and watches the disk. */
export function createGeneration(context: GenerationContext) {
  const { connection } = context;
  const watchers = new Map<string, { close(): Promise<void> }>();

  /** The projects whose generated file exists; the others do not use one. */
  function generatedProjects(): { root: string; options: { config?: string; static: true } }[] {
    const found: { root: string; options: { config?: string; static: true } }[] = [];
    for (const folder of context.folders()) {
      for (const { root } of context.projectsIn(folder)) {
        const options = { config: context.settings().configPath, static: true as const };
        try {
          if (fs.existsSync(renderGenerated(root, options).outputPath)) {
            found.push({ root, options });
          }
        } catch (error) {
          connection.console.error(`[${root}] generate failed: ${(error as Error).message}`);
        }
      }
    }
    return found;
  }

  /**
   * Keeps `dialex.generated.ts` and `dialex-env.d.ts` current. The config is read from its syntax
   * tree, so no project code runs.
   */
  async function regenerate(): Promise<void> {
    const settings = context.settings();
    if (!settings.autoGenerate || !settings.enable) return;
    for (const { root, options } of generatedProjects()) {
      try {
        const { outputPath } = renderGenerated(root, options);
        const before = fs.readFileSync(outputPath, "utf-8");
        const { files } = generateDictionaries(root, options);
        if (fs.readFileSync(outputPath, "utf-8") !== before) {
          connection.console.info(
            `[${root}] regenerated ${outputPath.slice(root.length + 1)} (${files.length} dictionaries)`,
          );
        }
      } catch (error) {
        connection.console.error(`[${root}] generate failed: ${(error as Error).message}`);
      }
    }
  }

  /** Without client file events, watch each project that has a generated file ourselves. */
  async function syncWatchers(): Promise<void> {
    const wanted = new Map<string, { config?: string; static: true }>();
    const settings = context.settings();
    if (!context.clientWatches() && settings.autoGenerate && settings.enable) {
      for (const { root, options } of generatedProjects()) wanted.set(root, options);
    }

    for (const [root, watcher] of watchers) {
      if (!wanted.has(root)) {
        watchers.delete(root);
        await watcher.close();
      }
    }
    for (const [root, options] of wanted) {
      if (watchers.has(root)) continue;
      try {
        watchers.set(
          root,
          startGenerateWatcher(
            root,
            options,
            () => {
              void regenerate().then(() => context.afterWatchRegenerate());
            },
            250,
            (message) => connection.console.info(`[${root}] ${message}`),
          ),
        );
      } catch (error) {
        connection.console.error(`[${root}] could not watch: ${(error as Error).message}`);
      }
    }
  }

  async function dispose(): Promise<void> {
    await Promise.all([...watchers.values()].map((watcher) => watcher.close()));
    watchers.clear();
  }

  return { regenerate, syncWatchers, dispose };
}
