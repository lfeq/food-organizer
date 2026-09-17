/**
 * Pure date arithmetic for the weekly plan.
 *
 * Every function here takes `today` (or a week start) as an explicit ISO date
 * string and reads no clock: no `Date.now()`, no `new Date()` without an
 * argument, no timezone. Deriving `today` from the instance timezone stays the
 * server function's job; these functions only do the arithmetic on top of it.
 *
 * Dates are `YYYY-MM-DD` strings throughout, which is how they cross the SQL
 * boundary (`::date::text`) and how they are compared — zero-padded ISO dates
 * order lexicographically, so `<` is a correct "is earlier than".
 */

/** An ISO calendar date, `YYYY-MM-DD`. */
export type IsoDate = string

const MS_PER_DAY = 86_400_000

function toUtc(date: IsoDate): Date {
  return new Date(date + "T00:00:00Z")
}

function toIso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10)
}

/** Day of week for an ISO date: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return toUtc(date).getUTCDay()
}

/** The ISO date `n` days after `date` (`n` may be negative). */
export function addDays(date: IsoDate, n: number): IsoDate {
  return toIso(new Date(toUtc(date).getTime() + n * MS_PER_DAY))
}

/**
 * The week start of the week that contains `today`, for an instance whose week
 * starts on `weekStartDow` (0 = Sunday … 6 = Saturday).
 */
export function weekStartFor(today: IsoDate, weekStartDow: number): IsoDate {
  const daysBack = (dayOfWeek(today) - weekStartDow + 7) % 7
  return addDays(today, -daysBack)
}

/** The seven ISO dates of the week beginning at `weekStart`, in order. */
export function weekDays(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/**
 * Has this plan day's date passed? Today itself has **not** elapsed: it is the
 * day being lived, and its dishes are still a decision that is open.
 */
export function hasElapsed(dayDate: IsoDate, today: IsoDate): boolean {
  return dayDate < today
}

/**
 * The days of the week beginning at `weekStart` that are still ahead of
 * `today` — today itself included, since today has not elapsed.
 *
 * All seven when `today` falls on or before the week start; empty when the
 * whole week is behind `today`.
 */
export function daysStillAhead(weekStart: IsoDate, today: IsoDate): IsoDate[] {
  return weekDays(weekStart).filter((d) => !hasElapsed(d, today))
}

/**
 * What a generate writes, given the plan days that already exist.
 *
 * `preserved` are the plan days that are elapsed: generating leaves them
 * exactly as they stand, and the dishes they hold count as used when the rest
 * is drawn. `redraw` are the days still ahead — the dates the generate draws,
 * whether or not a plan day already exists for them. `discarded` are the plan
 * days that already exist on those dates and are therefore replaced.
 *
 * Nothing is invented for a date that is elapsed and has no plan day: those
 * would be immutable the instant they were written, a permanent record of
 * meals nobody decided. A weekly plan may therefore hold fewer than seven plan
 * days.
 */
export function generateSplit(
  weekStart: IsoDate,
  today: IsoDate,
  existingDayDates: readonly IsoDate[],
): { preserved: IsoDate[]; redraw: IsoDate[]; discarded: IsoDate[] } {
  const redraw = daysStillAhead(weekStart, today)
  const ahead = new Set(redraw)
  const existing = [...new Set(existingDayDates)].sort()
  return {
    preserved: existing.filter((d) => !ahead.has(d)),
    redraw,
    discarded: existing.filter((d) => ahead.has(d)),
  }
}
