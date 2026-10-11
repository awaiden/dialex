import { component$, useSignal } from "@builder.io/qwik";

import { LanguageSwitcher } from "./components/language-switcher";
import { getPersistedLocale, useDialexProvider, useDictionary, useT } from "./i18n";

export const Root = component$(() => {
  useDialexProvider({ initialLocale: getPersistedLocale() });

  const common = useDictionary("common");
  const home = useDictionary("home");
  const t = useT();
  const count = useSignal(2);

  return (
    <main>
      <header>
        <strong>{common().appName}</strong>
        <LanguageSwitcher />
      </header>

      <h1>{home().title}</h1>
      <p class="muted">{home().subtitle}</p>
      <p>{home().greeting("Alex")}</p>

      <section>
        <h2>{home().cart.title}</h2>
        <p>{t("home.cart.items", { count: count.value })}</p>
        <div class="row">
          <button onClick$={() => count.value++}>{common().actions.add}</button>
          <button onClick$={() => (count.value = 0)}>{common().actions.reset}</button>
        </div>
      </section>

      <p>{t("home.role", { role: "admin" })}</p>

      <footer>{common().footer}</footer>
    </main>
  );
});
