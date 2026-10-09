import { DialexProvider } from "dialexjs/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";

import "./index.css";
import { dialex } from "./dialex.generated";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  </StrictMode>,
);
