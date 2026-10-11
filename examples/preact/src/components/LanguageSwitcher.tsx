import { useDialex, useDictionary } from "dialexjs/preact";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();
  const common = useDictionary("common");

  return (
    <label>
      {common.language}
      <select value={locale} onChange={(event) => setLocale(event.currentTarget.value)}>
        {locales.map((code) => (
          <option value={code}>{code.toUpperCase()}</option>
        ))}
      </select>
    </label>
  );
}
