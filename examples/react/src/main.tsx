import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DialexProvider } from "dialexjs/react";
import { dialex } from "./dialex.generated";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DialexProvider {...dialex}>
      <App />
    </DialexProvider>
  </StrictMode>,
);
