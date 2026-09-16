import { createFileRoute, Link } from "@tanstack/react-router"
import { useContext } from "react"
import { Navigation } from "#/components/navigation"
import { LocaleContext, t, interpolate, INTL_LOCALE } from "#/i18n"
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
  const { pastWeeks } = Route.useLoaderData()
  const locale = useContext(LocaleContext)

  function formatWeekLabel(weekStart: string) {
    const d = new Date(weekStart + "T00:00:00")
    return d.toLocaleDateString(INTL_LOCALE[locale], { month: "long", day: "numeric", year: "numeric" })
  }

  return (
    <div className="app-layout">
      <Navigation active="history" />

      <main className="main-content">
        <div className="plan-header">
          <h1 className="plan-title">{t(locale, "historyH1")}</h1>
        </div>

        {pastWeeks.length === 0 ? (
          <div className="plan-empty">
            <p>{t(locale, "historyNone")}</p>
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
                  {interpolate(t(locale, "historyWeekOf"), { date: formatWeekLabel(w.week_start) })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
