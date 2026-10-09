import { Link } from "@tanstack/react-router";
import { useDialex, useDictionary } from "dialexjs/react";
import { locales } from "../dialex.generated";

const languageName = (code: string) =>
  new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;

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
        {locales.map((code) => (
          <button key={code} disabled={locale === code} onClick={() => setLocale(code)}>
            {languageName(code)}
          </button>
        ))}
      </div>
    </header>
  );
}
