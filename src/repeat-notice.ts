import { COURSE_ORDER } from "#/courses"
import type { Course } from "#/plan-fns"

/** One dish that appears more than once in one course of a weekly plan. */
export type RepeatingDish = { course: Course; dishName: string }

/**
 * What a [repeating week](CONTEXT.md#repeating-week) says, once per week.
 * One repeat names the dish; several name the courses instead.
 */
export type RepeatNotice =
  | { kind: "dish"; dishName: string }
  | { kind: "courses"; courses: Course[] }

/** Derives the single notice a week carries, or null when the week does not repeat. */
export function repeatNotice(repeats: readonly RepeatingDish[]): RepeatNotice | null {
  if (repeats.length === 0) return null
  if (repeats.length === 1) return { kind: "dish", dishName: repeats[0]!.dishName }
  return {
    kind: "courses",
    courses: COURSE_ORDER.filter((c) => repeats.some((r) => r.course === c)),
  }
}
