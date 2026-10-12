import { setupI18n } from "@lingui/core";
// One adapter per library. Every adapter exposes the same four cases and returns a string, so the
// runner can check that all of them produce the same output before it times anything.
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { createT } from "dialexjs";
import { formatMessage } from "dialexjs/icu";
import i18next from "i18next";
import { IntlMessageFormat } from "intl-messageformat";
import { getIntlayer } from "intlayer";

import * as paraglide from "../paraglide/generated/messages.js";

export const MESSAGES = {
  lookup: "Hello, world",
  interpolation: "Hello, {name}!",
  plural: "{count, plural, =0 {No items} one {# item} other {# items}}",
  nested:
    "{gender, select, female {{count, plural, one {She has # item} other {She has # items}}} male {{count, plural, one {He has # item} other {He has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}",
};

/** Values for each call. `plural` alternates 1 and 5 so both branches are exercised. */
export const VALUES = {
  lookup: () => undefined,
  interpolation: () => ({ name: "Alex" }),
  plural: (i) => ({ count: i % 2 === 0 ? 1 : 5 }),
  nested: (i) => ({
    gender: i % 3 === 0 ? "female" : i % 3 === 1 ? "male" : "other",
    count: (i % 4) + 1,
  }),
};

export const libraries = [];

// dialexjs: `t("dictionary.path", values)`, which formats ICU strings with a cached parse
{
  const dictionary = Object.fromEntries(Object.entries(MESSAGES).map(([k, v]) => [k, v]));
  const t = createT((name) => (name === "bench" ? dictionary : undefined), "en");
  libraries.push({
    name: "dialexjs",
    version: "workspace",
    run: {
      lookup: () => t("bench.lookup"),
      interpolation: (v) => t("bench.interpolation", v),
      plural: (v) => t("bench.plural", v),
      nested: (v) => t("bench.nested", v),
    },
  });
}

// dialexjs, function messages: the typed alternative to ICU strings, compiled by TypeScript
{
  const dictionary = {
    lookup: "Hello, world",
    interpolation: ({ name }) => `Hello, ${name}!`,
    plural: ({ count }) => (count === 0 ? "No items" : count === 1 ? "1 item" : `${count} items`),
    nested: ({ gender, count }) => {
      const subject = gender === "female" ? "She has" : gender === "male" ? "He has" : "They have";
      return `${subject} ${count} ${count === 1 ? "item" : "items"}`;
    },
  };
  const t = createT((name) => (name === "bench" ? dictionary : undefined), "en");
  libraries.push({
    name: "dialexjs (function messages)",
    run: {
      lookup: () => t("bench.lookup"),
      interpolation: (v) => t("bench.interpolation", v),
      plural: (v) => t("bench.plural", v),
      nested: (v) => t("bench.nested", v),
    },
  });
}

// dialexjs/icu used directly, as `formatMessage(locale, message, values)`
libraries.push({
  name: "dialexjs formatMessage",
  run: Object.fromEntries(
    Object.entries(MESSAGES).map(([key, message]) => [
      key,
      (v) => formatMessage("en", message, v ?? {}),
    ]),
  ),
});

// i18next: native interpolation and plural keys. It has no inline select, so `nested` is skipped.
{
  const instance = i18next.createInstance();
  await instance.init({
    lng: "en",
    resources: {
      en: {
        translation: {
          lookup: "Hello, world",
          interpolation: "Hello, {{name}}!",
          plural_one: "{{count}} item",
          plural_other: "{{count}} items",
          plural_zero: "No items",
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  libraries.push({
    name: "i18next",
    run: {
      lookup: () => instance.t("lookup"),
      interpolation: (v) => instance.t("interpolation", v),
      plural: (v) => instance.t("plural", v),
      nested: null,
    },
  });
}

// intl-messageformat (FormatJS), with the formatter created once per message and reused
{
  const formats = Object.fromEntries(
    Object.entries(MESSAGES).map(([key, message]) => [key, new IntlMessageFormat(message, "en")]),
  );
  libraries.push({
    name: "intl-messageformat",
    run: Object.fromEntries(
      Object.keys(MESSAGES).map((key) => [key, (v) => String(formats[key].format(v))]),
    ),
  });
}

// intl-messageformat, creating the formatter on every call (what happens without a cache)
libraries.push({
  name: "intl-messageformat (no cache)",
  run: Object.fromEntries(
    Object.entries(MESSAGES).map(([key, message]) => [
      key,
      (v) => String(new IntlMessageFormat(message, "en").format(v)),
    ]),
  ),
});

// @lingui/core with messages compiled ahead of time, as `lingui compile` does
{
  const i18n = setupI18n();
  i18n.load(
    "en",
    Object.fromEntries(Object.entries(MESSAGES).map(([k, m]) => [k, compileMessage(m)])),
  );
  i18n.activate("en");
  libraries.push({
    name: "@lingui/core",
    run: Object.fromEntries(Object.keys(MESSAGES).map((key) => [key, (v) => i18n._(key, v)])),
  });
}

// Paraglide JS: messages compiled to functions (`m.plural({ count })`) by `paraglide-js compile`
libraries.push({
  name: "Paraglide JS",
  run: {
    lookup: () => paraglide.lookup({}),
    interpolation: (v) => paraglide.interpolation(v),
    plural: (v) => paraglide.plural(v),
    nested: (v) => paraglide.nested(v),
  },
});

// Intlayer: content declared in `.content.ts` and built by `intlayer build`. The dictionary is read
// once, as a component does with `useIntlayer`; plural and select nodes are called with the value.
{
  const content = getIntlayer("bench", "en");
  libraries.push({
    name: "Intlayer",
    run: {
      lookup: () => String(content.lookup),
      interpolation: (v) => String(content.interpolation(v)),
      plural: (v) => String(content.plural(v.count)(v)),
      nested: (v) => String(content.nested(v.gender)(v.count)(v)),
    },
  });
  // The same, reading the dictionary on every call
  libraries.push({
    name: "Intlayer (getIntlayer per call)",
    run: {
      lookup: () => String(getIntlayer("bench", "en").lookup),
      interpolation: (v) => String(getIntlayer("bench", "en").interpolation(v)),
      plural: (v) => String(getIntlayer("bench", "en").plural(v.count)(v)),
      nested: (v) => String(getIntlayer("bench", "en").nested(v.gender)(v.count)(v)),
    },
  });
}
