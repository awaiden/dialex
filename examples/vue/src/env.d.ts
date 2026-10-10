/// <reference types="vite/client" />

// Lets TypeScript tools that do not understand .vue files (the repository's type check) import them.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
