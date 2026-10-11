import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Hapi with Dialex!",
    description: "A Hapi server with typed, per-request dictionaries.",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex ile Hapi'ye Hoş Geldiniz!",
    description: "Hapi sunucusu için istek başına tipli sözlükler.",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
