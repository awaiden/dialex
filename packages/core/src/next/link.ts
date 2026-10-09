"use client";

import * as LinkModule from "next/link.js";
import type { LinkProps } from "next/link.js";
import { useParams } from "next/navigation.js";
import { createElement, type AnchorHTMLAttributes, type ComponentType } from "react";

import { useDialexConfig } from "../react.js";
import { localizePath } from "../routing.js";

// Under Node-style ESM interop `next/link.js` exposes the component as `default` or `default.default`;
// bundlers unwrap it. Accept both so the component works either way.
const Link: ComponentType<any> =
  (LinkModule as any).default?.default ?? (LinkModule as any).default ?? LinkModule;

export interface DialexLinkProps
  extends
    Omit<LinkProps<any>, "locale" | "href">,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps<any>> {
  href: LinkProps<any>["href"];
  /** Locale to link to. Defaults to the `[locale]` route param, then the default locale. */
  locale?: string;
}

/**
 * `next/link` that keeps the current locale in the URL.
 *
 * ```tsx
 * <DialexLink href="/about">About</DialexLink>            // -> /tr/about when viewing /tr/...
 * <DialexLink href="/about" locale="en">English</DialexLink>
 * ```
 *
 * Reads `locales`, `defaultLocale`, and `prefixDefault` from the generated config, so it must be
 * rendered inside a `<DialexProvider {...dialex}>`.
 */
export function DialexLink({ href, locale, ...rest }: DialexLinkProps) {
  const config = useDialexConfig();
  const params = useParams<{ locale?: string }>();
  const target =
    locale ??
    (typeof params?.locale === "string" ? params.locale : undefined) ??
    config.defaultLocale ??
    "en";

  const routing = {
    locales: config.locales ?? [],
    defaultLocale: config.defaultLocale,
    prefixDefault: config.prefixDefault ?? true,
  };

  const localized =
    typeof href === "string"
      ? localizePath(href, target, routing)
      : {
          ...href,
          pathname: href.pathname ? localizePath(href.pathname, target, routing) : href.pathname,
        };

  return createElement(Link, { ...rest, href: localized });
}

export default DialexLink;
