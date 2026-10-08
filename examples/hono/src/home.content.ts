import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Hono i18n API",
    description: "Fast, lightweight localization with Hono.",
    greeting: (name: string) => `Hello, ${name}! Welcome back.`,
  },
  tr: {
    title: "Hono i18n API'sine Hoş Geldiniz",
    description: "Hono ile hızlı ve hafif yerelleştirme.",
    greeting: (name: string) => `Merhaba, ${name}! Tekrar hoş geldiniz.`,
  },
});
