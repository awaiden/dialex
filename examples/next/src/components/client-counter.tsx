"use client";

import { useState } from "react";
import { useDictionary } from "dialexjs/react";

export function ClientCounter() {
  const [count, setCount] = useState(0);
  const dict = useDictionary("home");

  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h3>{dict.counter}</h3>
      <p>Count: {count}</p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{ padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
      >
        {dict.increment}
      </button>
    </div>
  );
}
