import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to AdonisJS with Dialex!",
    description: "A middleware that gives every request its locale and typed dictionaries.",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex ile AdonisJS'e Hoş Geldiniz!",
    description: "Her isteğe yerel ayarını ve tipli sözlükleri veren bir ara katman.",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
