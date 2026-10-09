#!/usr/bin/env node

import { Command } from "commander";
import { runGenerate } from "./commands/generate.js";
import { runInit } from "./commands/init.js";
import { logger } from "./utils/logger.js";
import { runCheck } from "./commands/check.js";
import { runExport } from "./commands/export.js";
import { runImport } from "./commands/import.js";
import { runTranslate } from "./commands/translate.js";

const program = new Command();

program
  .name("dialex")
  .description("Dialex CLI - High-performance, type-safe internationalization compiler and tooling")
  .version("0.3.0");

program
  .command("generate")
  .alias("gen")
  .description("Generate standalone dictionary bundle and TypeScript declarations")
  .option("-w, --watch", "Watch dictionary files for changes")
  .option("-o, --output <path>", "Custom output file path for generated dictionaries")
  .option("-c, --config <path>", "Custom config path")
  .option("--json", "Print machine-readable JSON")
  .action(async (opts) => {
    await runGenerate(opts);
  });

program
  .command("init")
  .description("Initialize Dialex in the current project")
  .option(
    "-f, --framework <framework>",
    "Target framework (hono, express, fastify, koa, nestjs, next, react)",
  )
  .option("-d, --default-locale <locale>", "Default locale (e.g. en)")
  .option("-l, --locales <locales>", "Comma-separated supported locales (e.g. en,tr)")
  .option("-y, --yes", "Skip prompts and use defaults")
  .option("--ai", "Configure AI agent support (.agents/skills, .mcp.json, AGENTS.md)")
  .option("--no-ai", "Skip AI agent configuration")
  .action(async (opts) => {
    await runInit(opts);
  });

program
  .command("check")
  .alias("lint")
  .description("Verify dictionary key parity and locale completeness")
  .option("-c, --config <path>", "Custom config path")
  .option("--json", "Print machine-readable JSON")
  .option("--github", "Print GitHub Actions annotations")
  .option("--fix", "Insert missing keys marked with [TODO]")
  .option("--src <globs...>", "Source globs to scan for dictionary references")
  .action(async (opts) => {
    await runCheck(opts);
  });

program
  .command("export")
  .description("Export dictionary strings for translators (json, csv, or xliff)")
  .option("-f, --format <format>", "Output format: json, csv, xliff", "json")
  .option("-o, --out <dir>", "Output directory", "dialex-export")
  .option("-l, --locale <locales...>", "Limit to these locales")
  .option("-c, --config <path>", "Custom config path")
  .option("--json", "Print machine-readable JSON")
  .action(async (opts) => {
    await runExport(opts);
  });

program
  .command("import <file>")
  .description("Write translated strings from a json, csv, or xliff file back into dictionaries")
  .option("-f, --format <format>", "Input format (inferred from the extension)")
  .option("-l, --locale <locale>", "Locale for single-locale files")
  .option("--allow-new", "Add keys that do not exist in any locale yet")
  .option("-c, --config <path>", "Custom config path")
  .option("--json", "Print machine-readable JSON")
  .action(async (file, opts) => {
    await runImport({ file, ...opts });
  });

program
  .command("translate")
  .description("Fill missing translations with the provider configured in dialex.config.ts")
  .option("-l, --locale <locales...>", "Target locales (default: all configured)")
  .option(
    "-s, --source <locale>",
    "Source locale (default: translate.sourceLocale or defaultLocale)",
  )
  .option("--dry-run", "List what would be translated without calling the provider")
  .option("-c, --config <path>", "Custom config path")
  .option("--json", "Print machine-readable JSON")
  .action(async (opts) => {
    try {
      await runTranslate(opts);
    } catch (err: any) {
      if (opts.json) {
        console.log(JSON.stringify({ success: false, error: err.message || String(err) }, null, 2));
      } else {
        logger.error(err.message || String(err));
      }
      process.exit(1);
    }
  });

program.parse();
