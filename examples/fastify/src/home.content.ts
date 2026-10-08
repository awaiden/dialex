import { defineDictionary } from "dialex";

export default defineDictionary("home", {
  en: {
    title: "Welcome to Fastify with Dialex!",
    description: "Blazing fast internationalized Node.js API with zero-overhead routing.",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex ile Fastify'a Hoş Geldiniz!",
    description: "Sıfır ek yük getiren yönlendirmeli, ışık hızında yerelleştirilmiş Node.js API.",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
