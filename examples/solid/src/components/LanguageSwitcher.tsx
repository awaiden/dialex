import { useDialex, useDictionary } from "dialexjs/solid";
import { For } from "solid-js";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();
  const common = useDictionary("common");

  return (
    <label>
      {common().language}
      <select value={locale()} onChange={(event) => setLocale(event.currentTarget.value)}>
        <For each={locales}>{(code) => <option value={code}>{code.toUpperCase()}</option>}</For>
      </select>
    </label>
  );
}
