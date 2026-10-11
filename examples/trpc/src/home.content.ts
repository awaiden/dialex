import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome to tRPC with Dialex!",
    description: "Type-safe procedures that answer in the caller's language.",
    greeting: (name: string) => `Hello, ${name}!`,
  },
  tr: {
    title: "Dialex ile tRPC'ye Hoş Geldiniz!",
    description: "Çağıranın dilinde yanıt veren tip güvenli prosedürler.",
    greeting: (name: string) => `Merhaba, ${name}!`,
  },
});
