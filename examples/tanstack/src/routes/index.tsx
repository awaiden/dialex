import { createFileRoute } from "@tanstack/react-router";
import { useDictionary } from "dialexjs/react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const home = useDictionary("home");
  return (
    <>
      <h1>{home.title}</h1>
      <p>{home.intro}</p>
      <section className="card">
        <h2>{home.cardTitle}</h2>
        <p>{home.greeting("Alex")}</p>
        <p>{home.cardBody}</p>
      </section>
    </>
  );
}
