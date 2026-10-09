import { createFileRoute } from "@tanstack/react-router";
import { useDictionary, useT } from "dialexjs/react";
import { useState } from "react";

export const Route = createFileRoute("/plurals")({ component: Plurals });

function Plurals() {
  const [count, setCount] = useState(1);
  const plurals = useDictionary("plurals");
  const t = useT("plurals");

  return (
    <>
      <h1>{plurals.title}</h1>
      <section className="card">
        <p>{t("plurals.items", { count })}</p>
        <p>{t("plurals.place", { n: count })}</p>
        <div className="locales">
          <button onClick={() => setCount((c) => c + 1)}>{plurals.more}</button>
          <button onClick={() => setCount((c) => Math.max(0, c - 1))}>{plurals.less}</button>
        </div>
      </section>
    </>
  );
}
