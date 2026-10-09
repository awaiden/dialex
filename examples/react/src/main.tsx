import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DialexProvider } from "dialexjs/react";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DialexProvider>
      <App />
    </DialexProvider>
  </StrictMode>,
);
