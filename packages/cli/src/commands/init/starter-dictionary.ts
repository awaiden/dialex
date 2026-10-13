import fs from "node:fs";
import path from "node:path";

import pc from "picocolors";

import type { SupportedFramework } from "../../utils/detector.js";
import { logger } from "../../utils/logger.js";

/** Writes `home.content.ts` with one entry per locale, unless it is already there. */
export function createStarterDictionary(
  root: string,
  framework: SupportedFramework,
  localeList: string[],
): void {
  const targetDir =
    (framework === "react-router" || framework === "adonis") &&
    fs.existsSync(path.join(root, "app"))
      ? path.join(root, "app")
      : fs.existsSync(path.join(root, "src"))
        ? path.join(root, "src")
        : root;
  const dictPath = path.join(targetDir, "home.content.ts");
  if (!fs.existsSync(dictPath)) {
    const dictRecords = localeList
      .map(
        (loc) => `  ${loc}: {
    title: "Welcome to Dialex (${loc})!",
    description: "Type-safe internationalization.",
    greeting: (name: string) => "Hello, " + name + "!",
  },`,
      )
      .join("\n");

    const dictContent = `import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
${dictRecords}
});
`;
    fs.writeFileSync(dictPath, dictContent, "utf-8");
    logger.success(`Created starter dictionary at ${pc.bold(path.relative(root, dictPath))}`);
  } else {
    logger.info("home.content.ts already exists, skipping creation.");
  }
}
