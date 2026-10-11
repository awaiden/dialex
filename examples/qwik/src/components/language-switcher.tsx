import { component$ } from "@builder.io/qwik";

import { locales } from "../dialex.generated";
import { setLocale, useDialex, useDictionary } from "../i18n";

export const LanguageSwitcher = component$(() => {
  const dialex = useDialex();
  const common = useDictionary("common");

  return (
    <label>
      {common().language}
      <select value={dialex.locale} onChange$={(_, element) => setLocale(dialex, element.value)}>
        {locales.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
});
