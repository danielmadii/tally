"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  translate,
  type Locale,
  type TranslationKey,
} from "./dictionary";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** t() plus the active locale, for client components. */
export function useT() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    isRtl: locale === "ar",
    t: (key: TranslationKey) => translate(locale, key),
  };
}

/** Switching language is a cookie write plus a refresh — no page reload. */
export function useSetLocale() {
  const router = useRouter();
  return (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  };
}
