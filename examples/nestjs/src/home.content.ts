import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to NestJS i18n API",
    description: "Enterprise modular localization for NestJS.",
    greeting: (name: string) => `Hello, ${name}! Welcome to NestJS.`,
  },
  tr: {
    title: "NestJS i18n API'sine Hoş Geldiniz",
    description: "NestJS için kurumsal modüler yerelleştirme.",
    greeting: (name: string) => `Merhaba, ${name}! NestJS'e hoş geldiniz.`,
  },
});
