<script setup lang="ts">
import { useDialex, useDictionary, useT } from "dialexjs/vue";
import { ref } from "vue";

import { locales } from "./dialex.generated";

const { locale, setLocale } = useDialex();
const common = useDictionary("common");
const home = useDictionary("home");
const t = useT("home");

const count = ref(2);
</script>

<template>
  <main>
    <header>
      <strong>{{ common.appName }}</strong>
      <label>
        {{ common.language }}
        <select :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value)">
          <option v-for="code in locales" :key="code" :value="code">
            {{ code.toUpperCase() }}
          </option>
        </select>
      </label>
    </header>

    <h1>{{ home.title }}</h1>
    <p class="muted">{{ home.subtitle }}</p>
    <p>{{ home.greeting("Alex") }}</p>

    <section>
      <h2>{{ home.cart.title }}</h2>
      <p>{{ t("home.cart.items", { count }) }}</p>
      <div class="row">
        <button @click="count++">{{ common.actions.add }}</button>
        <button @click="count = 0">{{ common.actions.reset }}</button>
      </div>
    </section>

    <p>{{ t("home.role", { role: "admin" }) }}</p>

    <footer>{{ common.footer }}</footer>
  </main>
</template>
