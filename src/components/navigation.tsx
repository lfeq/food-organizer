import { Link, useRouteContext, useRouter } from "@tanstack/react-router"
import { useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t, type StringKey } from "#/i18n"

/** Which navigation destination the current screen is. */
export type NavigationItem = "thisWeek" | "nextWeek" | "dishes" | "history" | "accounts"

type NavigationEntry = {
  item: NavigationItem
  to: "/" | "/plan/next" | "/dishes" | "/history" | "/accounts"
  labelKey: StringKey
  adminOnly?: true
}

const ENTRIES: readonly NavigationEntry[] = [
  { item: "thisWeek", to: "/", labelKey: "thisWeek" },
  { item: "nextWeek", to: "/plan/next", labelKey: "nextWeek" },
  { item: "dishes", to: "/dishes", labelKey: "dishes" },
  { item: "history", to: "/history", labelKey: "history" },
  { item: "accounts", to: "/accounts", labelKey: "accounts", adminOnly: true },
]

export type NavigationProps = {
  /** The entry to highlight, or omitted when no entry matches the screen. */
  active?: NavigationItem
}

/**
 * The application navigation: brand, destinations, signed-in member, locale
 * toggle and sign out. Rendered by every screen behind the session.
 */
export function Navigation({ active }: NavigationProps) {
  const { authState, displayName } = useRouteContext({ from: "__root__" })
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const member = authState.member!

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSetLocale(next: "en" | "es") {
    await setLocale({ data: { locale: next } })
    await router.invalidate()
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-top">
        <span className="sidebar-brand">{displayName ?? "Food Organizer"}</span>
      </div>
      <ul className="sidebar-nav">
        {ENTRIES.filter((entry) => !entry.adminOnly || member.role === "admin").map((entry) => (
          <li
            key={entry.item}
            className={`sidebar-nav-item${entry.item === active ? " sidebar-nav-item--active" : ""}`}
          >
            <Link to={entry.to} className="sidebar-nav-link">{t(locale, entry.labelKey)}</Link>
          </li>
        ))}
      </ul>
      <div className="sidebar-bottom">
        <div className="sidebar-user-row">
          <span className="sidebar-member">{member.username}</span>
          <div className="sidebar-locale">
            <button
              className={`locale-btn${locale === "en" ? " locale-btn--active" : ""}`}
              onClick={() => void handleSetLocale("en")}
            >EN</button>
            <span className="locale-sep">/</span>
            <button
              className={`locale-btn${locale === "es" ? " locale-btn--active" : ""}`}
              onClick={() => void handleSetLocale("es")}
            >ES</button>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          {t(locale, "signOut")}
        </button>
      </div>
    </nav>
  )
}
