import { execFileSync } from "node:child_process";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import * as fake from "./fake-vscode.js";
import { HOME, cleanup, writeProject } from "./helpers.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// DIALEX_BUNDLE points at an extension.cjs unpacked from a .vsix, to test what actually ships.
const bundlePath = process.env.DIALEX_BUNDLE ?? path.join(packageRoot, "dist/extension.cjs");

/**
 * Runs the *built* bundle (what ships in the .vsix) against the fake `vscode`, in plain Node
 * CommonJS, to catch problems the TypeScript sources hide: bundling mistakes, a dependency that
 * did not get inlined, or code that only works under the test runner's module system.
 * Needs `vp run build` first, so it is skipped when the bundle does not exist.
 */
describe.skipIf(!fs.existsSync(bundlePath))("built extension bundle", () => {
  type Loader = (request: string, ...rest: unknown[]) => unknown;
  const ModuleInternals = Module as unknown as { _load: Loader };
  const originalLoad = ModuleInternals._load;

  beforeEach(() => {
    fake.resetState();
    ModuleInternals._load = function (request, ...rest) {
      return request === "vscode" ? fake : originalLoad.call(this, request, ...rest);
    };
  });
  afterEach(() => {
    ModuleInternals._load = originalLoad;
    cleanup();
  });

  it("loads in CommonJS, activates, and reports problems from a real project", async () => {
    const bundle = createRequire(import.meta.url)(
      bundlePath,
    ) as typeof import("../src/extension.js");

    const dir = writeProject({
      "dialex.config.ts": `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`,
      "src/home.content.ts": HOME,
      "src/app.ts": `getDictionary("nope");\n`,
    });
    fake.state.folders = [{ uri: fake.Uri.file(dir) }];

    const api = bundle.activate({ subscriptions: [] } as any);
    await api.refresh();

    expect(typeof bundle.deactivate).toBe("function");
    expect(fake.state.hover).toBeDefined();
    expect(fake.state.commands.has("dialex.refresh")).toBe(true);

    const messages = [...fake.state.collection.entries.values()].flat().map((d) => d.message);
    expect(messages).toContain('Locale "tr" is missing key "nav.contact"');
    expect(messages).toContain('Unknown dictionary "nope"');
    expect(fake.state.output.join("\n")).not.toMatch(/analysis failed/);
  });

  it("regenerates dialex.generated.ts when a dictionary file is created", async () => {
    const bundle = createRequire(import.meta.url)(
      bundlePath,
    ) as typeof import("../src/extension.js");

    const dir = writeProject({
      "dialex.config.ts": `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`,
      "src/home.content.ts": HOME,
      "src/dialex.generated.ts": "// stale\n",
    });
    fake.state.folders = [{ uri: fake.Uri.file(dir) }];

    const api = bundle.activate({ subscriptions: [] } as any);
    await api.refresh();

    fs.writeFileSync(
      path.join(dir, "src/extra.content.ts"),
      `export default { name: "extra", dictionary: { en: { a: "x" }, tr: { a: "y" } } };\n`,
    );
    fake.state.watchers[0].fire.create();
    await new Promise((resolve) => setTimeout(resolve, 600));

    const generated = fs.readFileSync(path.join(dir, "src/dialex.generated.ts"), "utf-8");
    expect(generated).toContain("extra.content");
  });
});

describe.skipIf(!fs.existsSync(path.join(packageRoot, "dist/extension.cjs")))(
  "the packaged .vsix",
  () => {
    it("contains every file of dist, because the bundle requires its chunks at load time", () => {
      const vsce = path.join(packageRoot, "node_modules/.bin/vsce");
      const listed = execFileSync(vsce, ["ls", "--no-dependencies"], {
        cwd: packageRoot,
        encoding: "utf8",
      })
        .split("\n")
        .map((line) => line.trim().replace(/\\/g, "/"))
        .filter(Boolean);

      const dist = fs
        .readdirSync(path.join(packageRoot, "dist"))
        .filter((name) => name.endsWith(".cjs"))
        .map((name) => `dist/${name}`);

      expect(dist.length).toBeGreaterThan(0);
      for (const file of dist) expect(listed).toContain(file);
    });
  },
);
