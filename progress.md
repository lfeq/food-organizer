# Progress log

## 2026-08-28 — Walking skeleton (issue #14)

**What was done:**

Scaffolded the full project from scratch using `@tanstack/cli create` and then
added all the required seams the spec calls load-bearing conditions:

- **package.json** — `@tanstack/router-plugin` is an explicit direct dependency
  (Vercel framework detector keyed to that exact package name); `effect` pinned
  to exact `3.22.1`; `engines.node >= 22.12`; `build` script runs migrations
  before `vite build`.

- **src/runtime.server.ts** — exactly one `ManagedRuntime` at module scope.
  `PgClient.layer` wraps `DATABASE_URL` as `Redacted`, sets `connectTimeout` to
  30 s, and retries with exponential back-off up to 60 s (covers Neon Free's
  5-minute scale-to-zero).

- **scripts/migrate.mjs** — plain ESM script, connects on
  `DATABASE_URL_UNPOOLED` (Neon reserves direct connections for DDL), applies
  pending migrations from `/migrations/*.sql` in order, records applied names in
  `_migrations`. Exits cleanly (code 0) when the env var is absent so local dev
  without a database does not break.

- **migrations/0001_initial.sql** — `citext` extension, `course` enum
  (`soup → side → main` in declaration order for free sort), `member_role` enum,
  and the shared `set_updated_at()` trigger function.

- **src/result-codes.ts** — typed union of every server-function error code.
  Server functions return `Result<T>` (code, not prose), satisfying §12.5.
  `detail` is `string | undefined` to keep the type serialisable through
  TanStack Start's server-function boundary.

- **src/routes/index.tsx** — trivial health-check server function that runs
  `SELECT 1` through the Effect runtime and renders the result; proves the full
  SSR + database path end to end.

- **vercel.json** — `nodeVersion: "22.x"`, `buildCommand: "npm run build"`.

- **.nvmrc** — `22.12` for local and CI consistency.

- **README.md** — Deploy Button, fork-to-personal warning, Spanish default,
  backup caveat, cold-start warning (all four items the spec §4.2 requires).

- **.github/workflows/ci.yml** — typecheck + vitest run on every push.

- **vitest.config.ts + src/__tests__/result-codes.test.ts** — test runner wired
  up; 3 passing unit tests.

**What to pick up next:**

Issue #15 — Auth and first run (setup screen, login, sessions, forced password
change, seed catalogue). Blocked by #14, which is now closed.

**Known gap:**

The Deploy Button URL points to `lfeq/food-organizer`. For a self-hoster to
use it, the repo must be public and the button must clone into their account —
both are satisfied by Vercel's "clone" action. Verify on first real deploy that
the Neon integration injects both `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
before the `node scripts/migrate.mjs` build step runs.
