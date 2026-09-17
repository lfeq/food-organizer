/**
 * A week's name: the range of its seven days.
 *
 * The range is always the **full seven days** of the week beginning at
 * `weekStart`, never the span of the plan days actually stored. A weekly plan
 * is identified by the date its week start falls on, so the label names a
 * week, not a row count — deriving it from the rows would give two weeks of
 * identical identity different labels (SPEC.md §11.4, visual-system.md → "The
 * history screen").
 *
 * `Intl.DateTimeFormat.formatRange` writes it the way each locale writes a
 * range — `Aug 25 – 31, 2025` in English, `25–31 de ago de 2025` in Spanish —
 * and shows a month or a year on both ends only where the week crosses one.
 * The year rides in every range rather than in a section heading
 * (visual-system.md → "The history screen").
 *
 * Both ends are read in UTC, which is the timezone `plan-dates` does its
 * arithmetic in; the label is a name for a date, not an instant.
 */

import { INTL_LOCALE, type Locale } from "#/i18n"
import { addDays, type IsoDate } from "#/plan-dates"

export function weekRange(weekStart: IsoDate, locale: Locale): string {
  const start = new Date(weekStart + "T00:00:00Z")
  const end = new Date(addDays(weekStart, 6) + "T00:00:00Z")
  const format = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return format.formatRange(start, end)
}
