import { useDictionary } from "dialexjs/react";
import { useState } from "react";

export default function HomePage() {
  // Load multiple dictionaries
  const tHome = useDictionary("home");
  const tCommon = useDictionary("common");

  const [notifications, setNotifications] = useState(3);

  return (
    <div
      style={{
        padding: "2rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        background: "#f9f9f9",
      }}
    >
      <h1>{tHome.title}</h1>
      <p style={{ color: "#666" }}>{tHome.subtitle}</p>

      <div style={{ margin: "2rem 0", padding: "1rem", background: "white", borderRadius: "6px" }}>
        <h2>{tHome.greeting("Alex")}</h2>
        <p>{tHome.stats(notifications)}</p>

        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setNotifications((n) => n + 1)}>+1</button>
          <button onClick={() => setNotifications(0)}>Clear</button>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: "1rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}
      >
        <button
          style={{
            background: "#4caf50",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {tCommon.actions.save}
        </button>
        <button
          style={{
            background: "#f44336",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {tCommon.actions.delete}
        </button>
        <button
          style={{
            background: "transparent",
            border: "1px solid #ccc",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {tCommon.actions.cancel}
        </button>
      </div>
    </div>
  );
}
