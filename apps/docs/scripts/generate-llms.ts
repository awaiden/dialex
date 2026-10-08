import fs from "node:fs";
import path from "node:path";

const DOCS_DIR = path.resolve(import.meta.dirname, "../docs");
const PUBLIC_DIR = path.join(DOCS_DIR, ".vuepress/public");

function listEnglishPages(dir: string): string[] {
  const pages: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    // Exclude translated folders
    if (["tr", "es", "de", "zh"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...listEnglishPages(full));
    } else if (entry.name.endsWith(".md")) {
      pages.push(full);
    }
  }
  return pages;
}

function stripFrontmatter(content: string): { title: string; body: string } {
  let title = "Dialex Documentation";
  let body = content;
  if (content.startsWith("---")) {
    const end = content.indexOf("---", 3);
    if (end > 0) {
      body = content.slice(end + 3).trim();
    }
  }
  const headingMatch = /^#\s+(.+)$/m.exec(body);
  if (headingMatch) {
    title = headingMatch[1].trim();
  }
  return { title, body };
}

function generate() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const files = listEnglishPages(DOCS_DIR).sort();

  const sections: Array<{ rel: string; title: string; body: string }> = [];

  for (const file of files) {
    const rel = path.relative(DOCS_DIR, file).replace(/\\/g, "/");
    const raw = fs.readFileSync(file, "utf-8");
    const { title, body } = stripFrontmatter(raw);
    sections.push({ rel, title, body });
  }

  // 1. llms.txt (index format following the llms.txt standard)
  let llmsTxt = `# Dialex

> Type-safe, high-performance internationalization toolchain for JavaScript and TypeScript. Zero runtime overhead, strict compile-time parity, and ICU MessageFormat support across the full stack.

## Documentation

`;

  for (const sec of sections) {
    const url = `/${sec.rel.replace(/\.md$/, ".html")}`;
    llmsTxt += `- [${sec.title}](${url}): ${sec.title} documentation and reference.\n`;
  }

  llmsTxt += `\n## Tools & AI\n\n- [@dialexjs/mcp](/guide/ai.html): Model Context Protocol server for safe reading and AST editing.\n- [Skills](/guide/ai.html): Claude and Agent skills compatible with npx skills.\n`;

  fs.writeFileSync(path.join(PUBLIC_DIR, "llms.txt"), llmsTxt, "utf-8");

  // 2. llms-full.txt (all English markdown combined)
  let llmsFullTxt = `# Dialex Full Documentation\n\n`;
  for (const sec of sections) {
    llmsFullTxt += `\n---\n\n# File: ${sec.rel}\n\n${sec.body}\n`;
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, "llms-full.txt"), llmsFullTxt, "utf-8");

  console.log(
    `✔ Generated llms.txt and llms-full.txt from ${sections.length} English pages in ${PUBLIC_DIR}`,
  );
}

generate();
