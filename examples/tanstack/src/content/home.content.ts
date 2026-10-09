import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "Welcome",
    intro:
      "The language below was picked on the server from your locale cookie or Accept-Language header, so the first paint is already translated.",
    greeting: (name: string) => `Hello, ${name}!`,
    cardTitle: "Type-safe dictionaries",
    cardBody: "Keys and function arguments are checked at compile time.",
  },
  tr: {
    title: "Hoş geldiniz",
    intro:
      "Aşağıdaki dil, sunucuda locale çerezinizden veya Accept-Language başlığınızdan seçildi; bu yüzden ilk görüntü zaten çevrilmiş geliyor.",
    greeting: (name: string) => `Merhaba, ${name}!`,
    cardTitle: "Tip güvenli sözlükler",
    cardBody: "Anahtarlar ve fonksiyon argümanları derleme sırasında denetlenir.",
  },
});
