import { Link } from "@tanstack/react-router";
import { useDialex, useDictionary } from "dialexjs/react";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
] as const;

export function Header() {
  const { locale, setLocale } = useDialex();
  const common = useDictionary("common");

  return (
    <header className="header">
      <strong>{common.appName}</strong>
      <nav>
        <Link to="/">{common.nav.home}</Link>
        <Link to="/plurals">{common.nav.plurals}</Link>
      </nav>
      <div className="locales">
        {LOCALES.map(({ code, label }) => (
          <button key={code} disabled={locale === code} onClick={() => setLocale(code)}>
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
