<script lang="ts">
  import { useDialex, useDictionary } from "dialexjs/svelte";

  import { locales } from "../dialex.generated";

  const { locale, setLocale } = useDialex();
  const common = useDictionary("common");
</script>

<label>
  {$common.language}
  <select value={$locale} onchange={(event) => setLocale(event.currentTarget.value)}>
    {#each locales as code (code)}
      <option value={code}>{code.toUpperCase()}</option>
    {/each}
  </select>
</label>
