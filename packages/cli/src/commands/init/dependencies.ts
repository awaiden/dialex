import fs from "node:fs";
import path from "node:path";

import pc from "picocolors";

import { logger } from "../../utils/logger.js";
import { addRequiredPackages, installCommand } from "../../utils/package-json.js";

/** Adds `dialexjs` and `@dialexjs/cli` to package.json, and the `dx:generate` script. */
export function updatePackageJson(root: string): void {
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const added = addRequiredPackages(pkg);
      pkg.scripts = pkg.scripts || {};
      const addScript = !pkg.scripts["dx:generate"];
      if (addScript) pkg.scripts["dx:generate"] = "dx generate";

      if (added.length > 0 || addScript) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      }
      if (added.length > 0) {
        logger.success(`Added ${added.join(" and ")} to package.json`);
        logger.info(`Run ${pc.bold(installCommand(root))} to install them.`);
      }
      if (addScript) logger.success('Added "dx:generate" script to package.json');
    } catch {
      logger.warn("Could not update package.json; add dialexjs and @dialexjs/cli manually.");
    }
  } else {
    logger.warn("No package.json found; install dialexjs and @dialexjs/cli in your project.");
  }
}
