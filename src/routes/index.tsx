import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Effect, Exit, Cause } from "effect"
import { PgClient } from "@effect/sql-pg"
import { Runtime } from "#/runtime.server"
import { ok, err, type Result } from "#/result-codes"

const healthCheck = createServerFn({ method: "GET" }).handler(
  async (): Promise<Result<{ pg: string }>> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.map(sql`SELECT 1 AS n`, () => "connected" as const)
      )
    )
    if (Exit.isSuccess(result)) return ok({ pg: result.value })
    return err("DB_UNREACHABLE", Cause.pretty(result.cause))
  }
)

export const Route = createFileRoute("/")({
  loader: () => healthCheck(),
  component: Home,
})

function Home() {
  const status = Route.useLoaderData()
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Food Organizer</h1>
      <p>
        Database:{" "}
        <strong>{status.ok ? status.data.pg : `error — ${status.code}`}</strong>
      </p>
    </main>
  )
}
