export const DIALEX_GUIDE_DOC = `# Dialex Internationalization Guide

Dialex is a high-performance, type-safe internationalization toolchain for JavaScript and TypeScript.

## Key Features
- **Zero Runtime Overhead**: Dictionaries are statically compiled.
- **Strict Parity**: Compile-time checking verifies that every key in your default locale exists in all configured locales.
- **ICU MessageFormat**: Native plural and select format support ({count, plural, one {# item} other {# items}}).
- **Universal Framework Support**: Native integrations for React, Next.js, Express, Fastify, Hono, Koa, NestJS, SvelteKit, Astro, Vue, and Nuxt.

## Content Dictionaries (\`*.content.ts\`)
Defined with \`defineDictionary\`:
\`\`\`ts
import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    greeting: (name: string) => \`Hello, \${name}!\`,
    items: "{count, plural, one {# item} other {# items}}",
  },
  tr: {
    title: "Hoş Geldiniz",
    greeting: (name: string) => \`Merhaba, \${name}!\`,
    items: "{count, plural, other {# öğe}}",
  },
});
\`\`\`

## CLI & Tooling
- \`dialex check\`: Parity checker. Use \`--fix\` to insert \`[TODO]\` stubs. Use \`--json\` for structured output.
- \`dialex generate\`: Generates \`dialex.generated.ts\` and \`dialex-env.d.ts\`.
- \`dialex export\` / \`dialex import\`: JSON, CSV, XLIFF interchange.
- \`dialex translate\`: Fill missing keys with AI providers (Claude, OpenAI, Gemini, DeepL).
`;

export const DIALEX_TRANSLATE_DOC = `# Dialex Translation Workflow

## Missing Keys & Workflow
1. Run \`dialex check --json\` to detect missing keys or parity discrepancies.
2. Run \`dialex check --fix\` (or \`dialex_add_missing\` via MCP) to automatically insert \`[TODO]\` stubs for missing keys.
3. Replace \`[TODO]\` entries with real translations using \`dialex_set_key\` via MCP or \`dialex translate\` via CLI.
4. Verify with \`dialex check\` that all keys are translated and ICU placeholders match.
`;

export const DIALEX_ICU_DOC = `# Dialex ICU MessageFormat Reference

## Plurals
\`\`\`icu
{count, plural,
  =0 {No notifications}
  one {# notification}
  other {# notifications}
}
\`\`\`

## Select
\`\`\`icu
{gender, select,
  male {He updated his profile}
  female {She updated her profile}
  other {They updated their profile}
}
\`\`\`

All locales for a given key must declare the exact same variable placeholders.
`;

export const DIALEX_ADAPTERS_DOC = `# Dialex Adapters Reference

- **React**: \`useDictionary("name")\`, \`useT()\` with \`DialexProvider\`.
- **Next.js App Router**: \`getDictionary("name", locale)\` in Server Components.
- **Express / Hono / Fastify**: Middleware injecting \`getDictionary\` or context variable into requests.
`;

export const DOC_TOPICS: Record<string, string> = {
  guide: DIALEX_GUIDE_DOC,
  translate: DIALEX_TRANSLATE_DOC,
  icu: DIALEX_ICU_DOC,
  adapters: DIALEX_ADAPTERS_DOC,
};
