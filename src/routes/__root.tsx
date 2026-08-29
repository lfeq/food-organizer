import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router"
import { getAuthState } from "#/auth-fns"
import { getLocale } from "#/locale-fns"
import { LocaleContext } from "#/i18n"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Food Organizer" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async ({ location }) => {
    const [authState, locale] = await Promise.all([getAuthState(), getLocale()])
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

    return { authState, locale }
  },
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  const { locale } = Route.useRouteContext()
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
