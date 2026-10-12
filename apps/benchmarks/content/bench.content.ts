import { enu, insert, select, type Dictionary } from "intlayer";

const bench = {
  key: "bench",
  content: {
    lookup: "Hello, world",
    interpolation: insert("Hello, {{name}}!"),
    plural: enu({
      "1": insert("{{count}} item"),
      fallback: insert("{{count}} items"),
    }),
    nested: select({
      female: enu({
        "1": insert("She has {{count}} item"),
        fallback: insert("She has {{count}} items"),
      }),
      male: enu({
        "1": insert("He has {{count}} item"),
        fallback: insert("He has {{count}} items"),
      }),
      fallback: enu({
        "1": insert("They have {{count}} item"),
        fallback: insert("They have {{count}} items"),
      }),
    }),
  },
} satisfies Dictionary;

export default bench;
