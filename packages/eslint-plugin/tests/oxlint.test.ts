import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vite-plus/test";

/** oxlint ships inside vite-plus; there is no separate dependency to install. */
function findOxlint(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const fromVitePlus = createRequire(require.resolve("vite-plus/package.json"));
    const pkg = fromVitePlus.resolve("oxlint/package.json");
    const bin = path.join(path.dirname(pkg), "bin", "oxlint");
    return fs.existsSync(bin) ? bin : undefined;
  } catch {
    return undefined;
  }
}

const built = fileURLToPath(new URL("../dist/index.mjs", import.meta.url));
const oxlint = findOxlint();
const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

describe.skipIf(!oxlint || !fs.existsSync(built))("oxlint", () => {
  it("loads the plugin through jsPlugins and reports its rules", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dialex-oxlint-"));
    dirs.push(dir);
    const write = (rel: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    write("dialex.config.ts", `export default { defaultLocale: "en", locales: ["en", "tr"] };\n`);
    write(
      "src/home.content.ts",
      `export default {\n  name: "home",\n  dictionary: {\n    en: { title: "Welcome", nav: { about: "About" } },\n    tr: { title: "Hoş Geldiniz" },\n  },\n};\n`,
    );
    write(
      "src/app.ts",
      `// getDictionary("commented")\ngetDictionary("nope");\ngetDictionary("home");\nt("home.nav.missing");\n`,
    );
    write(
      ".oxlintrc.json",
      JSON.stringify({
        jsPlugins: [built],
        rules: {
          "dialex/no-unknown-dictionary": "error",
          "dialex/no-unknown-path": "error",
          "dialex/valid-dictionary": "error",
        },
      }),
    );

    let output = "";
    try {
      output = execFileSync(process.execPath, [oxlint!, "-c", ".oxlintrc.json", "src"], {
        cwd: dir,
        encoding: "utf-8",
      });
    } catch (error: any) {
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`; // exits non-zero when it reports errors
    }

    expect(output).toContain('Unknown dictionary "nope"');
    expect(output).toContain('Unknown translation path "home.nav.missing"');
    expect(output).toContain('Locale "tr" is missing key "nav.about"');
    expect(output).not.toContain("commented");
  });
});
