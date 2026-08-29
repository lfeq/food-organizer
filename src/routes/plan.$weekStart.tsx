import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router"
import { useState, useEffect, useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t, interpolate, INTL_LOCALE, type StringKey } from "#/i18n"
import {
  getWeekPlan,
  generateWeek,
  getPlanSettings,
  getRepeatingCourses,
  rerollDay,
  type Course,
} from "#/plan-fns"

const COURSE_LABEL_KEY: Record<Course, StringKey> = {
  soup: "courseSoup",
  side: "courseSide",
  main: "courseMain",
}

const COURSE_PLURAL_KEY: Record<Course, StringKey> = {
  soup: "courseSoupPlural",
  side: "courseSidePlural",
  main: "courseMainPlural",
}

function computeWeekStart(dow: number, refDate: Date): Date {
  const d = new Date(refDate)
  d.setHours(0, 0, 0, 0)
  const daysBack = (d.getDay() - dow + 7) % 7
  d.setDate(d.getDate() - daysBack)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const Route = createFileRoute("/plan/$weekStart")({
  loader: async ({ params }) => {
    const settings = await getPlanSettings()
    const plan = await getWeekPlan({ data: { weekStart: params.weekStart } })
    const repeating = plan ? await getRepeatingCourses({ data: { weeklyPlanId: plan.id } }) : []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentWeekStart = computeWeekStart(settings.week_start_dow, today)
    const nextWeekStart = new Date(currentWeekStart)
    nextWeekStart.setDate(currentWeekStart.getDate() + 7)

    const currentWeekStr = toDateStr(currentWeekStart)
    const nextWeekStr = toDateStr(nextWeekStart)

    const isWritable =
      params.weekStart === currentWeekStr || params.weekStart === nextWeekStr

    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRe.test(params.weekStart)) {
      throw redirect({ to: "/plan/$weekStart", params: { weekStart: currentWeekStr } })
    }

    return {
      settings,
      plan,
      repeating,
      today: toDateStr(today),
      currentWeekStr,
      nextWeekStr,
      isWritable,
    }
  },
  component: PlanPage,
})

function PlanPage() {
  const { authState, displayName } = Route.useRouteContext()
  const loaderData = Route.useLoaderData()
  const { weekStart } = Route.useParams()
  const member = authState.member!
  const router = useRouter()
  const locale = useContext(LocaleContext)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const tid = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(tid)
  }, [toast])

  const { plan, repeating, today, currentWeekStr, nextWeekStr, isWritable } = loaderData

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSetLocale(next: "en" | "es") {
    await setLocale({ data: { locale: next } })
    await router.invalidate()
  }

  async function doGenerate() {
    setBusy(true)
    setError(null)
    setConfirmRegen(false)
    const res = await generateWeek({ data: { weekStart } })
    setBusy(false)
    if (!res.ok) {
      if (res.code === "GENERATE_EMPTY_COURSE") {
        const courses = (res.detail ?? "")
          .split(",")
          .map((c) => t(locale, COURSE_PLURAL_KEY[c as Course] ?? "courseSoupPlural"))
          .join(", ")
        setError(interpolate(t(locale, "planErrEmptyCourse"), { courses }))
      } else if (res.code === "WEEK_NOT_WRITABLE") {
        setError(t(locale, "planErrNotWritable"))
      } else {
        setError(t(locale, "errGeneric"))
      }
      return
    }
    await router.invalidate()
  }

  function handleGenerateClick() {
    if (plan) {
      setConfirmRegen(true)
    } else {
      void doGenerate()
    }
  }

  async function handleReroll(planDayId: string) {
    setBusy(true)
    setError(null)
    const res = await rerollDay({ data: { planDayId } })
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, "planErrRerollFailed"))
      return
    }
    if (res.data.causedRepeat) {
      setToast(t(locale, "planRerollToast"))
    }
    await router.invalidate()
  }

  const todayDayDate = today
  const todayDay = plan?.days.find((d) => d.day_date === todayDayDate)
  const otherDays = plan?.days.filter((d) => d.day_date !== todayDayDate) ?? []
  const featuredDay = todayDay ?? plan?.days[0] ?? null
  const sidebarDays = todayDay ? otherDays : (plan?.days.slice(1) ?? [])

  const isPastWeek = weekStart < currentWeekStr
  const isCurrentWeek = weekStart === currentWeekStr
  const isNextWeek = weekStart === nextWeekStr

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString(INTL_LOCALE[locale], { weekday: "short", month: "short", day: "numeric" })
  }

  function isElapsed(dateStr: string) {
    return dateStr < todayDayDate
  }

  const weekLabel = isCurrentWeek
    ? t(locale, "thisWeek")
    : isNextWeek
      ? t(locale, "nextWeek")
      : formatDate(weekStart)

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">{displayName ?? "Food Organizer"}</span>
        </div>
        <ul className="sidebar-nav">
          <li className={`sidebar-nav-item${isCurrentWeek ? " sidebar-nav-item--active" : ""}`}>
            <Link to="/plan/$weekStart" params={{ weekStart: currentWeekStr }} className="sidebar-nav-link">
              {t(locale, "thisWeek")}
            </Link>
          </li>
          <li className={`sidebar-nav-item${isNextWeek ? " sidebar-nav-item--active" : ""}`}>
            <Link to="/plan/$weekStart" params={{ weekStart: nextWeekStr }} className="sidebar-nav-link">
              {t(locale, "nextWeek")}
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/dishes" className="sidebar-nav-link">{t(locale, "dishes")}</Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/history" className="sidebar-nav-link">{t(locale, "history")}</Link>
          </li>
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
          <h1 className="plan-title">{weekLabel}</h1>
          {isWritable && !isPastWeek && (
            <button
              className="btn-primary"
              onClick={handleGenerateClick}
              disabled={busy}
            >
              {plan ? t(locale, "planRegenerate") : t(locale, "planGenerate")}
            </button>
          )}
          {isPastWeek && (
            <span className="plan-readonly-badge">{t(locale, "planPastReadOnly")}</span>
          )}
        </div>

        {error && <p className="form-error plan-error">{error}</p>}

        {repeating.length > 0 && (
          <div className="plan-repeat-banner">
            {repeating.map((c) => (
              <p key={c} className="plan-repeat-line">
                {interpolate(t(locale, "planRepeatBanner"), { course: t(locale, COURSE_PLURAL_KEY[c]) })}
              </p>
            ))}
          </div>
        )}

        {!plan && (
          <div className="plan-empty">
            <p>{t(locale, "planNoWeek")}</p>
            {isWritable && (
              <button className="btn-primary" onClick={handleGenerateClick} disabled={busy}>
                {t(locale, "planGenerate")}
              </button>
            )}
          </div>
        )}

        {plan && (
          <div className="plan-columns">
            {featuredDay && (
              <div
                className={[
                  "plan-today-col",
                  featuredDay.day_date === todayDayDate ? "plan-day--today" : "",
                  isElapsed(featuredDay.day_date) && featuredDay.day_date !== todayDayDate
                    ? "plan-day--elapsed"
                    : "",
                ].filter(Boolean).join(" ")}
              >
                <div className="plan-day-header">
                  <span className="plan-day-date">{formatDate(featuredDay.day_date)}</span>
                  {featuredDay.day_date === todayDayDate && (
                    <span className="plan-today-tag">{t(locale, "planToday")}</span>
                  )}
                  {isWritable && (
                    <button
                      className="plan-reroll-btn plan-reroll-btn--labeled"
                      onClick={() => void handleReroll(featuredDay.id)}
                      disabled={busy}
                      title={t(locale, "planRerollDay")}
                    >
                      {t(locale, "planRerollDay")}
                    </button>
                  )}
                </div>
                <ul className="plan-today-slots">
                  {featuredDay.slots.map((slot) => (
                    <li key={slot.course} className="plan-today-slot">
                      <span className="plan-slot-course">{t(locale, COURSE_LABEL_KEY[slot.course])}</span>
                      <span className="plan-slot-dish">{slot.dish_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="plan-others-col">
              {sidebarDays.map((day) => (
                <div
                  key={day.id}
                  className={[
                    "plan-day-card",
                    isElapsed(day.day_date) ? "plan-day--elapsed" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="plan-day-header">
                    <span className="plan-day-date">{formatDate(day.day_date)}</span>
                    {isWritable && (
                      <button
                        className="plan-reroll-btn"
                        onClick={() => void handleReroll(day.id)}
                        disabled={busy}
                        title={t(locale, "planRerollDay")}
                      >
                        {t(locale, "planRerollIcon")}
                      </button>
                    )}
                  </div>
                  <ul className="plan-compact-slots">
                    {day.slots.map((slot) => (
                      <li key={slot.course} className="plan-compact-slot">
                        <span className="plan-slot-course plan-slot-course--compact">{t(locale, COURSE_LABEL_KEY[slot.course])}</span>
                        <span className="plan-slot-dish plan-slot-dish--compact">{slot.dish_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {toast && (
          <div className="plan-toast" role="status">
            {toast}
          </div>
        )}

        {confirmRegen && (
          <div className="modal-backdrop" onClick={() => setConfirmRegen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">{t(locale, "planRegenTitle")}</h2>
              <p className="modal-notice">{t(locale, "planRegenNotice")}</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setConfirmRegen(false)} disabled={busy}>
                  {t(locale, "cancel")}
                </button>
                <button className="btn-danger" onClick={() => void doGenerate()} disabled={busy}>
                  {t(locale, "planRegenerate")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
