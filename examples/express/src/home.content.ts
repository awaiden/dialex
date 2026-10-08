import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Express i18n API",
    description: "Robust middleware-based localization for Express.",
    greeting: (name: string) => `Hello, ${name}! Welcome to Express.`,
  },
  tr: {
    title: "Express i18n API'sine Hoş Geldiniz",
    description: "Express için güçlü ara yazılım tabanlı yerelleştirme.",
    greeting: (name: string) => `Merhaba, ${name}! Express'e hoş geldiniz.`,
  },
});
