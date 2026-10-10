<script lang="ts">
  import { provideDialex, useDictionary, useT } from "dialexjs/svelte";

  import { dialex } from "./dialex.generated";
  import LanguageSwitcher from "./lib/LanguageSwitcher.svelte";

  // Call it once, in the root component: it puts Dialex in Svelte's context.
  provideDialex({ ...dialex });

  const common = useDictionary("common");
  const home = useDictionary("home");
  const t = useT("home");

  let count = $state(2);
</script>

<main>
  <header>
    <strong>{$common.appName}</strong>
    <LanguageSwitcher />
  </header>

  <h1>{$home.title}</h1>
  <p class="muted">{$home.subtitle}</p>
  <p>{$home.greeting("Alex")}</p>

  <section>
    <h2>{$home.cart.title}</h2>
    <p>{$t("home.cart.items", { count })}</p>
    <div class="row">
      <button onclick={() => count++}>{$common.actions.add}</button>
      <button onclick={() => (count = 0)}>{$common.actions.reset}</button>
    </div>
  </section>

  <p>{$t("home.role", { role: "admin" })}</p>

  <footer>{$common.footer}</footer>
</main>
