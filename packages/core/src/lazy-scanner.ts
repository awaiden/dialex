import type { autoScanAndLoadDictionaries as AutoScan } from "./scanner.js";

/**
 * Adapters only scan the project when they are given no `dictionaries`. Loading the scanner on
 * demand keeps `fast-glob`, `unconfig` and `node:fs` out of bundles (SSR, edge runtimes) that
 * pass their dictionaries explicitly.
 */
export const autoScanAndLoadDictionaries: typeof AutoScan = async (...args) => {
  const scanner = await import("./scanner.js");
  return scanner.autoScanAndLoadDictionaries(...args);
};
