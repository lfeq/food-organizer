import { createServerFn } from "@tanstack/react-start"
import { getCookie, setCookie } from "@tanstack/react-start/server"
import type { Locale } from "#/i18n"

const LOCALE_COOKIE = "locale"
// §12.2: Spanish is the hard-coded default; Accept-Language is deliberately ignored.
const DEFAULT_LOCALE: Locale = "es"

export const getLocale = createServerFn({ method: "GET" }).handler((): Locale => {
  const v = getCookie(LOCALE_COOKIE)
  return v === "en" ? "en" : DEFAULT_LOCALE
})

export const setLocale = createServerFn({ method: "POST" })
  .validator((data: { locale: Locale }) => data)
  .handler(({ data }) => {
    const safe: Locale = data.locale === "en" ? "en" : "es"
    setCookie(LOCALE_COOKIE, safe, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 10,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })
  })
