/**
 * Whether a write against the weekly plan is allowed, decided from dates alone.
 *
 * The rule lives here rather than inline in the server function so it can be
 * tested with `today` passed explicitly: the case it exists for is a tab left
 * open across midnight, which no test can reach through a real clock.
 *
 * `today` is always the date the server derived from `settings.timezone`. A
 * date that arrived from the client is never the authority here (SPEC §6.2).
 */
import { addDays, hasElapsed, weekStartFor, type IsoDate } from "#/plan-dates"
import type { ResultCode } from "#/result-codes"

/**
 * Why a reroll of `dayDate` must be refused, or `null` when it may proceed.
 *
 * Two refusals, in order, because they are different facts (SPEC §12.6):
 *
 * - `WEEK_NOT_WRITABLE` — the day's week is neither the current nor the next
 *   week, so nothing in it may be written at all.
 * - `DAY_ELAPSED` — the week is writable, but this day is behind `today`.
 *   Today itself has not elapsed.
 */
export function rerollRefusal(args: {
  dayDate: IsoDate
  weekStart: IsoDate
  today: IsoDate
  weekStartDow: number
}): ResultCode | null {
  const { dayDate, weekStart, today, weekStartDow } = args
  const currentWeekStart = weekStartFor(today, weekStartDow)
  const nextWeekStart = addDays(currentWeekStart, 7)

  if (weekStart !== currentWeekStart && weekStart !== nextWeekStart) {
    return "WEEK_NOT_WRITABLE"
  }
  if (hasElapsed(dayDate, today)) return "DAY_ELAPSED"
  return null
}
