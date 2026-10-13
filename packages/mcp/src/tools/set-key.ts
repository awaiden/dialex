import path from "node:path";

import {
  TODO_PREFIX,
  getString,
  loadDictionaryFile,
  saveDictionaryFile,
  setString,
} from "@dialexjs/cli/api";
import { z } from "zod";

import type { McpTool } from "./types.js";

export const setKey: McpTool = {
  name: "dialex_set_key",
  description:
    "Safely set or update a translation string in a dictionary file using AST manipulation without executing project code or destroying comments/formatting. Refuses to overwrite non-[TODO] values unless overwrite is explicitly true.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "Dictionary file path (e.g. 'src/home.content.ts' or absolute path).",
      },
      locale: {
        type: "string",
        description: "Locale to update (e.g. 'tr').",
      },
      path: {
        type: "array",
        items: { type: "string" },
        description: "Key path segments (e.g. ['nav', 'about'] or ['title']).",
      },
      value: {
        type: "string",
        description: "The translated string value to set.",
      },
      overwrite: {
        type: "boolean",
        description:
          "Must be set to true to overwrite an existing translated value that is not marked [TODO]. Defaults to false.",
      },
    },
    required: ["file", "locale", "path", "value"],
  },

  async handler(root, args) {
    const schema = z.object({
      file: z.string(),
      locale: z.string(),
      path: z.array(z.string()),
      value: z.string(),
      overwrite: z.boolean().optional(),
    });
    const parsed = schema.parse(args);
    const filePath = path.isAbsolute(parsed.file) ? parsed.file : path.resolve(root, parsed.file);

    const df = await loadDictionaryFile(filePath);
    if (!df) {
      throw new Error(
        `Cannot load dictionary file at ${parsed.file} (unsupported shape or syntax error)`,
      );
    }

    const existingVal = getString(df, parsed.locale, parsed.path);
    const isTodo = existingVal?.startsWith(TODO_PREFIX);

    if (existingVal !== undefined && !isTodo && !parsed.overwrite) {
      throw new Error(
        `Key "${parsed.path.join(".")}" in locale "${parsed.locale}" already has a translated value (${JSON.stringify(existingVal)}). Set overwrite: true to overwrite.`,
      );
    }

    const res = setString(df, parsed.locale, parsed.path, parsed.value);
    if (res === "skipped") {
      throw new Error(
        `Cannot set string at "${parsed.path.join(".")}" in "${parsed.locale}": target is a function or non-string node.`,
      );
    }

    await saveDictionaryFile(df);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              action: res,
              file: path.relative(root, filePath),
              locale: parsed.locale,
              path: parsed.path,
              value: parsed.value,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
