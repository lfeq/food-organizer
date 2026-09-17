import { Link, useRouteContext, useRouter, useRouterState } from "@tanstack/react-router"
import { useContext, useEffect, useState } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t, type Locale, type StringKey } from "#/i18n"

/**
 * Which navigation destination the current screen is.
 *
 * `nextWeek` is deliberately absent: the app writes to exactly two weeks, so
 * stepping between them is a view change on the week screen rather than a
 * destination (SPEC.md §11.1, visual-system.md → "Navigation across the
 * breakpoint"). The `/plan/next` route still exists; it is not navigation.
 */
export type NavigationItem = "thisWeek" | "dishes" | "history" | "accounts" | "settings"

/** Every destination the navigation can reach, at either width. */
type Destination = "/" | "/dishes" | "/history" | "/accounts" | "/settings"

type NavigationEntry = {
  item: NavigationItem
  to: Destination
  /** The sidebar's label. The tab bar labels its four cells itself. */
  labelKey: StringKey
  /** The path prefix that lights this entry, when it is not `to`. */
  matches?: string
  adminOnly?: true
}

/**
 * The destination set, in sidebar order. Both forms read this one array, which
 * is what keeps the sets identical across the breakpoint: the sidebar lists it
 * whole, the tab bar puts its two `adminOnly` entries in the `More` sheet.
 * Another admin-only screen is one row here and lengthens the sheet only.
 */
const ENTRIES: readonly NavigationEntry[] = [
  { item: "thisWeek", to: "/", labelKey: "thisWeek", matches: "/plan" },
  { item: "dishes", to: "/dishes", labelKey: "dishes" },
  { item: "history", to: "/history", labelKey: "history" },
  { item: "accounts", to: "/accounts", labelKey: "accounts", adminOnly: true },
  { item: "settings", to: "/settings", labelKey: "settings", adminOnly: true },
]

/** The three cells of the tab bar that are destinations. `More` is the fourth. */
const TAB_CELLS: readonly { item: NavigationItem; to: Destination; labelKey: StringKey }[] = [
  { item: "thisWeek", to: "/", labelKey: "navPlan" },
  { item: "dishes", to: "/dishes", labelKey: "dishes" },
  { item: "history", to: "/history", labelKey: "history" },
]

/** The entries the `More` sheet holds — the ones the tab bar has no cell for. */
const SHEET_ENTRIES = ENTRIES.filter((entry) => entry.adminOnly)

function isUnder(pathname: string, base: string): boolean {
  if (base === "/") return pathname === "/"
  return pathname === base || pathname.startsWith(`${base}/`)
}

/**
 * The active entry, read from the URL rather than from the route that got
 * there: a past week opened from history is still `/plan/…`, so it still
 * lights `Plan`. Provenance-based highlighting would draw the same URL with
 * two different bars.
 */
export function activeItemFor(pathname: string): NavigationItem | undefined {
  for (const entry of ENTRIES) {
    if (isUnder(pathname, entry.to)) return entry.item
    if (entry.matches && isUnder(pathname, entry.matches)) return entry.item
  }
  return undefined
}

/**
 * The application navigation: one component, two forms.
 *
 * Below `900px` a four-cell bottom tab bar plus the `More` sheet; at or above
 * it the persistent left sidebar. Which form is drawn is decided in
 * `navigation.css` by the one permitted media query — this file renders both
 * and lets the stylesheet choose, so there is no JS-measured breakpoint and no
 * hydration mismatch.
 *
 * It takes no props. The active entry follows the URL; the signed-in member,
 * the instance name and the locale come from context.
 */
export function Navigation() {
  const { authState, displayName } = useRouteContext({ from: "__root__" })
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [sheetOpen, setSheetOpen] = useState(false)
  const locale = useContext(LocaleContext)
  const member = authState.member!
  const isAdmin = member.role === "admin"
  const active = activeItemFor(pathname)
  const visible = ENTRIES.filter((entry) => !entry.adminOnly || isAdmin)
  const sheetEntries = isAdmin ? SHEET_ENTRIES : []

  // A sheet is dismissible from the keyboard as well as from `Close` and the
  // scrim. Nothing here animates; the listener only exists while it is open.
  useEffect(() => {
    if (!sheetOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [sheetOpen])

  return (
    <nav className="navigation">
      <div className="navigation-sidebar">
        <div className="navigation-brand">
          <span className="navigation-brand-name">{t(locale, "brand")}</span>
          {displayName ? (
            <span className="navigation-brand-instance type-meta">{displayName}</span>
          ) : null}
        </div>

        <ul className="navigation-list">
          {visible.map((entry) => (
            <li key={entry.item} className="navigation-list-item">
              <Link
                to={entry.to}
                className={`navigation-item${entry.item === active ? " navigation-item--active" : ""}`}
                aria-current={entry.item === active ? "page" : undefined}
              >
                {t(locale, entry.labelKey)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="navigation-footer">
          <SessionBlock on="inverse" locale={locale} username={member.username} role={member.role} />
        </div>
      </div>

      <div className="navigation-bar">
        {TAB_CELLS.map((cell) => (
          <Link
            key={cell.item}
            to={cell.to}
            className={`navigation-cell type-tab${cell.item === active ? " navigation-cell--active" : ""}`}
            aria-current={cell.item === active ? "page" : undefined}
          >
            {t(locale, cell.labelKey)}
          </Link>
        ))}
        <button
          type="button"
          className={`navigation-cell type-tab${sheetOpen || active === "accounts" || active === "settings" ? " navigation-cell--active" : ""}`}
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          {t(locale, "navMore")}
        </button>
      </div>

      {sheetOpen ? (
        <>
          <div className="navigation-scrim" aria-hidden="true" onClick={() => setSheetOpen(false)} />
          <div className="navigation-sheet" role="dialog" aria-modal="true" aria-label={t(locale, "navMore")}>
            <div className="navigation-sheet-header">
              <span className="navigation-sheet-title type-title-sheet">{t(locale, "navMore")}</span>
              <button
                type="button"
                className="navigation-sheet-dismiss type-meta"
                onClick={() => setSheetOpen(false)}
              >
                {t(locale, "closeBtn")}
              </button>
            </div>

            {sheetEntries.length > 0 ? (
              <>
                <ul className="navigation-sheet-list">
                  {sheetEntries.map((entry) => (
                    <li key={entry.item}>
                      <Link
                        to={entry.to}
                        className="navigation-sheet-link"
                        onClick={() => setSheetOpen(false)}
                      >
                        {t(locale, entry.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <hr className="navigation-sheet-rule" />
              </>
            ) : null}

            <SessionBlock on="surface" locale={locale} username={member.username} role={member.role} />
          </div>
        </>
      ) : null}
    </nav>
  )
}

/**
 * The signed-in member, the `EN / ES` toggle and `Sign out` — the block both
 * forms carry, so the session is reachable at either width. Its variant says
 * which ground it sits on, because that is what decides its ink and its focus
 * ring: the dark sidebar's ring is white (accent measures 2.77:1 there).
 */
function SessionBlock({
  on,
  locale,
  username,
  role,
}: {
  on: "inverse" | "surface"
  locale: Locale
  username: string
  role: "admin" | "member"
}) {
  const router = useRouter()

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSetLocale(next: Locale) {
    await setLocale({ data: { locale: next } })
    await router.invalidate()
  }

  return (
    <div className={`navigation-session navigation-session--${on}`}>
      <span className="navigation-session-member type-note">
        {username} · {t(locale, role === "admin" ? "accountsRoleAdmin" : "accountsRoleMember")}
      </span>
      <div className="navigation-locale">
        <button
          type="button"
          className={`navigation-locale-btn${locale === "en" ? " navigation-locale-btn--active" : ""}`}
          onClick={() => void handleSetLocale("en")}
        >
          {t(locale, "localeEn")}
        </button>
        <span className="navigation-locale-sep" aria-hidden="true">/</span>
        <button
          type="button"
          className={`navigation-locale-btn${locale === "es" ? " navigation-locale-btn--active" : ""}`}
          onClick={() => void handleSetLocale("es")}
        >
          {t(locale, "localeEs")}
        </button>
      </div>
      <button type="button" className="navigation-signout" onClick={handleLogout}>
        {t(locale, "signOut")}
      </button>
    </div>
  )
}
