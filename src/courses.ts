import type { StringKey } from "#/i18n"

/**
 * The three courses, and how each one is said.
 *
 * One home, beside `Course` itself: the order a week's courses are laid out
 * in and the two string keys that name a course were each written out three
 * times over while the screens were built in parallel, and three copies of a
 * closed three-member set is three places for a fourth course to be forgotten.
 *
 * `Course` itself is declared here rather than beside the server functions, so
 * that nothing which only needs to *name* a course has to import the module
 * that queries the database. `plan-fns.ts` re-exports it, so every existing
 * `import type { Course } from "#/plan-fns"` still reads.
 */

/** The three courses a day holds, one dish each (CONTEXT.md). */
export type Course = "soup" | "side" | "main"

/** Soup, side, main — the order every card and every sentence lays them out in. */
export const COURSE_ORDER: readonly Course[] = ["soup", "side", "main"]

/** One dish of that course: `Soup`, `Side`, `Main`. */
export const COURSE_LABEL_KEY: Record<Course, StringKey> = {
  soup: "courseSoup",
  side: "courseSide",
  main: "courseMain",
}

/** The course as a group of dishes: `Soups`, `Sides`, `Mains`. */
export const COURSE_PLURAL_KEY: Record<Course, StringKey> = {
  soup: "courseSoupPlural",
  side: "courseSidePlural",
  main: "courseMainPlural",
}
