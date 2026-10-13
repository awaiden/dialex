import {
  TODO_PREFIX,
  copyLeaf,
  hasPath,
  listLeaves,
  listLocales,
  loadStaticProject,
  saveDictionaryFile,
} from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const addMissing: McpTool = {
  name: "dialex_add_missing",
  description:
    "Automatically insert missing keys across all locales as [TODO] placeholders copied from default locale values (AST safe edits).",
  inputSchema: {
    type: "object",
    properties: {
      config: {
        type: "string",
        description: "Optional custom path to config file.",
      },
    },
  },

  async handler(root, args) {
    const schema = z.object({ config: z.string().optional() });
    const parsed = schema.parse(args);
    const project = await loadStaticProject(root, parsed.config);
    const defaultLocale = project.config.defaultLocale || "en";
    const configuredLocales = project.config.locales || [];

    let totalFixed = 0;

    for (const d of project.dictionaries) {
      if (!d.df.complete) continue;
      const present = listLocales(d.df);
      const targets = Array.from(new Set([...present, ...configuredLocales]));
      const sourceOrder = [defaultLocale, ...present.filter((l) => l !== defaultLocale)].filter(
        (l) => present.includes(l),
      );

      const allPaths = new Map<string, string[]>();
      for (const locale of present) {
        for (const leaf of listLeaves(d.df, locale))
          allPaths.set(leaf.path.join("\u0000"), leaf.path);
      }

      let changed = false;
      for (const target of targets) {
        for (const leafPath of allPaths.values()) {
          if (hasPath(d.df, target, leafPath)) continue;
          const source = sourceOrder.find((l) => l !== target && hasPath(d.df, l, leafPath));
          if (source && copyLeaf(d.df, source, target, leafPath, (v) => `${TODO_PREFIX}${v}`)) {
            totalFixed++;
            changed = true;
          }
        }
      }

      if (changed) {
        await saveDictionaryFile(d.df);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, fixed: totalFixed }, null, 2),
        },
      ],
    };
  },
};
