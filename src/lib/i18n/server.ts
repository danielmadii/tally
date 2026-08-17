import { cookies } from "next/headers";
import { LOCALES, LOCALE_COOKIE, type Locale, translate } from "./dictionary";

/** The reader's language, from their cookie; English until they choose. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : "en";
}

export async function getTranslator() {
  const locale = await getLocale();
  return { locale, t: (key: Parameters<typeof translate>[1]) => translate(locale, key) };
}
