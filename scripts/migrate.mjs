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
 *
 * A companion policy, recorded here because there is nowhere better: NO PREVIEW
 * BUILD HAS DATABASE CREDENTIALS, BY DESIGN. Vercel offers no way to stop a
 * fork pull request from deploying (only an authorization gate), so the target
 * was removed instead of the trigger -- Preview is off in the Neon
 * integration's environment scope, leaving `DATABASE_URL` and
 * `DATABASE_URL_UNPOOLED` on Production only. An authorized fork PR build
 * therefore dies right here, in this script, and that red is the intended
 * outcome, not a bug to fix. Do not add a VERCEL_ENV skip to "fix" it, and do
 * not enable Neon preview branching: a copy-on-write branch is still a full
 * copy of production rows handed to a stranger's build.
 * See https://github.com/lfeq/food-organizer/issues/56
 *
 * That scope lives in the Vercel dashboard, in TWO places that must agree --
 * not in `vercel.json`, which is JSON and cannot carry this comment. Both were
 * set by hand; if you are auditing, check both:
 *
 *   1. Storage -> neon-bronze-mirror -> Settings -> "Secure This Resource" ->
 *      Allowed Environments = "Production environment only". (It is NOT under
 *      "Advanced Options"; that name appears in older notes and does not
 *      exist.) Reverting this needs owner permission, so it does not drift by
 *      casual click.
 *   2. Project Settings -> Environment Variables: `DATABASE_URL` and
 *      `DATABASE_URL_UNPOOLED` must read "Production", not "Production and
 *      Preview".
 *
 * Step 2 is NOT implied by step 1, and that is the trap. Restricting the store
 * re-injects the integration's variables under a fresh `STORAGE_*` prefix as
 * Sensitive/Production, and LEAVES THE PRE-EXISTING `DATABASE_URL` PAIR BEHIND,
 * still scoped to Production and Preview, still holding live credentials. The
 * click alone looks done and is not. Re-scoping those two by hand is what
 * finished the job -- and they were editable, contrary to the older note that
 * integration-managed variables are locked (they unlock once the store is
 * Production-only).
 *
 * That prefix is NOT editable, so the project cannot be made to inject the
 * plain names again. It does not need to be: this script and the app now read
 * `STORAGE_DATABASE_URL*` first and fall back to `DATABASE_URL*`. Both
 * spellings are legitimate and reach the same database by two different
 * routes, so neither is a leftover to clean up:
 *
 *   - `STORAGE_*` is what a store connected through Vercel's marketplace flow
 *     injects, and it is the set an integration MAINTAINS. Production is here.
 *     Because the integration owns it, rotating secrets in the Neon store is a
 *     safe click -- which it was not while the code read a hand-made pair the
 *     rotation would not touch.
 *   - The unprefixed pair is what a store provisioned fresh by the README's
 *     Deploy button injects (verified in #55), and what `.env.local` and the
 *     `migrations` CI job use. A forker never sees a prefix.
 *
 * Prefixed wins so that production runs on the maintained set. See
 * https://github.com/lfeq/food-organizer/issues/66
 *
 * The scope facts above still assert nothing -- checking them needs a
 * VERCEL_TOKEN and `ci.yml` may never hold a secret, so they are prose, which
 * is also why they drift. If you are here because they drifted, see
 * https://github.com/lfeq/food-organizer/issues/57. THIS fact is different:
 * the variable names are visible from inside the build, so the log line below
 * names the one it connected on. A deploy that quietly changes route says so.
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

// The same database answers to two spellings; see the header. Selection is by
// which key is DEFINED, not by which holds a usable value, so that an empty
// string stays a misconfiguration rather than falling through to the other
// spelling: a trailing `=` in a dashboard field lands here, and treating it as
// "no database" would restore the silent skip through the back door.
function pick(name) {
  for (const key of [`STORAGE_${name}`, name]) {
    if (process.env[key] !== undefined) {
      return { key, value: process.env[key].trim() }
    }
  }
  return undefined
}

const unpooled = pick("DATABASE_URL_UNPOOLED")
const url = unpooled?.value
if (!url) {
  if (pick("DATABASE_URL")?.value) {
    // The pooled URL is present and the direct one is not. Pointing pg at the
    // pooler instead would fail partway through some later DDL statement, so
    // stop here and name the likely cause.
    fail(
      "A pooled database URL is set but the unpooled one is not.\n" +
        "  Migrations need the direct (unpooled) connection: the pooler cannot run DDL.\n" +
        "  Looked for STORAGE_DATABASE_URL_UNPOOLED, then DATABASE_URL_UNPOOLED.\n" +
        "  On Vercel this usually means the variable is scoped to the wrong environment.\n" +
        "  Check Settings -> Environment Variables and confirm the unpooled URL\n" +
        "  is available to Production builds."
    )
  }
  fail(
    "No unpooled database URL is set.\n" +
      "  Looked for STORAGE_DATABASE_URL_UNPOOLED, then DATABASE_URL_UNPOOLED.\n" +
      "  This app cannot run without a database, so the build stops here rather\n" +
      "  than deploying green with an unmigrated schema.\n" +
      "  On Vercel: add the Neon integration (Storage -> Neon), which injects\n" +
      "  one of those spellings for you -- which one depends on how the store\n" +
      "  was connected, and either is fine.\n" +
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

// Name the source, not the value: this is the only part of the two-spelling
// story that is observable from inside a build, so a silent change of route
// shows up in the deploy log instead of being discovered by a rotation.
console.log(`Connecting on ${unpooled.key}`)

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
