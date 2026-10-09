import { ClientCounter } from "../../components/client-counter";
import { getDictionary } from "../../dialex";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary("home", locale as any);

  return (
    <main>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          paddingBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0 }}>{dict.title}</h1>
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <a
            href="/en"
            style={{
              textDecoration: "none",
              fontWeight: locale === "en" ? "bold" : "normal",
              color: locale === "en" ? "#0070f3" : "#666",
            }}
          >
            English
          </a>
          <span>|</span>
          <a
            href="/tr"
            style={{
              textDecoration: "none",
              fontWeight: locale === "tr" ? "bold" : "normal",
              color: locale === "tr" ? "#0070f3" : "#666",
            }}
          >
            Türkçe
          </a>
        </nav>
      </header>

      <p style={{ color: "#555", fontSize: "1.1rem", marginTop: "1.5rem" }}>{dict.description}</p>

      <p
        style={{
          backgroundColor: "#f0f4f8",
          padding: "1rem",
          borderRadius: "6px",
          borderLeft: "4px solid #0070f3",
        }}
      >
        {dict.greeting("Next.js Developer")}
      </p>

      <ClientCounter />
    </main>
  );
}
