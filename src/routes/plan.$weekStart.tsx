import { createFileRoute, useRouter, redirect } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { Navigation } from "#/components/navigation"
import { Button } from "#/components/button"
import { Sheet } from "#/components/sheet"
import { DayCard, type DayCardSlot } from "#/components/day-card"
import { TodayCard } from "#/components/today-card"
import { EmptyLine } from "#/components/empty-line"
import { InlineError } from "#/components/inline-error"
import { MessageRegion } from "#/components/message-region"
import { Notice, type NoticeForm, type NoticeProps } from "#/components/notice"
import { Tag } from "#/components/tag"
import { LocaleContext, t, interpolate, INTL_LOCALE, type Locale, type StringKey } from "#/i18n"
import { catalogueNotice, countByCourse } from "#/catalogue-notice"
import { COURSE_ORDER, COURSE_LABEL_KEY, COURSE_PLURAL_KEY } from "#/courses"
import { listDishes } from "#/dishes-fns"
import { addDays, hasElapsed, weekStartFor, type IsoDate } from "#/plan-dates"
import {
  getWeekPlan,
  generateWeek,
  getPlanSettings,
  getRepeatingDishes,
  rerollDay,
  type Course,
  type PlanDayRow,
} from "#/plan-fns"
import { repeatNotice } from "#/repeat-notice"
import type { ResultCode } from "#/result-codes"
import { weekRange } from "#/week-range"

/**
 * Every refusal this screen can be handed, said in the household's own
 * language. One shape for both: a `Partial<Record<…>>` map and a named
 * fallback, so a code that grows a message later is one line, and a code with
 * no entry still says something. `GENERATE_EMPTY_COURSE` is not in the first
 * map because its sentence interpolates the courses it carries.
 */
const GENERATE_ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  WEEK_NOT_WRITABLE: "planErrNotWritable",
}

const REROLL_ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  DAY_ELAPSED: "planErrDayElapsed",
  WEEK_NOT_WRITABLE: "planErrNotWritable",
}

/**
 * Today, in the instance's timezone.
 *
 * Today is a function of `settings.timezone` (SPEC.md §6.1), not of whichever
 * clock the browser is set to: which day is featured and which rows dim would
 * otherwise be a day out for a household member travelling. `en-CA` is the
 * locale that writes a date as `YYYY-MM-DD`, which is the shape every date in
 * this app is held in. A timezone the database somehow holds but `Intl` will
 * not accept falls back to the browser's own local date parts — still never
 * `toISOString()`, which answers UTC and so hands back yesterday for most of
 * the evening in `America/Mexico_City`.
 */
function todayIn(timezone: string): IsoDate {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  } catch {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${now.getFullYear()}-${month}-${day}`
  }
}

export const Route = createFileRoute("/plan/$weekStart")({
  loader: async ({ params }) => {
    const settings = await getPlanSettings()
    const plan = await getWeekPlan({ data: { weekStart: params.weekStart } })

    const today = todayIn(settings.timezone)
    const currentWeekStr = weekStartFor(today, settings.week_start_dow)
    const nextWeekStr = addDays(currentWeekStr, 7)

    const isWritable =
      params.weekStart === currentWeekStr || params.weekStart === nextWeekStr

    // A repeating week is only said where the repeat can still be undone.
    const repeat =
      plan && isWritable
        ? repeatNotice(await getRepeatingDishes({ data: { weeklyPlanId: plan.id } }))
        : null

    // What the catalogue makes true about a week that could be drawn. Only a
    // writable week can be generated, so only a writable week is annotated.
    const catalogue = isWritable
      ? catalogueNotice(countByCourse(await listDishes()))
      : null

    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRe.test(params.weekStart)) {
      throw redirect({ to: "/plan/$weekStart", params: { weekStart: currentWeekStr } })
    }

    return {
      settings,
      plan,
      repeat,
      catalogue,
      today,
      currentWeekStr,
      nextWeekStr,
      isWritable,
    }
  },
  component: PlanPage,
})

function PlanPage() {
  const { plan, repeat, catalogue, today, currentWeekStr, nextWeekStr, isWritable } =
    Route.useLoaderData()
  const { weekStart } = Route.useParams()
  const router = useRouter()
  const locale = useContext(LocaleContext)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const isPastWeek = weekStart < currentWeekStr
  const isCurrentWeek = weekStart === currentWeekStr
  const isNextWeek = weekStart === nextWeekStr

  async function doGenerate() {
    setBusy(true)
    setError(null)
    setConfirmRegen(false)
    const res = await generateWeek({ data: { weekStart } })
    setBusy(false)
    if (!res.ok) {
      // The one refusal with data of its own: the server names the empty
      // courses, so the sentence is interpolated rather than looked up.
      setError(
        res.code === "GENERATE_EMPTY_COURSE"
          ? interpolate(t(locale, "planErrEmptyCourse"), {
              courses: coursesIn(res.courses, locale),
            })
          : t(locale, GENERATE_ERROR_KEY[res.code] ?? "errGeneric"),
      )
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
      setError(t(locale, REROLL_ERROR_KEY[res.code] ?? "planErrRerollFailed"))
      if (res.code === "DAY_ELAPSED") {
        // The tab's "today" went stale — most likely across midnight. Having
        // said so, redraw, so the day comes back dimmed and without its
        // control instead of offering a retry that can only fail again
        // (SPEC §9.2). The message is the map's; the redraw is this code's
        // alone, which is why it stays a branch.
        await router.invalidate()
      }
      return
    }
    // A reroll that lands on a repeat says nothing of its own: the Notice is
    // not a report of what just happened but a statement of what is true, and
    // it is there when the screen settles (SPEC §9.3). There is no toast.
    await router.invalidate()
  }

  // Today is featured — and only today. A next week holds no today, and a past
  // week is the same screen with no featured day and no dimming (SPEC §11.4).
  const featured = isPastWeek ? undefined : plan?.days.find((d) => d.day_date === today)
  const rows = (plan?.days ?? []).filter((d) => d !== featured)

  const weekLabel = isCurrentWeek
    ? t(locale, "thisWeek")
    : isNextWeek
      ? t(locale, "nextWeek")
      : // A past week has no `This week` / `Next week` name to fall back on, so
        // the title is the week range — the same seven-day range the history
        // row it was opened from carries (visual-system.md → "What a past week
        // opens into").
        weekRange(weekStart, locale)

  // A course with no dishes is the one case where the precondition is knowable
  // from the client, so the control is disabled rather than the failure
  // reported. The Notice beside it is the reason; the button keeps its label.
  const generateBlocked = catalogue?.kind === "empty"

  const notice = noticeFor({
    locale,
    hasPlan: Boolean(plan),
    repeat,
    catalogue,
    generateBlocked,
  })

  function rerollFor(day: PlanDayRow, labelled: boolean) {
    // Absent, not disabled: an elapsed day loses its control entirely.
    if (!isWritable || isPastWeek || hasElapsed(day.day_date, today)) return undefined
    return labelled ? (
      <Button
        variant="small-outline"
        disabled={busy}
        onClick={() => void handleReroll(day.id)}
      >
        {t(locale, "planRerollDay")}
      </Button>
    ) : (
      <Button
        variant="icon"
        disabled={busy}
        aria-label={t(locale, "planRerollDay")}
        onClick={() => void handleReroll(day.id)}
      >
        {t(locale, "planRerollIcon")}
      </Button>
    )
  }

  return (
    <div className="screen-shell">
      <Navigation />

      <main className="screen-shell-main">
        <header className="plan-header">
          <div className="plan-week">
            <h1 className="plan-range type-title-page type-title-page-desktop">{weekLabel}</h1>
            {isCurrentWeek || isNextWeek ? (
              <Button
                variant="text-action"
                onClick={() =>
                  void router.navigate({
                    to: "/plan/$weekStart",
                    params: { weekStart: isCurrentWeek ? nextWeekStr : currentWeekStr },
                  })
                }
              >
                {t(locale, isCurrentWeek ? "planStepNext" : "planStepThis")}
              </Button>
            ) : null}
          </div>

          {/* Exactly one control, at both widths. The stepper is not in it. */}
          <div className="plan-actions">
            {isWritable && !isPastWeek ? (
              <Button
                variant="primary-plan"
                shape="pill"
                disabled={busy || generateBlocked}
                onClick={handleGenerateClick}
              >
                {t(locale, plan ? "planRegenerate" : "planGenerate")}
              </Button>
            ) : null}
            {isPastWeek ? <Tag>{t(locale, "planPastReadOnly")}</Tag> : null}
          </div>
        </header>

        <MessageRegion>
          {error ? <InlineError>{error}</InlineError> : null}
          {notice ? <Notice {...notice} /> : null}
        </MessageRegion>

        <div className="plan-days">
          {!plan ? (
            // The day area's zero form is one sentence, not a seven-day
            // scaffold. It states the absence; the Notice above states the
            // reason, and this line never rewords itself because of it.
            <EmptyLine>{t(locale, "planNoWeek")}</EmptyLine>
          ) : (
            <>
              {featured ? (
                <TodayCard
                  dayName={formatDay(featured.day_date, locale).weekday}
                  dayNumber={formatDay(featured.day_date, locale).number}
                  badgeLabel={t(locale, "planToday")}
                  slots={slotsOf(featured, locale)}
                  action={rerollFor(featured, true)}
                />
              ) : null}

              {/* A weekly plan may hold fewer than seven plan days. The missing
                  dates draw nothing at all — no placeholders, no ghosts. */}
              <div className="plan-week-grid">
                {rows.map((day) => (
                  <DayCard
                    key={day.id}
                    dayName={formatDay(day.day_date, locale).weekday}
                    dayNumber={formatDay(day.day_date, locale).number}
                    slots={slotsOf(day, locale)}
                    elapsed={!isPastWeek && hasElapsed(day.day_date, today)}
                    action={rerollFor(day, false)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/*
          The regenerate confirmation is the shared Sheet: a sheet below 900px,
          a centred Panel above, with the week visible behind it in both. #108
          left it on the legacy `.modal-*` classes because the Sheet was not
          its to create; #109 created it. The header's `Cancel` is the way out,
          so the body carries the destructive action alone.
        */}
        {confirmRegen && (
          <Sheet
            title={t(locale, "planRegenTitle")}
            dismiss="cancel"
            onDismiss={() => setConfirmRegen(false)}
          >
            <p className="sunken-note type-body-sm">{t(locale, "planRegenNotice")}</p>
            <Button variant="destructive" fullWidth disabled={busy} onClick={() => void doGenerate()}>
              {t(locale, "planRegenerate")}
            </Button>
          </Sheet>
        )}
      </main>
    </div>
  )
}

/** A plan day's three courses in soup/side/main order, labelled for the reader. */
function slotsOf(day: PlanDayRow, locale: Locale): DayCardSlot[] {
  return COURSE_ORDER.flatMap((course) => {
    const slot = day.slots.find((s) => s.course === course)
    return slot
      ? [{ course, label: t(locale, COURSE_LABEL_KEY[course]), dishName: slot.dish_name }]
      : []
  })
}

/** The two shapes a day is said in on this screen. The week range above them
 *  is the shared `weekRange` (src/week-range.ts). */
function formatDay(date: IsoDate, locale: Locale) {
  const d = new Date(date + "T00:00:00")
  const intl = INTL_LOCALE[locale]
  return {
    weekday: d.toLocaleDateString(intl, { weekday: "short" }),
    number: d.toLocaleDateString(intl, { day: "numeric" }),
  }
}

/**
 * The one Notice this screen carries, or nothing.
 *
 * Its **form** follows whether there is a week on screen to annotate — full
 * where the Notice is the screen's subject, compact where it annotates a drawn
 * week — and never the width.
 *
 * Its **message** is the repeat where there is one, because a repeat is a
 * statement about the week the household is looking at; otherwise the
 * catalogue's, which is a statement about what can still be drawn. One Notice
 * either way, said once per week, never one per slot.
 *
 * **Except where the catalogue is what disables `Generate week`.** A disabled
 * control keeps its own label and the reason sits beside it, never in place of
 * it (visual-system.md, notice.tsx). Letting the repeat win there would leave
 * the control dead with no reason anywhere on screen — a week can both repeat
 * and hold an empty course, and #108's "repeat wins" is a tie-break between
 * two statements, not a licence to hide the one that is also an explanation.
 * Still one Notice per week either way.
 */
function noticeFor({
  locale,
  hasPlan,
  repeat,
  catalogue,
  generateBlocked,
}: {
  locale: Locale
  hasPlan: boolean
  repeat: ReturnType<typeof repeatNotice>
  catalogue: ReturnType<typeof catalogueNotice>
  generateBlocked: boolean
}): NoticeProps | null {
  const form: NoticeForm = hasPlan ? "compact" : "full"
  const actionLabel = t(locale, "planNoticeAction")

  if (repeat && !generateBlocked) {
    return {
      form,
      headline: t(locale, "planNoticeRepeatTitle"),
      sentence:
        repeat.kind === "dish"
          ? t(locale, "planRepeatDish")
          : interpolate(t(locale, "planRepeatCourses"), {
              courses: coursesIn(repeat.courses, locale),
            }),
      dishName: repeat.kind === "dish" ? repeat.dishName : undefined,
      actionLabel,
    }
  }

  if (catalogue) {
    const isEmpty = catalogue.kind === "empty"
    return {
      form,
      headline: t(locale, isEmpty ? "planNoticeEmptyTitle" : "planNoticeShortTitle"),
      sentence: interpolate(t(locale, isEmpty ? "planNoticeEmpty" : "planNoticeShort"), {
        courses: coursesIn(catalogue.courses, locale),
      }),
      actionLabel,
    }
  }

  return null
}

function coursesIn(courses: readonly Course[], locale: Locale): string {
  return courses.map((c) => t(locale, COURSE_PLURAL_KEY[c])).join(", ")
}
