#!/usr/bin/env node
/**
 * Migration runner. Connects on DATABASE_URL_UNPOOLED (direct Neon connection
 * required for DDL) and applies any pending migrations from /migrations.
 * Runs as a build step before vite build.
 */
import pg from "pg"
import { readdir, readFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.env.DATABASE_URL_UNPOOLED
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set — skipping migrations")
  process.exit(0)
}

const client = new pg.Client({ connectionString: url })
await client.connect()

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          serial      PRIMARY KEY,
      name        text        NOT NULL UNIQUE,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `)

  const migrationsDir = join(__dirname, "..", "migrations")
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort()

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
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  }
} finally {
  await client.end()
}
