import { useDictionary, useT } from "dialexjs/react";
import { useState } from "react";
import { Link } from "react-router";

export default function Cart() {
  const home = useDictionary("home");
  const common = useDictionary("common");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <>
      <h1 className="text-2xl font-bold">{home.cart.title}</h1>
      <p className="mt-4">{t("home.cart.items", { count })}</p>
      <div className="mt-4 flex gap-2">
        <button className="rounded border px-3 py-1" onClick={() => setCount((n) => n + 1)}>
          {common.actions.add}
        </button>
        <button className="rounded border px-3 py-1" onClick={() => setCount(0)}>
          {common.actions.reset}
        </button>
      </div>
      <Link className="mt-6 inline-block underline" to="/">
        {home.title}
      </Link>
    </>
  );
}
