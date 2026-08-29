import { createServerFn } from "@tanstack/react-start"
import { Effect, Exit } from "effect"
import { PgClient } from "@effect/sql-pg"
import { uuidv7 } from "uuidv7"
import { Runtime } from "#/runtime.server"
import { ok, err, type Result } from "#/result-codes"

export type Dish = {
  id: string
  name: string
  course: "soup" | "side" | "main"
  author_username: string | null
}

export const listDishes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Dish[]> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.map(
          sql<Dish>`
            SELECT d.id, d.name, d.course, m.username AS author_username
            FROM dish d
            LEFT JOIN member m ON m.id = d.author_id
            ORDER BY d.course, d.name
          `,
          (rows) => rows as Dish[]
        )
      )
    )
    if (Exit.isSuccess(result)) return result.value
    return []
  }
)

export const addDish = createServerFn({ method: "POST" })
  .validator((data: { name: string; course: "soup" | "side" | "main"; authorId: string }) => data)
  .handler(async ({ data }): Promise<Result<{ id: string }>> => {
    const name = data.name.trim()
    if (!name) return err("DISH_NAME_EMPTY")

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const existing = yield* sql<{ id: string }>`
            SELECT id FROM dish WHERE course = ${data.course} AND name = ${name}
          `
          if (existing.length > 0) return err("DISH_NAME_TAKEN") as Result<{ id: string }>

          const id = uuidv7()
          yield* sql`
            INSERT INTO dish (id, name, course, author_id)
            VALUES (${id}, ${name}, ${data.course}, ${data.authorId})
          `
          return ok({ id }) as Result<{ id: string }>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

export const editDish = createServerFn({ method: "POST" })
  .validator((data: { id: string; name: string }) => data)
  .handler(async ({ data }): Promise<Result<void>> => {
    const name = data.name.trim()
    if (!name) return err("DISH_NAME_EMPTY")

    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const dish = yield* sql<{ course: string }>`
            SELECT course FROM dish WHERE id = ${data.id}
          `
          if (dish.length === 0) return err("DB_UNREACHABLE") as Result<void>

          const conflict = yield* sql<{ id: string }>`
            SELECT id FROM dish
            WHERE course = ${dish[0].course} AND name = ${name} AND id != ${data.id}
          `
          if (conflict.length > 0) return err("DISH_NAME_TAKEN") as Result<void>

          yield* sql`UPDATE dish SET name = ${name} WHERE id = ${data.id}`
          return ok(undefined) as Result<void>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

export const deleteDish = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Result<void>> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          yield* sql`DELETE FROM dish WHERE id = ${data.id}`
          return ok(undefined) as Result<void>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })
