import { readStaticConfig } from "@dialexjs/cli/api";
import type { ESLint, Linter } from "eslint";

import pkg from "../package.json" with { type: "json" };
import { settingOf } from "./project.js";
import { noDynamicKey } from "./rules/no-dynamic-key.js";
import { noLiteralString } from "./rules/no-literal-string.js";
import { noUnknownDictionary } from "./rules/no-unknown-dictionary.js";
import { noUnknownPath } from "./rules/no-unknown-path.js";
import { validDictionary } from "./rules/valid-dictionary.js";

const rules = {
  "no-unknown-dictionary": noUnknownDictionary,
  "no-unknown-path": noUnknownPath,
  "no-dynamic-key": noDynamicKey,
  "no-literal-string": noLiteralString,
  "valid-dictionary": validDictionary,
};

const plugin = {
  meta: { name: "dialex", version: pkg.version },
  rules,
  configs: {} as Record<string, Linter.Config>,
} satisfies ESLint.Plugin;

/** Rule name -> the diagnostic code that `lint.rules` of `dialex.config.ts` uses for it. */
const CODES: Record<string, string> = {
  "no-unknown-dictionary": "unknown-dictionary",
  "no-unknown-path": "unknown-path",
  "no-dynamic-key": "dynamic-key",
  "no-literal-string": "literal-string",
};

const DEFAULTS: Record<string, Linter.RuleSeverity> = {
  "no-unknown-dictionary": "error",
  "no-unknown-path": "error",
  "no-dynamic-key": "warn",
  "valid-dictionary": "error",
};

/**
 * Severities for a flat config: what `dialex.config.ts` sets under `lint.rules`, else the default.
 * `literal-string` is only on when the config asks for it, or in `all`.
 */
function severities(root: string, literalDefault: Linter.RuleSeverity): Linter.RulesRecord {
  let config: ReturnType<typeof readStaticConfig>["config"] | undefined;
  try {
    config = readStaticConfig(root).config;
  } catch {
    config = undefined;
  }
  const out: Linter.RulesRecord = {};
  for (const name of Object.keys(rules)) {
    const fallback = name === "no-literal-string" ? literalDefault : DEFAULTS[name];
    const code = CODES[name];
    const level = config && code ? settingOf(config, code).level : undefined;
    out[`dialex/${name}`] = level ?? fallback;
  }
  return out;
}

const root = process.cwd();
plugin.configs.recommended = { plugins: { dialex: plugin }, rules: severities(root, "off") };
plugin.configs.all = { plugins: { dialex: plugin }, rules: severities(root, "warn") };

export { rules };
export default plugin;
