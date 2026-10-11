import { render } from "@builder.io/qwik";
// The Qwik loader runs event handlers. @builder.io/qwik is marked side-effect free, so a plain
// side-effect import is dropped from the build; the source is added to the page explicitly.
import qwikloader from "@builder.io/qwik/qwikloader.js?raw";

import { Root } from "./root";

import "./index.css";

const loader = document.createElement("script");
loader.textContent = qwikloader;
document.head.append(loader);

void render(document.getElementById("app") as HTMLElement, <Root />);
