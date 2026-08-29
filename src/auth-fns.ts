import { createServerFn } from "@tanstack/react-start"
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server"
import { Effect, Exit } from "effect"
import { PgClient } from "@effect/sql-pg"
import { uuidv7 } from "uuidv7"
import { Runtime } from "#/runtime.server"
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  tokenToHex,
  hexToToken,
} from "#/auth.server"

const LOGIN_FAILURE_THRESHOLD = 5
const LOGIN_LOCK_MS = 5 * 60 * 1000
import { ok, err, type Result } from "#/result-codes"

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/
const SESSION_COOKIE = "session"
const SESSION_DAYS = 30
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

type MemberRow = {
  id: string
  username: string
  role: "admin" | "member"
  must_change_password: boolean
}

export type AuthState = {
  setupNeeded: boolean
  member: MemberRow | null
}

const SEED_DISHES: { name: string; course: "soup" | "side" | "main" }[] = [
  { course: "soup", name: "Sopa de fideo" },
  { course: "soup", name: "Caldo de pollo" },
  { course: "soup", name: "Sopa de lentejas" },
  { course: "soup", name: "Crema de calabaza" },
  { course: "soup", name: "Sopa de tortilla" },
  { course: "soup", name: "Caldo tlalpeño" },
  { course: "soup", name: "Sopa de verduras" },
  { course: "soup", name: "Sopa de elote" },
  { course: "soup", name: "Consomé de res" },
  { course: "side", name: "Arroz rojo" },
  { course: "side", name: "Frijoles de la olla" },
  { course: "side", name: "Ensalada de nopales" },
  { course: "side", name: "Papas con chorizo" },
  { course: "side", name: "Calabacitas a la mexicana" },
  { course: "side", name: "Arroz blanco con elote" },
  { course: "side", name: "Ensalada verde" },
  { course: "side", name: "Puré de papa" },
  { course: "side", name: "Chayotes al vapor" },
  { course: "main", name: "Milanesa de res" },
  { course: "main", name: "Pollo en mole" },
  { course: "main", name: "Tinga de pollo" },
  { course: "main", name: "Albóndigas en chipotle" },
  { course: "main", name: "Chiles rellenos" },
  { course: "main", name: "Bistec a la mexicana" },
  { course: "main", name: "Cochinita pibil" },
  { course: "main", name: "Pescado empapelado" },
  { course: "main", name: "Tortitas de papa" },
]

function makeSession() {
  const rawToken = generateToken()
  const hex = tokenToHex(rawToken)
  const hash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_MS)
  return { hex, hash, expiresAt }
}

function setSessionCookie(hex: string) {
  setCookie(SESSION_COOKIE, hex, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  })
}

function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: "/" })
}

function readSessionToken(): string | undefined {
  return getCookie(SESSION_COOKIE)
}

export const getAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthState> => {
    const tokenHex = readSessionToken()

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const countRows = yield* sql<{ count: string }>`
            SELECT COUNT(*)::text AS count FROM member
          `
          if (parseInt(countRows[0].count, 10) === 0) {
            return { setupNeeded: true, member: null } as AuthState
          }

          if (!tokenHex) return { setupNeeded: false, member: null } as AuthState

          const tokenHash = hashToken(hexToToken(tokenHex))
          const members = yield* sql<MemberRow>`
            SELECT m.id, m.username, m.role, m.must_change_password
            FROM session s
            JOIN member m ON m.id = s.member_id
            WHERE s.token_hash = ${tokenHash}
              AND s.expires_at > NOW()
          `
          if (members.length === 0) {
            return { setupNeeded: false, member: null } as AuthState
          }

          const expiresAt = new Date(Date.now() + SESSION_MS)
          yield* sql`
            UPDATE session SET expires_at = ${expiresAt}
            WHERE token_hash = ${tokenHash}
          `

          return { setupNeeded: false, member: members[0] } as AuthState
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return { setupNeeded: false, member: null }
  }
)

export const doSetup = createServerFn({ method: "POST" })
  .validator(
    (data: {
      username: string
      password: string
      weekStartDow: number
      timezone: string
    }) => data
  )
  .handler(async ({ data }): Promise<Result<{ username: string }>> => {
    const username = data.username.trim().toLowerCase()
    if (!USERNAME_RE.test(username)) return err("USERNAME_INVALID")
    if (data.password.length < 8) return err("AUTH_PASSWORD_TOO_SHORT")

    const passwordHash = await hashPassword(data.password)
    const session = makeSession()

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        sql.withTransaction(
          Effect.gen(function* () {
            const countRows = yield* sql<{ count: string }>`
              SELECT COUNT(*)::text AS count FROM member
            `
            if (parseInt(countRows[0].count, 10) > 0) {
              return err("USERNAME_TAKEN") as Result<{ username: string }>
            }

            const settingsId = uuidv7()
            yield* sql`
              INSERT INTO settings (id, week_start_dow, timezone)
              VALUES (${settingsId}, ${data.weekStartDow}, ${data.timezone})
            `

            const memberId = uuidv7()
            yield* sql`
              INSERT INTO member (id, username, password_hash, must_change_password, role)
              VALUES (${memberId}, ${username}, ${passwordHash}, false, 'admin')
            `

            for (const dish of SEED_DISHES) {
              yield* sql`
                INSERT INTO dish (id, name, course, author_id)
                VALUES (${uuidv7()}, ${dish.name}, ${dish.course}, ${memberId})
              `
            }

            yield* sql`
              INSERT INTO session (token_hash, member_id, expires_at)
              VALUES (${session.hash}, ${memberId}, ${session.expiresAt})
            `

            return ok({ username }) as Result<{ username: string }>
          })
        )
      )
    )

    if (Exit.isSuccess(result)) {
      if (result.value.ok) setSessionCookie(session.hex)
      return result.value
    }
    return err("DB_UNREACHABLE")
  })

export const doLogin = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string }) => data)
  .handler(async ({ data }): Promise<Result<{ username: string }>> => {
    const username = data.username.trim().toLowerCase()
    const session = makeSession()

    type MemberWithHash = MemberRow & {
      password_hash: string
      login_failures: number
      login_locked_until: Date | null
    }

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const rows = yield* sql<MemberWithHash>`
            SELECT id, username, role, must_change_password, password_hash,
                   login_failures, login_locked_until
            FROM member WHERE username = ${username}
          `
          if (rows.length === 0) {
            return err("AUTH_INVALID_CREDENTIALS") as Result<{ username: string }>
          }

          const member = rows[0]
          const now = new Date()

          if (member.login_locked_until && new Date(member.login_locked_until) > now) {
            return err("AUTH_THROTTLED") as Result<{ username: string }>
          }

          // If a previous lock has expired, treat failures as reset
          const lockExpired =
            member.login_locked_until !== null &&
            new Date(member.login_locked_until) <= now
          const effectiveFailures = lockExpired ? 0 : member.login_failures

          const valid = yield* Effect.promise(() =>
            verifyPassword(data.password, member.password_hash)
          )
          if (!valid) {
            const newFailures = effectiveFailures + 1
            const newLock =
              newFailures >= LOGIN_FAILURE_THRESHOLD
                ? new Date(Date.now() + LOGIN_LOCK_MS)
                : null
            yield* sql`
              UPDATE member
              SET login_failures = ${newFailures}, login_locked_until = ${newLock}
              WHERE id = ${member.id}
            `
            return err("AUTH_INVALID_CREDENTIALS") as Result<{ username: string }>
          }

          yield* sql`
            UPDATE member SET login_failures = 0, login_locked_until = NULL
            WHERE id = ${member.id}
          `
          yield* sql`
            INSERT INTO session (token_hash, member_id, expires_at)
            VALUES (${session.hash}, ${member.id}, ${session.expiresAt})
          `

          return ok({ username: member.username }) as Result<{ username: string }>
        })
      )
    )

    if (Exit.isSuccess(result)) {
      if (result.value.ok) setSessionCookie(session.hex)
      return result.value
    }
    return err("DB_UNREACHABLE")
  })

export const doLogout = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    const tokenHex = readSessionToken()
    if (tokenHex) {
      const tokenHash = hashToken(hexToToken(tokenHex))
      await Runtime.runPromise(
        Effect.flatMap(PgClient.PgClient, (sql) =>
          sql`DELETE FROM session WHERE token_hash = ${tokenHash}`
        )
      ).catch(() => {})
    }
    clearSessionCookie()
  }
)

export const doChangePassword = createServerFn({ method: "POST" })
  .validator((data: { newPassword: string }) => data)
  .handler(async ({ data }): Promise<Result<void>> => {
    if (data.newPassword.length < 8) return err("AUTH_PASSWORD_TOO_SHORT")

    const tokenHex = readSessionToken()
    if (!tokenHex) return err("AUTH_INVALID_CREDENTIALS")

    const tokenHash = hashToken(hexToToken(tokenHex))
    const passwordHash = await hashPassword(data.newPassword)

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const rows = yield* sql<{ id: string }>`
            SELECT m.id FROM session s
            JOIN member m ON m.id = s.member_id
            WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
          `
          if (rows.length === 0) return err("AUTH_INVALID_CREDENTIALS") as Result<void>

          yield* sql`
            UPDATE member
            SET password_hash = ${passwordHash},
                must_change_password = false,
                login_failures = 0,
                login_locked_until = NULL
            WHERE id = ${rows[0].id}
          `
          return ok(undefined) as Result<void>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })
