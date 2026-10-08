import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Next.js App Router i18n",
    description: "Seamless localization with React Server Components & Client Components.",
    greeting: (name: string) => `Hello, ${name}! Welcome to Next.js.`,
    counter: "Client Component Counter",
    increment: "Increment",
  },
  tr: {
    title: "Next.js App Router i18n'e Hoş Geldiniz",
    description: "React Sunucu Bileşenleri ve İstemci Bileşenleri ile sorunsuz yerelleştirme.",
    greeting: (name: string) => `Merhaba, ${name}! Next.js'e hoş geldiniz.`,
    counter: "İstemci Bileşeni Sayacı",
    increment: "Arttır",
  },
});
