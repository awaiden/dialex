import { useDictionary, useT } from "dialexjs/preact";
import { useState } from "preact/hooks";

import { LanguageSwitcher } from "./components/LanguageSwitcher";

export function App() {
  const common = useDictionary("common");
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <main>
      <header>
        <strong>{common.appName}</strong>
        <LanguageSwitcher />
      </header>

      <h1>{home.title}</h1>
      <p class="muted">{home.subtitle}</p>
      <p>{home.greeting("Alex")}</p>

      <section>
        <h2>{home.cart.title}</h2>
        <p>{t("home.cart.items", { count })}</p>
        <div class="row">
          <button onClick={() => setCount((n) => n + 1)}>{common.actions.add}</button>
          <button onClick={() => setCount(0)}>{common.actions.reset}</button>
        </div>
      </section>

      <p>{t("home.role", { role: "admin" })}</p>

      <footer>{common.footer}</footer>
    </main>
  );
}
