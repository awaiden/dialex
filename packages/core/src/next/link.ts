"use client";

import * as LinkModule from "next/link.js";
import type { LinkProps } from "next/link.js";
import { useParams } from "next/navigation.js";
import { createElement, type AnchorHTMLAttributes, type ComponentType } from "react";
// @ts-ignore
import config from "virtual:dialex-config";
import { localizePath } from "../routing.js";

// Under Node-style ESM interop `next/link.js` exposes the component as `default` or `default.default`;
// bundlers unwrap it. Accept both so the component works either way.
const Link: ComponentType<any> =
  (LinkModule as any).default?.default ?? (LinkModule as any).default ?? LinkModule;

export interface I18nLinkProps
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
 * <I18nLink href="/about">About</I18nLink>            // -> /tr/about when viewing /tr/...
 * <I18nLink href="/about" locale="en">English</I18nLink>
 * ```
 *
 * Uses `locales`, `defaultLocale`, and `prefixDefault` from `dialex.config.ts`.
 */
export function I18nLink({ href, locale, ...rest }: I18nLinkProps) {
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

export default I18nLink;
