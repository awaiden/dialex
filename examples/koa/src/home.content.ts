import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Koa with Dialex!",
    description: "Lightweight, expressive middleware cascading internationalization.",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex ile Koa'ya Hoş Geldiniz!",
    description: "Hafif, etkileyici ara katman kademeli uluslararasılaştırma.",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
