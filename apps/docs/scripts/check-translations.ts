/**
 * Checks that every translated page still has the same structure as its English original, and
 * that every link to a heading anchor points at something.
 *
 *   bun run check-translations
 *
 * Translators may change prose, but not: the code blocks, the number and level of headings, the
 * links, the tables, or the container blocks. Exits with code 1 and a list of mismatches.
 */
import fs from "node:fs";
import path from "node:path";

import { slugify } from "@mdit-vue/shared";

import { TRANSLATED } from "../docs/.vuepress/locales.ts";

const DOCS = path.resolve(import.meta.dirname, "../docs");

interface Page {
  file: string;
  frontMatter?: string;
  frontMatterKeys: string[];
  frontMatterLinks: string[];
  codeBlocks: string[];
  headings: { level: number; text: string }[];
  links: string[];
  tableRows: number;
  containers: number;
  /** Anchors a link can target: heading slugs and explicit ids. */
  anchors: Set<string>;
}

function listPages(dir: string): string[] {
  const pages: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) pages.push(...listPages(full));
    else if (entry.name.endsWith(".md")) pages.push(full);
  }
  return pages;
}

/** Plain text of a heading, the way it is slugified: no inline markup. */
function headingText(raw: string): string {
  return raw
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]/g, "")
    .trim();
}

function parse(file: string): Page {
  const lines = fs.readFileSync(file, "utf-8").split("\n");
  const page: Page = {
    file,
    frontMatterKeys: [],
    frontMatterLinks: [],
    codeBlocks: [],
    headings: [],
    links: [],
    tableRows: 0,
    containers: 0,
    anchors: new Set(),
  };

  let i = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) {
      page.frontMatter = lines.slice(1, end).join("\n");
      for (const line of lines.slice(1, end)) {
        const key = /^\s*(?:-\s+)?([A-Za-z][\w-]*):(.*)$/.exec(line);
        if (!key) continue;
        page.frontMatterKeys.push(key[1]);
        if (key[1] === "link") page.frontMatterLinks.push(key[2].trim());
      }
      i = end + 1;
    }
  }

  let fence: { marker: string; body: string[] } | undefined;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const fenceLine = /^\s*(`{3,}|~{3,})/.exec(line);

    if (fence) {
      if (
        fenceLine &&
        fenceLine[1][0] === fence.marker[0] &&
        fenceLine[1].length >= fence.marker.length
      ) {
        page.codeBlocks.push(fence.body.join("\n"));
        fence = undefined;
      } else {
        fence.body.push(line);
      }
      continue;
    }
    if (fenceLine) {
      fence = { marker: fenceLine[1], body: [] };
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      const text = headingText(heading[2]);
      page.headings.push({ level: heading[1].length, text });
      page.anchors.add(slugify(text));
    }
    for (const id of line.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) page.anchors.add(id[1]);
    for (const link of line.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g))
      page.links.push(link[1]);
    if (line.trimStart().startsWith("|")) page.tableRows++;
    if (line.trimStart().startsWith(":::")) page.containers++;
  }
  return page;
}

/** Drops blank lines and whole-line comments, so translators may translate comments. */
function normalizeCode(block: string): string {
  return block
    .split("\n")
    .filter((line) => line.trim() !== "" && !/^\s*(\/\/|#|<!--)/.test(line))
    .join("\n");
}

/** Internal links compare equal across languages: `/tr/guide/x.html` and `/guide/x.html`. */
function normalizeLink(link: string, locale?: string): string {
  return locale ? link.replace(new RegExp(`^/${locale}/`), "/") : link;
}

const sorted = (values: string[]) => [...values].sort();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function compare(english: Page, translated: Page, locale: string): string[] {
  const problems: string[] = [];

  if (!same(english.frontMatterKeys, translated.frontMatterKeys)) {
    problems.push("front matter keys differ");
  }
  if (
    !same(
      english.frontMatterLinks.map((l) => normalizeLink(l)),
      translated.frontMatterLinks.map((l) => normalizeLink(l, locale)),
    )
  ) {
    problems.push("front matter links differ (translated links need the language prefix)");
  }

  if (english.codeBlocks.length !== translated.codeBlocks.length) {
    problems.push(
      `${translated.codeBlocks.length} code blocks, expected ${english.codeBlocks.length}`,
    );
  } else {
    english.codeBlocks.forEach((block, index) => {
      if (normalizeCode(block) !== normalizeCode(translated.codeBlocks[index])) {
        problems.push(`code block ${index + 1} differs from the English original`);
      }
    });
  }

  const levels = (page: Page) => page.headings.map((h) => h.level);
  if (!same(levels(english), levels(translated))) {
    problems.push(
      `heading levels differ (English: ${levels(english).join("")}, translated: ${levels(translated).join("")})`,
    );
  }

  if (
    !same(
      sorted(english.links.map((l) => normalizeLink(l))),
      sorted(translated.links.map((l) => normalizeLink(l, locale))),
    )
  ) {
    const missing = english.links.filter(
      (l) => !translated.links.map((t) => normalizeLink(t, locale)).includes(normalizeLink(l)),
    );
    problems.push(
      `links differ${missing.length ? ` (missing: ${missing.slice(0, 3).join(", ")})` : ""}`,
    );
  }

  if (english.tableRows !== translated.tableRows) {
    problems.push(`${translated.tableRows} table rows, expected ${english.tableRows}`);
  }
  if (english.containers !== translated.containers) {
    problems.push(`${translated.containers} ::: lines, expected ${english.containers}`);
  }
  return problems;
}

/** Anchor links (`page.md#fragment`) must resolve to a heading or explicit id on the target page. */
function checkAnchors(pages: Map<string, Page>): string[] {
  const problems: string[] = [];
  for (const page of pages.values()) {
    for (const link of page.links) {
      const hash = link.indexOf("#");
      if (hash === -1 || /^[a-z][a-z\d+.-]*:/i.test(link)) continue;

      const target = link.slice(0, hash);
      const fragment = decodeURIComponent(link.slice(hash + 1));
      if (target.startsWith("/")) continue; // site-absolute links point at built HTML
      const targetFile = target === "" ? page.file : path.resolve(path.dirname(page.file), target);
      const resolved = pages.get(targetFile);

      if (!resolved)
        problems.push(`${rel(page.file)}: ${link} points at a page that does not exist`);
      else if (!resolved.anchors.has(fragment)) {
        problems.push(`${rel(page.file)}: ${link} has no matching heading or id`);
      }
    }
  }
  return problems;
}

const rel = (file: string) => path.relative(DOCS, file);

function main() {
  const english = new Map<string, Page>();
  for (const file of listPages(DOCS)) {
    if (!TRANSLATED.some((code) => rel(file).startsWith(`${code}${path.sep}`))) {
      english.set(file, parse(file));
    }
  }

  const failures: string[] = [];
  const all = new Map(english);

  for (const locale of TRANSLATED) {
    const dir = path.join(DOCS, locale);
    const translations = new Map<string, Page>();
    if (fs.existsSync(dir)) {
      for (const file of listPages(dir)) translations.set(file, parse(file));
    }

    for (const [file, page] of english) {
      const counterpart = path.join(dir, path.relative(DOCS, file));
      const translated = translations.get(counterpart);
      if (!translated) {
        failures.push(`${locale}/${rel(file)}: missing translation`);
        continue;
      }
      all.set(counterpart, translated);
      for (const problem of compare(page, translated, locale)) {
        failures.push(`${locale}/${rel(file)}: ${problem}`);
      }
    }

    for (const file of translations.keys()) {
      if (!english.has(path.join(DOCS, path.relative(dir, file)))) {
        failures.push(`${locale}/${path.relative(dir, file)}: no English original (stale?)`);
      }
    }
  }

  failures.push(...checkAnchors(all));

  const pages = english.size;
  if (failures.length > 0) {
    console.error(`\n${failures.length} problem${failures.length === 1 ? "" : "s"}:\n`);
    for (const failure of failures) console.error(`  ✖ ${failure}`);
    console.error("");
    process.exit(1);
  }
  console.log(
    `✔ ${pages} pages × ${TRANSLATED.length} languages are in sync, and all anchor links resolve.`,
  );
}

main();
