import { createDialex } from "dialexjs/vue";
import { createApp } from "vue";

import App from "./App.vue";
import { dialex } from "./dialex.generated";

import "./style.css";

createApp(App)
  .use(createDialex({ ...dialex }))
  .mount("#app");
