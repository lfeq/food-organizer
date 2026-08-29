import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t } from "#/i18n"
import { listPastWeeks, getPlanSettings } from "#/plan-fns"

function computeCurrentWeekStart(dow: number, refDate: Date): Date {
  const d = new Date(refDate)
  d.setHours(0, 0, 0, 0)
  const daysBack = (d.getDay() - dow + 7) % 7
  d.setDate(d.getDate() - daysBack)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const Route = createFileRoute("/history")({
  loader: async () => {
    const [settings, pastWeeks] = await Promise.all([
      getPlanSettings(),
      listPastWeeks(),
    ])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentWeekStart = computeCurrentWeekStart(settings.week_start_dow, today)
    const nextWeekStart = new Date(currentWeekStart)
    nextWeekStart.setDate(currentWeekStart.getDate() + 7)
    return {
      pastWeeks,
      currentWeekStr: toDateStr(currentWeekStart),
      nextWeekStr: toDateStr(nextWeekStart),
    }
  },
  component: HistoryPage,
})

function HistoryPage() {
  const { authState, displayName } = Route.useRouteContext()
  const { pastWeeks, currentWeekStr, nextWeekStr } = Route.useLoaderData()
  const member = authState.member!
  const router = useRouter()
  const locale = useContext(LocaleContext)

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSetLocale(next: "en" | "es") {
    await setLocale({ data: { locale: next } })
    await router.invalidate()
  }

  function formatWeekLabel(weekStart: string) {
    const d = new Date(weekStart + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">{displayName ?? "Food Organizer"}</span>
        </div>
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <Link to="/plan/$weekStart" params={{ weekStart: currentWeekStr }} className="sidebar-nav-link">
              {t(locale, "thisWeek")}
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/plan/$weekStart" params={{ weekStart: nextWeekStr }} className="sidebar-nav-link">
              {t(locale, "nextWeek")}
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/dishes" className="sidebar-nav-link">{t(locale, "dishes")}</Link>
          </li>
          <li className="sidebar-nav-item sidebar-nav-item--active">{t(locale, "history")}</li>
          {member.role === "admin" && (
            <li className="sidebar-nav-item">
              <Link to="/accounts" className="sidebar-nav-link">{t(locale, "accounts")}</Link>
            </li>
          )}
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

      <main className="main-content">
        <div className="plan-header">
          <h1 className="plan-title">History</h1>
        </div>

        {pastWeeks.length === 0 ? (
          <div className="plan-empty">
            <p>No past weeks yet.</p>
          </div>
        ) : (
          <ul className="history-list">
            {pastWeeks.map((w) => (
              <li key={w.week_start} className="history-list-item">
                <Link
                  to="/plan/$weekStart"
                  params={{ weekStart: w.week_start }}
                  className="history-week-link"
                >
                  Week of {formatWeekLabel(w.week_start)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
