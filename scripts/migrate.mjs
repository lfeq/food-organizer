#!/usr/bin/env node
/**
 * Migration runner. Connects on DATABASE_URL_UNPOOLED (direct Neon connection
 * required for DDL) and applies any pending migrations from /migrations.
 * Runs as a build step before vite build.
 *
 * This script must NEVER exit 0 without having looked at the database.
 * `vercel.json` runs `npm run migrate && npm run build`, so a soft exit here
 * ships a green deploy whose schema is stale -- the quietest possible way for
 * a broken deploy to reach production. Every path below either applies the
 * pending migrations or exits non-zero. See
 * https://github.com/lfeq/food-organizer/issues/52
 */
import pg from "pg"
import { readdir, readFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Fail before opening a connection: a misconfiguration should not need a
 *  database in reach to announce itself. */
function fail(message) {
  console.error(`Migration failed: ${message}`)
  process.exit(1)
}

// An empty string is a misconfiguration, not an absence -- a trailing `=` in a
// dashboard field lands here, and treating it as "no database" would restore
// the silent skip through the back door.
const url = process.env.DATABASE_URL_UNPOOLED?.trim()
if (!url) {
  if (process.env.DATABASE_URL?.trim()) {
    // The pooled URL is present and the direct one is not. Pointing pg at the
    // pooler instead would fail partway through some later DDL statement, so
    // stop here and name the likely cause.
    fail(
      "DATABASE_URL is set but DATABASE_URL_UNPOOLED is not.\n" +
        "  Migrations need the direct (unpooled) connection: the pooler cannot run DDL.\n" +
        "  On Vercel this usually means the variable is scoped to the wrong environment.\n" +
        "  Check Settings -> Environment Variables and confirm DATABASE_URL_UNPOOLED\n" +
        "  is available to Production builds."
    )
  }
  fail(
    "DATABASE_URL_UNPOOLED is not set.\n" +
      "  This app cannot run without a database, so the build stops here rather\n" +
      "  than deploying green with an unmigrated schema.\n" +
      "  On Vercel: add the Neon integration (Storage -> Neon), which injects\n" +
      "  DATABASE_URL and DATABASE_URL_UNPOOLED for you.\n" +
      "  Locally: copy .env.example to .env.local and fill both in."
  )
}

const migrationsDir = join(__dirname, "..", "migrations")

let files
try {
  files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort()
} catch (err) {
  fail(`could not read ${migrationsDir}: ${err.message}`)
}

// This repo ships its migrations in-tree, so zero of them means a broken
// checkout, not a fresh project. Applying nothing would look identical to
// being up to date.
if (files.length === 0) {
  fail(
    `no .sql files found in ${migrationsDir}.\n` +
      "  This repo commits its migrations, so an empty directory means the\n" +
      "  checkout is incomplete rather than that there is nothing to apply."
  )
}

const client = new pg.Client({ connectionString: url })
await client.connect()

let applied = 0

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          serial      PRIMARY KEY,
      name        text        NOT NULL UNIQUE,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `)

  for (const file of files) {
    const { rows } = await client.query(
      "SELECT 1 FROM _migrations WHERE name = $1",
      [file]
    )
    if (rows.length > 0) continue

    const sql = await readFile(join(migrationsDir, file), "utf8")
    await client.query("BEGIN")
    try {
      await client.query(sql)
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file])
      await client.query("COMMIT")
      console.log(`Applied: ${file}`)
      applied++
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  }
} finally {
  await client.end()
}

// Always say what happened. A silent success cannot be told apart from a run
// that never looked, which is the failure mode this script exists to prevent.
console.log(
  `Migrations up to date: ${applied} applied, ${files.length - applied} already present ` +
    `(latest ${files[files.length - 1]}).`
)
