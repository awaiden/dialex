import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, afterEach } from "vite-plus/test";
import { generateDictionaries } from "../src/commands/generate.js";

describe("CLI generate command", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cli-gen-test-"));

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("generates i18n.generated.ts and dialex-env.d.ts", () => {
    // Set up mock content file
    const contentCode = `
import { defineDictionary } from "dialexjs";
export default defineDictionary({
  name: "auth",
  dictionary: {
    en: { login: "Log in" },
    tr: { login: "Giriş yap" },
  },
});
`;
    fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "src/auth.content.ts"), contentCode, "utf-8");

    const result = generateDictionaries(tempDir);

    expect(result.files.length).toBe(1);
    expect(fs.existsSync(result.outputPath)).toBe(true);
    expect(fs.existsSync(result.dtsPath)).toBe(true);

    const generatedContent = fs.readFileSync(result.outputPath, "utf-8");
    expect(generatedContent).toContain("export const dictionaries");
    expect(generatedContent).toContain("export const dictionaryMap");
    expect(generatedContent).toContain('import dict_0 from "./auth.content.js"');
  });
});
