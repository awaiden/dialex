import { useI18n, useDictionary } from "dialex/react";
import HomePage from "./pages/home/page";

function App() {
  const { locale, setLocale } = useI18n();
  const tCommon = useDictionary("common");

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
      <header
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>i18n Demo</strong>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setLocale("en")}
            disabled={locale === "en"}
            style={{ fontWeight: locale === "en" ? "bold" : "normal" }}
          >
            English
          </button>
          <button
            onClick={() => setLocale("tr")}
            disabled={locale === "tr"}
            style={{ fontWeight: locale === "tr" ? "bold" : "normal" }}
          >
            Türkçe
          </button>
        </div>
      </header>

      <main>
        <HomePage />
      </main>

      <footer style={{ marginTop: "3rem", textAlign: "center", color: "#888", fontSize: "0.9rem" }}>
        {tCommon.footer}
      </footer>
    </div>
  );
}

export default App;
