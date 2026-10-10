import { useDialex, useDictionary } from "dialexjs/react";
import { useRevalidator } from "react-router";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();
  const common = useDictionary("common");
  const { revalidate } = useRevalidator();

  return (
    <label className="flex items-center gap-2 text-sm">
      {common.language}
      <select
        className="rounded border px-2 py-1"
        value={locale}
        onChange={(event) => {
          setLocale(event.target.value);
          // The provider wrote the `locale` cookie; reload the root loader so `<html lang>` follows.
          void revalidate();
        }}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
