import { viteBundler } from "@vuepress/bundler-vite";
import { searchPlugin } from "@vuepress/plugin-search";
import { defaultTheme } from "@vuepress/theme-default";
import { defineUserConfig } from "vuepress";

import { LOCALES, type SiteLocale } from "./locales.js";

/** The pages in each sidebar, in order. The same list serves every language. */
const PAGES = {
  guide: [
    "getting-started",
    "dictionaries",
    "type-safety",
    "locale-detection",
    "fallbacks",
    "formatting",
    "key-paths",
    "icu",
    "routing",
    "lazy-loading",
    "testing",
    "vscode",
    "ai",
    "configuration",
    "changelog",
  ],
  frameworks: [
    "README",
    "nextjs",
    "react",
    "express",
    "fastify",
    "koa",
    "hono",
    "nestjs",
    "elysia",
    "sveltekit",
    "astro",
    "vue",
    "angular",
    "h3",
    "web",
  ],
  cli: ["README", "init", "generate", "check", "export", "import", "translate"],
  api: ["README"],
} as const;

function navbarFor(locale: SiteLocale) {
  const { prefix, nav } = locale;
  return [
    { text: nav.guide, link: `${prefix}guide/getting-started.html` },
    { text: nav.frameworks, link: `${prefix}frameworks/` },
    { text: nav.cli, link: `${prefix}cli/` },
    { text: nav.api, link: `${prefix}api/` },
  ];
}

function sidebarFor(locale: SiteLocale) {
  const { prefix, nav } = locale;
  const group = (section: keyof typeof PAGES) => [
    {
      text: nav[section],
      children: PAGES[section].map((page) => `${prefix}${section}/${page}.md`),
    },
  ];

  return {
    [`${prefix}guide/`]: group("guide"),
    [`${prefix}frameworks/`]: group("frameworks"),
    [`${prefix}cli/`]: group("cli"),
    [`${prefix}api/`]: group("api"),
  };
}

const locales = Object.values(LOCALES);

export default defineUserConfig({
  // GitHub Pages serves project sites under /<repo>/; set DOCS_BASE for that case.
  base: (process.env.DOCS_BASE as `/${string}/` | undefined) ?? "/",
  title: "Dialex",
  bundler: viteBundler(),
  locales: Object.fromEntries(
    locales.map((l) => [l.prefix, { lang: l.lang, title: "Dialex", description: l.description }]),
  ),
  plugins: [
    searchPlugin({
      maxSuggestions: 8,
      locales: Object.fromEntries(
        locales.map((l) => [l.prefix, { placeholder: l.searchPlaceholder }]),
      ),
    }),
  ],
  theme: defaultTheme({
    repo: "awaiden/dialex",
    docsDir: "apps/docs/docs",
    locales: Object.fromEntries(
      locales.map((l) => [
        l.prefix,
        {
          selectLanguageName: l.name,
          navbar: navbarFor(l),
          sidebar: sidebarFor(l),
          ...l.theme,
        },
      ]),
    ),
  }),
});
