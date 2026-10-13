import type { TranslationFormat } from "../export.js";

export interface ImportOptions {
  cwd?: string;
  config?: string;
  /** File to import (`.json`, `.csv`, or `.xlf`/`.xliff`). */
  file: string;
  format?: TranslationFormat;
  /** Locale for single-locale files. Defaults to the file name (`tr.json`) or XLIFF target language. */
  locale?: string;
  /** Allow keys that do not exist in any locale yet. */
  allowNew?: boolean;
  /** Print machine-readable JSON instead of human output. */
  json?: boolean;
}

export interface ImportEntry {
  locale: string;
  key: string;
  value: string;
}

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  /** Function/non-text values that cannot be overwritten. */
  skipped: string[];
  /** Values refused because they are invalid ICU or change the message arguments. */
  rejected: string[];
  unknown: string[];
  errors: string[];
}
