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
  | "PLAN_NOT_FOUND"
  | "WEEK_START_FROZEN"
  | "DB_UNREACHABLE"

export type OkResult<T> = { ok: true; data: T }
export type ErrResult = { ok: false; code: ResultCode; detail?: string }
export type Result<T> = OkResult<T> | ErrResult

export const ok = <T>(data: T): OkResult<T> => ({ ok: true, data })
export const err = (code: ResultCode, detail?: string): ErrResult => ({
  ok: false,
  code,
  detail,
})
