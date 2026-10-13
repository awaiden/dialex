import { addMissing } from "./add-missing.js";
import { check } from "./check.js";
import { dialexConfig } from "./config.js";
import { findUsages } from "./find-usages.js";
import { generate } from "./generate.js";
import { getDictionary } from "./get-dictionary.js";
import { listDictionaries } from "./list-dictionaries.js";
import { missing } from "./missing.js";
import { setKey } from "./set-key.js";
import type { McpTool } from "./types.js";

export type { McpTool, ToolResult } from "./types.js";

/** Every tool, in the order clients see them. */
export const TOOLS: McpTool[] = [
  dialexConfig,
  listDictionaries,
  getDictionary,
  check,
  findUsages,
  missing,
  setKey,
  addMissing,
  generate,
];
