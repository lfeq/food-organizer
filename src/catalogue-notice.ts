import { COURSE_ORDER } from "#/courses"
import type { Course } from "#/plan-fns"

/**
 * How many dishes a course needs to fill a week without repeating one.
 *
 * Seven, because a week is seven days and a draw is without replacement
 * within the course (SPEC.md §9.1). A course below this repeats as needed; it
 * is announced, not refused.
 */
export const DISHES_PER_WEEK = 7

/**
 * What the catalogue makes true about the week that has not been drawn yet.
 *
 * **Zero is the far end of short, not a third message.** The predicate is the
 * same one either way — *this course does not hold enough dishes* — and it
 * keeps the same colour, the same call to action and the same component. What
 * changes is the consequence, and the consequence is not the Notice's to
 * state: a short course draws a week that repeats, an empty course draws no
 * week at all, and the `Generate week` button beside the Notice is disabled in
 * the second case and live in the first.
 */
export type CatalogueNotice = {
  kind: "short" | "empty"
  /** The courses the sentence names, in `soup, side, main` order. */
  courses: Course[]
}

/**
 * Derives the one Notice the catalogue puts on the week screen, or `null`
 * where every course can fill a week.
 *
 * Where courses are in both conditions at once, **the zero copy wins and names
 * every course that is empty**: the empty ones are what actually stop the
 * week, and a sentence that mixed "no dishes" with "too few" in one breath
 * would state two consequences the household cannot act on separately anyway.
 *
 * There is no "the catalogue is empty" state: three empty courses is the zero
 * copy naming three courses, and nothing else on screen changes.
 */
export function catalogueNotice(counts: Readonly<Record<Course, number>>): CatalogueNotice | null {
  const empty = COURSE_ORDER.filter((course) => counts[course] === 0)
  if (empty.length > 0) return { kind: "empty", courses: empty }

  const short = COURSE_ORDER.filter((course) => counts[course] < DISHES_PER_WEEK)
  if (short.length > 0) return { kind: "short", courses: short }

  return null
}

/** Counts a flat dish list by course. Absent courses count zero, not undefined. */
export function countByCourse(
  dishes: readonly { course: Course }[],
): Record<Course, number> {
  const counts: Record<Course, number> = { soup: 0, side: 0, main: 0 }
  for (const dish of dishes) counts[dish.course] += 1
  return counts
}
