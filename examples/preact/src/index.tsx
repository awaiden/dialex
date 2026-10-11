import { DialexProvider } from "dialexjs/preact";
import { render } from "preact";

import { App } from "./App.tsx";
import { dialex } from "./dialex.generated";

import "./index.css";

render(
  <DialexProvider {...dialex}>
    <App />
  </DialexProvider>,
  document.getElementById("app")!,
);
