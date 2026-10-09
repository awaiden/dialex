/**
 * Builds the "Changelog" guide page for every language from the repository's CHANGELOG.md, so the
 * file stays the only place release notes are written. Each page gets a translated title and
 * introduction; the notes themselves stay in English.
 *
 *   bun run generate-changelog
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const DOCS = path.resolve(import.meta.dirname, "../docs");

const PAGES: Record<string, { title: string; intro: string }> = {
  "": {
    title: "Changelog",
    intro:
      "What changed in each release of `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` and the VS Code extension. The notes are written in English. Every release also appears on [GitHub Releases](https://github.com/awaiden/dialex/releases).",
  },
  tr: {
    title: "Değişiklik günlüğü",
    intro:
      "`dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` ve VS Code eklentisinin her sürümünde nelerin değiştiği. Notlar İngilizce yazılmıştır. Her sürüm ayrıca [GitHub Releases](https://github.com/awaiden/dialex/releases) sayfasında da yer alır.",
  },
  es: {
    title: "Registro de cambios",
    intro:
      "Qué cambió en cada versión de `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` y la extensión de VS Code. Las notas están escritas en inglés. Cada versión también aparece en [GitHub Releases](https://github.com/awaiden/dialex/releases).",
  },
  de: {
    title: "Änderungsprotokoll",
    intro:
      "Was sich in jeder Version von `dialexjs`, `@dialexjs/cli`, `@dialexjs/mcp` und der VS-Code-Erweiterung geändert hat. Die Notizen sind auf Englisch verfasst. Jede Version erscheint außerdem auf [GitHub Releases](https://github.com/awaiden/dialex/releases).",
  },
  zh: {
    title: "更新日志",
    intro:
      "`dialexjs`、`@dialexjs/cli`、`@dialexjs/mcp` 和 VS Code 扩展每个版本的变更内容。说明以英文撰写。每个版本也会发布在 [GitHub Releases](https://github.com/awaiden/dialex/releases)。",
  },
};

const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf-8");
// Drop the top-level title and the maintainer-only HTML comment.
const notes = changelog
  .replace(/^# .*\n+/, "")
  .replace(/<!--[\s\S]*?-->\n*/g, "")
  .trim();

for (const [lang, { title, intro }] of Object.entries(PAGES)) {
  const dir = path.join(DOCS, lang, "guide");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "changelog.md"), `# ${title}\n\n${intro}\n\n${notes}\n`, "utf-8");
}

console.log(`✔ Generated the changelog page in ${Object.keys(PAGES).length} languages`);
