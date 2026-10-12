#!/usr/bin/env node
// `dialex-config`: writes .dialex/config.json, the resolved config the native CLI and language
// server read. It is written again on every call, so it is never stale.
//
//   dialex-config [root] [--static] [--config <file>] [--print]
//
//   --static   read the syntax tree only; never execute project code
//   --print    print the resolved config instead of writing it
import path from "node:path";

import { resolveConfig, writeConfig } from "./resolve.js";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};

const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--config");
const root = path.resolve(positional[0] ?? process.cwd());
const mode = flag("--static") ? "static" : "run";
const configFile = value("--config");

try {
  if (flag("--print")) {
    process.stdout.write(`${JSON.stringify(resolveConfig(root, { mode, configFile }), null, 2)}\n`);
  } else {
    const { file } = writeConfig(root, { mode, configFile });
    process.stdout.write(`wrote ${path.relative(root, file)}\n`);
  }
} catch (error) {
  process.stderr.write(`dialex-config: ${(error as Error).message}\n`);
  process.exit(1);
}
