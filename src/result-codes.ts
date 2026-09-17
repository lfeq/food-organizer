import type { Course } from "#/courses"

export type ResultCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_THROTTLED"
  | "AUTH_MUST_CHANGE_PASSWORD"
  | "AUTH_PASSWORD_TOO_SHORT"
  | "USERNAME_TAKEN"
  | "USERNAME_INVALID"
  | "LAST_ADMIN"
  | "DISH_NAME_TAKEN"
  | "DISH_NAME_EMPTY"
  | "GENERATE_EMPTY_COURSE"
  | "WEEK_NOT_WRITABLE"
  | "DAY_ELAPSED"
  | "PLAN_NOT_FOUND"
  | "WEEK_START_FROZEN"
  | "TIMEZONE_INVALID"
  | "DB_UNREACHABLE"

export type OkResult<T> = { ok: true; data: T }

/**
 * Every code but `GENERATE_EMPTY_COURSE`, which carries data of its own.
 */
export type PlainResultCode = Exclude<ResultCode, "GENERATE_EMPTY_COURSE">

/**
 * A refusal.
 *
 * `GENERATE_EMPTY_COURSE` is its own member because SPEC.md §12.6 has it
 * carry the offending course values **as data**: the reader's sentence names
 * those courses, and a comma-joined `detail` string would make the screen
 * re-parse and re-widen what the server already knew exactly. Splitting the
 * union is what lets `tsc` prove producer and consumer agree — `res.courses`
 * is reachable only after `res.code` has been narrowed to that one code.
 */
export type ErrResult =
  | { ok: false; code: "GENERATE_EMPTY_COURSE"; courses: readonly Course[]; detail?: string }
  | { ok: false; code: PlainResultCode; detail?: string }

export type Result<T> = OkResult<T> | ErrResult

export const ok = <T>(data: T): OkResult<T> => ({ ok: true, data })

export const err = (code: PlainResultCode, detail?: string): ErrResult => ({
  ok: false,
  code,
  detail,
})

/** The one refusal with data: the courses that hold no dish (SPEC.md §12.6). */
export const errEmptyCourse = (courses: readonly Course[]): ErrResult => ({
  ok: false,
  code: "GENERATE_EMPTY_COURSE",
  courses,
})
