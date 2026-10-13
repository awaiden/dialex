import path from "node:path";

import { generateDictionaries } from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const generate: McpTool = {
  name: "dialex_generate",
  description:
    "Run code generation to build standalone dictionary registry and TypeScript declarations.",
  inputSchema: {
    type: "object",
    properties: {
      output: {
        type: "string",
        description: "Optional custom output path for dialex.generated.ts.",
      },
      config: {
        type: "string",
        description: "Optional custom path to config file.",
      },
    },
  },

  async handler(root, args) {
    const schema = z.object({
      output: z.string().optional(),
      config: z.string().optional(),
    });
    const parsed = schema.parse(args);
    const res = generateDictionaries(root, { output: parsed.output, config: parsed.config });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              files: res.files.map((f) => path.relative(root, f)),
              outputPath: path.relative(root, res.outputPath),
              dtsPath: path.relative(root, res.dtsPath),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
