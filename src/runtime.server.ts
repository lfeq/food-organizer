import { ManagedRuntime, Layer, Schedule, Duration, Redacted } from "effect"
import { PgClient } from "@effect/sql-pg"

// Layer.retry at construction is the right level for serverless: each cold Vercel
// invocation builds the layer fresh. Neon Free's 5-minute scale-to-zero means the
// first connection after idle errors; the backoff here absorbs that resume latency.
// Two spellings reach the same database. `STORAGE_DATABASE_URL` is what a
// store connected through Vercel's marketplace flow injects and is the set an
// integration maintains, so it wins; `DATABASE_URL` is what a fresh Deploy
// button provision and `.env.local` give you. Selection is by which key is
// defined, matching scripts/migrate.mjs, whose header carries the full story.
// See https://github.com/lfeq/food-organizer/issues/66
const databaseUrl =
  process.env["STORAGE_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? ""

const PgLayer = PgClient.layer({
  url: Redacted.make(databaseUrl),
  connectTimeout: Duration.seconds(30),
}).pipe(
  Layer.retry(
    Schedule.exponential(Duration.millis(500)).pipe(
      Schedule.upTo(Duration.seconds(60))
    )
  )
)

export const Runtime = ManagedRuntime.make(PgLayer)
