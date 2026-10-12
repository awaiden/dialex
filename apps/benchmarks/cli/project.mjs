// Builds a synthetic Dialex project on disk: many feature folders, each with a dictionary in five
// locales (nested keys, ICU plurals and selects, one function leaf) and a source file that uses a
// few of its keys, so `generate` and `check` have realistic work to do.
import fs from "node:fs";
import path from "node:path";

export const LOCALES = ["en", "tr", "de", "es", "fr"];

const WORDS = {
  en: ["Save", "Cancel", "Welcome", "Settings", "Profile", "Search", "Delete", "Continue"],
  tr: ["Kaydet", "İptal", "Hoş geldin", "Ayarlar", "Profil", "Ara", "Sil", "Devam"],
  de: [
    "Speichern",
    "Abbrechen",
    "Willkommen",
    "Einstellungen",
    "Profil",
    "Suchen",
    "Löschen",
    "Weiter",
  ],
  es: ["Guardar", "Cancelar", "Bienvenido", "Ajustes", "Perfil", "Buscar", "Eliminar", "Continuar"],
  fr: [
    "Enregistrer",
    "Annuler",
    "Bienvenue",
    "Paramètres",
    "Profil",
    "Rechercher",
    "Supprimer",
    "Continuer",
  ],
};

function localeBlock(locale, i) {
  const w = WORDS[locale];
  return `  ${locale}: {
    title: "${w[0]} ${i}",
    actions: {
      save: "${w[0]}",
      cancel: "${w[1]}",
      remove: "${w[6]}",
    },
    greeting: "${w[2]}, {name}!",
    items: "{count, plural, =0 {No items} one {# item} other {# items}}",
    role: "{role, select, admin {Administrator} editor {Editor} other {Member}}",
    nav: { home: "${w[3]}", profile: "${w[4]}", search: "${w[5]}" },
    next: "${w[7]}",
    summary: (n: number) => \`\${n} / ${i}\`,
  },`;
}

export function dictionarySource(i) {
  return `import { defineDictionary } from "dialexjs";

export default defineDictionary("feature${i}", {
${LOCALES.map((locale) => localeBlock(locale, i)).join("\n")}
});
`;
}

export function pageSource(i) {
  return `import { t } from "../../i18n";

export function render${i}(count: number) {
  return [
    t("feature${i}.title"),
    t("feature${i}.actions.save"),
    t("feature${i}.items", { count }),
    t("feature${i}.nav.home"),
  ].join(" ");
}
`;
}

/** Writes the project into `dir` and returns the number of files written. */
export function createProject(dir, dictionaries) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "src", "features"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      { name: "bench-project", private: true, type: "module", dependencies: { dialexjs: "*" } },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { module: "esnext", moduleResolution: "bundler", strict: true },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "dialex.config.ts"),
    `import { defineConfig } from "dialexjs";

export default defineConfig({
  defaultLocale: "en",
  locales: ${JSON.stringify(LOCALES)},
  include: "src/**/*.content.ts",
});
`,
  );
  fs.writeFileSync(
    path.join(dir, "src", "i18n.ts"),
    "export const t = (key: string, values?: unknown) => key;\n",
  );
  for (let i = 0; i < dictionaries; i++) {
    const folder = path.join(dir, "src", "features", `f${i}`);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, `feature${i}.content.ts`), dictionarySource(i));
    fs.writeFileSync(path.join(folder, "page.ts"), pageSource(i));
  }
  return dictionaries * 2 + 4;
}
