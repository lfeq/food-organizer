import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { getAuthState } from "#/auth-fns"
import { getLocale } from "#/locale-fns"
import { getInstanceSettings } from "#/accounts-fns"
import { LocaleContext } from "#/i18n"
import designSystemCss from "../styles/index.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Food Organizer" },
    ],
    links: [
      // The variable Sans and Mono 600. Preloading Sans alone would ship a
      // first visit with Plex dish names beside system-mono labels — the
      // Sans/Mono split rule half-applied. See visual-system.md,
      // "Loading the fonts".
      {
        rel: "preload",
        href: "/fonts/ibm-plex-sans-latin-wght-normal.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/ibm-plex-mono-latin-600-normal.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      // The one stylesheet: src/styles/index.css is an @import manifest that
      // Vite inlines into a single emitted asset. See css-structure.md.
      { rel: "stylesheet", href: designSystemCss },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const [authState, locale, settings] = await Promise.all([
      getAuthState(),
      getLocale(),
      getInstanceSettings(),
    ])
    const path = location.pathname

    if (authState.setupNeeded && path !== "/setup") {
      throw redirect({ to: "/setup" })
    }
    if (!authState.setupNeeded && !authState.member) {
      if (path !== "/login") throw redirect({ to: "/login" })
    }
    if (authState.member && (path === "/setup" || path === "/login")) {
      throw redirect({ to: "/" })
    }
    if (
      authState.member?.must_change_password &&
      path !== "/change-password"
    ) {
      throw redirect({ to: "/change-password" })
    }

    return { authState, locale, displayName: settings.display_name }
  },
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const { locale } = Route.useRouteContext()
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return (
    <LocaleContext.Provider value={locale}>
      <Outlet />
    </LocaleContext.Provider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
