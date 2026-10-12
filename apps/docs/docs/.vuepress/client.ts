import { defineClientConfig } from "vuepress/client";

import BenchmarkChart from "./components/BenchmarkChart.vue";

export default defineClientConfig({
  enhance({ app }) {
    app.component("BenchmarkChart", BenchmarkChart);
  },
});
