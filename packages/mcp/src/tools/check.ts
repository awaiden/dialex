import path from "node:path";

import { analyzeProject, readStaticConfig } from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const check: McpTool = {
  name: "dialex_check",
  description:
    "Analyze project statically to verify dictionary key parity, ICU arguments, and source code references without executing project code.",
  inputSchema: {
    type: "object",
    properties: {
      src: {
        type: "array",
        items: { type: "string" },
        description: "Optional source file globs to scan for dictionary references.",
      },
      config: {
        type: "string",
        description: "Optional custom path to config file.",
      },
    },
  },

  async handler(root, args) {
    const schema = z.object({
      src: z.array(z.string()).optional(),
      config: z.string().optional(),
    });
    const parsed = schema.parse(args);
    const staticConf = readStaticConfig(root, parsed.config);
    const analysis = await analyzeProject({
      root,
      config: staticConf.config,
      src: parsed.src,
      runtime: false,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issues: analysis.issues.map((i) => ({
                ...i,
                file: path.relative(root, i.file),
              })),
              totalIssues: analysis.issues.filter((i) => i.level === "error").length,
              totalWarnings: analysis.issues.filter((i) => i.level === "warning").length,
              filesScanned: analysis.sourceFilesScanned,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
