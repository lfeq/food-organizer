import { createServerFn } from "@tanstack/react-start"
import { getCookie } from "@tanstack/react-start/server"
import { Effect, Exit } from "effect"
import { PgClient } from "@effect/sql-pg"
import { uuidv7 } from "uuidv7"
import { Runtime } from "#/runtime.server"
import {
  hashPassword,
  hashToken,
  hexToToken,
  generateTempPassword,
} from "#/auth.server"
import { ok, err, type Result } from "#/result-codes"

const SESSION_COOKIE = "session"

export type Member = {
  id: string
  username: string
  role: "admin" | "member"
  must_change_password: boolean
}

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

function readSessionToken(): string | undefined {
  return getCookie(SESSION_COOKIE)
}

async function getCallerAdminId(): Promise<string | null> {
  const tokenHex = readSessionToken()
  if (!tokenHex) return null
  const tokenHash = hashToken(hexToToken(tokenHex))

  const result = await Runtime.runPromiseExit(
    Effect.flatMap(PgClient.PgClient, (sql) =>
      Effect.gen(function* () {
        const rows = yield* sql<{ id: string; role: string }>`
          SELECT m.id, m.role FROM session s
          JOIN member m ON m.id = s.member_id
          WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
        `
        if (rows.length === 0 || rows[0].role !== "admin") return null
        return rows[0].id
      })
    )
  )
  if (Exit.isSuccess(result)) return result.value
  return null
}

export const listMembers = createServerFn({ method: "GET" }).handler(
  async (): Promise<Member[]> => {
    const callerId = await getCallerAdminId()
    if (!callerId) return []

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.map(
          sql<Member>`
            SELECT id, username, role, must_change_password
            FROM member ORDER BY username
          `,
          (rows) => rows as Member[]
        )
      )
    )
    if (Exit.isSuccess(result)) return result.value
    return []
  }
)

export const createMember = createServerFn({ method: "POST" })
  .validator((data: { username: string }) => data)
  .handler(
    async ({ data }): Promise<Result<{ username: string; tempPassword: string }>> => {
      const callerId = await getCallerAdminId()
      if (!callerId) return err("AUTH_INVALID_CREDENTIALS")

      const username = data.username.trim().toLowerCase()
      if (!USERNAME_RE.test(username) || !username) return err("USERNAME_INVALID")

      const tempPassword = generateTempPassword()
      const passwordHash = await hashPassword(tempPassword)

      const result = await Runtime.runPromiseExit(
        Effect.flatMap(PgClient.PgClient, (sql) =>
          Effect.gen(function* () {
            const existing = yield* sql<{ id: string }>`
              SELECT id FROM member WHERE username = ${username}
            `
            if (existing.length > 0) {
              return err("USERNAME_TAKEN") as Result<{
                username: string
                tempPassword: string
              }>
            }

            yield* sql`
              INSERT INTO member (id, username, password_hash, must_change_password, role)
              VALUES (${uuidv7()}, ${username}, ${passwordHash}, true, 'member')
            `
            return ok({ username, tempPassword }) as Result<{
              username: string
              tempPassword: string
            }>
          })
        )
      )

      if (Exit.isSuccess(result)) return result.value
      return err("DB_UNREACHABLE")
    }
  )

export const resetMemberPassword = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }): Promise<Result<{ tempPassword: string }>> => {
    const callerId = await getCallerAdminId()
    if (!callerId) return err("AUTH_INVALID_CREDENTIALS")

    const tempPassword = generateTempPassword()
    const passwordHash = await hashPassword(tempPassword)

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          yield* sql`
            UPDATE member
            SET password_hash = ${passwordHash},
                must_change_password = true,
                login_failures = 0,
                login_locked_until = NULL
            WHERE id = ${data.memberId}
          `
          yield* sql`DELETE FROM session WHERE member_id = ${data.memberId}`
          return ok({ tempPassword }) as Result<{ tempPassword: string }>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

export const removeMember = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }): Promise<Result<void>> => {
    const callerId = await getCallerAdminId()
    if (!callerId) return err("AUTH_INVALID_CREDENTIALS")

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          // Sessions deleted by FK cascade when member is deleted
          yield* sql`DELETE FROM member WHERE id = ${data.memberId}`
          return ok(undefined) as Result<void>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

export const setMemberRole = createServerFn({ method: "POST" })
  .validator((data: { memberId: string; role: "admin" | "member" }) => data)
  .handler(async ({ data }): Promise<Result<void>> => {
    const callerId = await getCallerAdminId()
    if (!callerId) return err("AUTH_INVALID_CREDENTIALS")

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          if (data.role === "member") {
            // App-layer last-admin guard (DB trigger is the enforcement safety net)
            const adminCount = yield* sql<{ count: string }>`
              SELECT COUNT(*)::text AS count FROM member WHERE role = 'admin'
            `
            const isTarget = yield* sql<{ role: string }>`
              SELECT role FROM member WHERE id = ${data.memberId}
            `
            if (
              parseInt(adminCount[0].count, 10) <= 1 &&
              isTarget.length > 0 &&
              isTarget[0].role === "admin"
            ) {
              return err("LAST_ADMIN") as Result<void>
            }
          }

          yield* sql`
            UPDATE member SET role = ${data.role} WHERE id = ${data.memberId}
          `
          return ok(undefined) as Result<void>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })
