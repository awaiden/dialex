/* @refresh reload */
import { DialexProvider } from "dialexjs/solid";
import { render } from "solid-js/web";

import App from "./App.tsx";
import { dialex } from "./dialex.generated";

import "./index.css";

render(
  () => (
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  ),
  document.getElementById("root")!,
);
