import fs from "node:fs";

import { generateDictionaries, renderGenerated } from "@dialexjs/cli/api";
import * as vscode from "vscode";

import type { Services } from "./services.js";

/**
 * Keeps `dialex.generated.ts` and `dialex-env.d.ts` current by regenerating them when a
 * dictionary or config file changes, in projects that already have a generated file. The config
 * is read from its syntax tree, so no workspace code runs.
 */
export function regenerate(services: Services): void {
  if (!services.settings().get<boolean>("autoGenerate", true)) return;
  if ((vscode.workspace as { isTrusted?: boolean }).isTrusted === false) return;

  const configPath = services.settings().get<string>("configPath") || undefined;
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    for (const { root } of services.projectsIn(folder.uri.fsPath)) {
      try {
        const options = { config: configPath, static: true };
        const { outputPath } = renderGenerated(root, options);
        if (!fs.existsSync(outputPath)) continue; // the project does not use a generated file
        const before = fs.readFileSync(outputPath, "utf-8");
        const { files } = generateDictionaries(root, options);
        if (fs.readFileSync(outputPath, "utf-8") !== before) {
          const where = outputPath.slice(root.length + 1);
          services.output.appendLine(
            `[${root}] regenerated ${where} (${files.length} dictionaries)`,
          );
          vscode.window.setStatusBarMessage(`Dialex: regenerated ${where}`, 3000);
        }
      } catch (error) {
        services.output.appendLine(`[${root}] generate failed: ${(error as Error).message}`);
      }
    }
  }
}
