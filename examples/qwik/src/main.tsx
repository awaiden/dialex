import { render } from "@builder.io/qwik";
// The Qwik loader runs event handlers. @builder.io/qwik is marked side-effect free, so a plain
// side-effect import is dropped from the build; the source is added to the page explicitly.
import qwikloader from "@builder.io/qwik/qwikloader.js?raw";

import { Root } from "./root";

import "./index.css";

const loader = document.createElement("script");
loader.textContent = qwikloader;
document.head.append(loader);

// The promise is used on purpose: a bare `void render(...)` is dropped by the production build,
// because @builder.io/qwik is marked side-effect free.
render(document.getElementById("app") as HTMLElement, <Root />).catch((error) => {
  console.error("[dialex] Could not render the app.", error);
});
