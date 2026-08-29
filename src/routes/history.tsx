import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { doLogout } from "#/auth-fns"
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
  const { authState } = Route.useRouteContext()
  const { pastWeeks, currentWeekStr, nextWeekStr } = Route.useLoaderData()
  const member = authState.member!
  const router = useRouter()

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  function formatWeekLabel(weekStart: string) {
    const d = new Date(weekStart + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">Food Organizer</span>
        </div>
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <Link to="/plan/$weekStart" params={{ weekStart: currentWeekStr }} className="sidebar-nav-link">
              This week
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/plan/$weekStart" params={{ weekStart: nextWeekStr }} className="sidebar-nav-link">
              Next week
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/dishes" className="sidebar-nav-link">Dishes</Link>
          </li>
          <li className="sidebar-nav-item sidebar-nav-item--active">History</li>
          {member.role === "admin" && (
            <li className="sidebar-nav-item">
              <Link to="/accounts" className="sidebar-nav-link">Accounts</Link>
            </li>
          )}
        </ul>
        <div className="sidebar-bottom">
          <span className="sidebar-member">{member.username}</span>
          <button className="sidebar-logout" onClick={handleLogout}>
            Sign out
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
