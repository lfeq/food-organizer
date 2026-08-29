import { ManagedRuntime, Layer, Schedule, Duration, Redacted } from "effect"
import { PgClient } from "@effect/sql-pg"

// Layer.retry at construction is the right level for serverless: each cold Vercel
// invocation builds the layer fresh. Neon Free's 5-minute scale-to-zero means the
// first connection after idle errors; the backoff here absorbs that resume latency.
const PgLayer = PgClient.layer({
  url: Redacted.make(process.env["DATABASE_URL"] ?? ""),
  connectTimeout: Duration.seconds(30),
}).pipe(
  Layer.retry(
    Schedule.exponential(Duration.millis(500)).pipe(
      Schedule.upTo(Duration.seconds(60))
    )
  )
)

export const Runtime = ManagedRuntime.make(PgLayer)
