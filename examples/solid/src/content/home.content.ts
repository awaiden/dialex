import { defineDictionary } from "dialexjs";

export default defineDictionary("home", {
  en: {
    title: "One dictionary, every language",
    subtitle: "Typed keys, ICU messages and instant locale switching in Solid.",
    greeting: (name: string) => `Hello, ${name}!`,
    cart: {
      title: "Your cart",
      items:
        "{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}",
    },
    role: "{role, select, admin {You are an administrator} other {You are a member}}",
  },
  tr: {
    title: "Tek sözlük, her dil",
    subtitle: "Solid'de tipli anahtarlar, ICU mesajları ve anında dil değiştirme.",
    greeting: (name: string) => `Merhaba, ${name}!`,
    cart: {
      title: "Sepetiniz",
      items:
        "{count, plural, =0 {Sepetiniz boş} one {Sepetinizde # ürün var} other {Sepetinizde # ürün var}}",
    },
    role: "{role, select, admin {Yöneticisiniz} other {Üyesiniz}}",
  },
});
