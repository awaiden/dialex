import { defineDictionary } from "dialexjs";

export default defineDictionary("plurals", {
  en: {
    title: "ICU messages",
    items: "{count, plural, =0 {No items} one {# item} other {# items}}",
    place: "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place",
    more: "More",
    less: "Fewer",
  },
  tr: {
    title: "ICU mesajları",
    items: "{count, plural, =0 {Öğe yok} one {# öğe} other {# öğe}}",
    place: "{n, selectordinal, other {#.}} sıra",
    more: "Artır",
    less: "Azalt",
  },
});
