import path from "node:path";

import { scanReferences } from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const findUsages: McpTool = {
  name: "dialex_find_usages",
  description:
    "Scan source files for dictionary usages (e.g. getDictionary('home') or t('home.title')).",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "Relative or absolute file path to scan for references.",
      },
    },
    required: ["file"],
  },

  async handler(root, args) {
    const schema = z.object({ file: z.string() });
    const parsed = schema.parse(args);
    const filePath = path.isAbsolute(parsed.file) ? parsed.file : path.resolve(root, parsed.file);
    const fs = await import("node:fs");
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${parsed.file}`);
    }
    const text = fs.readFileSync(filePath, "utf-8");
    const refs = scanReferences(text);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ file: path.relative(root, filePath), references: refs }, null, 2),
        },
      ],
    };
  },
};
