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

Issue #16 — The catalogue and the seed dishes. Unblocked now that #15 is closed.

---

## 2026-08-28 — Auth and first run (issue #15)

**What was done:**

Full auth seam: migration, password hashing, sessions, setup page, login page,
and a persistent sidebar on the authenticated plan stub.

- **migrations/0002_auth.sql** — all remaining tables from §5.5: `settings`
  (with `display_name text` nullable, resolving the §17 gap), `member`,
  `session`, `dish`, `weekly_plan`, `plan_day`, `slot`. `set_updated_at()`
  triggers on all six mutable tables. Constraint trigger for
  at-least-one-admin (§5.6 #1, deferrable). Trigger for week-start-frozen
  (§5.6 #4). Plan-completeness and plan-alignment triggers deferred to
  tickets #18-19 when they can be integration-tested with real data.

- **src/auth.server.ts** — `hashPassword` / `verifyPassword` with scrypt from
  `node:crypto`. Cost parameters encoded in the hash string so raising them
  later is a rehash on next login. `generateToken` (32 random bytes),
  `hashToken` (SHA-256). All server-only, never bundled to the client.

- **src/auth-fns.ts** — four `createServerFn` exports:
  - `getAuthState()` — called from root route `beforeLoad`; checks if any
    member exists (setupNeeded), reads the session cookie, looks up via
    SHA-256 hash, refreshes the 30-day sliding expiry on each hit.
  - `doSetup()` — one transaction: settings row, first admin (role=admin,
    must_change_password=false), 27 seed dishes authored by that admin,
    session insert; then sets the httpOnly cookie.
  - `doLogin()` — scrypt verify, session insert, cookie set.
  - `doLogout()` — session delete, cookie cleared.
  - Cookies via `getCookie`/`setCookie`/`deleteCookie` from
    `@tanstack/react-start/server`; Secure flag gated on NODE_ENV=production
    so local HTTP dev works.

- **src/routes/__root.tsx** — `beforeLoad` implements the three redirect rules:
  no member → /setup; member exists + no session → /login; authenticated +
  on /setup or /login → /. Auth state returned as route context so child
  routes can access it without an extra round-trip.

- **src/routes/setup.tsx** — one-time setup form (username, password, week
  start, timezone). Can only ever run once (doSetup re-checks in the
  transaction).

- **src/routes/login.tsx** — standard login form.

- **src/routes/index.tsx** — plan stub with the persistent left sidebar:
  instance name at top, nav items (This week active, others disabled until
  built), signed-in member + sign-out button at bottom. Sidebar is admin-aware
  (Accounts item only for admins).

- **src/styles.css** — app layout (sidebar + main-content flex), and
  setup/login card styles. IBM Plex Sans named as primary font per §11.6.

**What to pick up next:**

Issue #16 — The catalogue and seed dishes. Seed dishes already exist in the DB
after setup; this ticket builds the Dishes screen that lets the household
view and edit them.

**Known gaps from this ticket:**

Login throttling (§7.7 per-account backoff) is not implemented. It is listed
in `result-codes.ts` (AUTH_THROTTLED) but no failure counter is written to the
DB yet. Add a `login_failures` column to `member` or a separate table when
ticket #17 (accounts screen) is built.

The forced-password-change flow (must_change_password=true, §7.5) is not yet
implemented. The session and login work, but a member with must_change_password
is not redirected to a change-password screen. Add this when ticket #17 builds
the member management flow.

**Known gap:**

The Deploy Button URL points to `lfeq/food-organizer`. For a self-hoster to
use it, the repo must be public and the button must clone into their account —
both are satisfied by Vercel's "clone" action. Verify on first real deploy that
the Neon integration injects both `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
before the `node scripts/migrate.mjs` build step runs.

---

## 2026-08-28 — Dishes catalogue (issue #16)

**What was done:**

Built the catalogue screen and wired the "Dishes" sidebar link to it.

- **src/dishes-fns.ts** — four `createServerFn` exports:
  - `listDishes()` — SELECT all dishes with LEFT JOIN to member for authorship.
    Returns `Dish[]` sorted by course then name. Empty array on DB failure.
  - `addDish()` — checks uniqueness within course before INSERT; returns
    `DISH_NAME_TAKEN` if a same-course duplicate exists.
  - `editDish()` — looks up the dish's course, checks for a same-course
    duplicate with a different id, then UPDATEs the name.
  - `deleteDish()` — plain DELETE. Slots keep `dish_name` (§5.3 snapshot
    semantics), so no cascade behaviour is needed here.

- **src/routes/dishes.tsx** — three-column catalogue layout (soup / side /
  main), each column with count. Add/edit/delete actions open inline modals
  that keep the catalogue visible behind them. Edit modal states the
  rename-changes-future-plans asymmetry (§11.3 / ADR-0002). Delete modal
  states that past weeks keep the dish. Authorship is shown per row; `null`
  author_id renders as "removed member".

- **src/routes/index.tsx** — "Dishes" sidebar item changed from disabled text
  to a `<Link to="/dishes">`.

- **src/styles.css** — catalogue grid, dish list, dish actions (hover-reveal
  Edit/Delete buttons), add-dish dashed button, modal backdrop + sheet,
  btn-primary / btn-secondary / btn-danger utilities, sidebar nav link.

- **Route tree** regenerated to include `/dishes`.

**Acceptance criteria check:**

- ✅ `dish` table DDL was added in migration 0002 (§5.5): citext name, unique
  (course, name), author_id ON DELETE SET NULL, set_updated_at() trigger.
- ✅ Three course columns with counts; modals, not separate routes.
- ✅ Any member can add, edit, delete.
- ✅ Authorship shown; null author → "removed member".
- ✅ Delete modal: "Past weeks keep this dish — only future plans are affected."
- ✅ Edit modal: rename notice about future plans / past unchanged.
- ✅ Same name in two courses allowed (uniqueness is per course); duplicate
  within a course returns DISH_NAME_TAKEN.
- ✅ 27 seed dishes inserted in doSetup transaction (auth-fns.ts, #15 work).
- ✅ Seed names from SPEC §10, Spanish only.
- ✅ Seeds are ordinary rows — no flag, no separate handling.

**What to pick up next:**

Issue #17 — Accounts: members, roles, password resets, and instance settings.

**Known gaps:**

The route tree (`routeTree.gen.ts`) is auto-generated — running
`npm run generate-routes` regenerates it. CI already runs typecheck which
catches stale route trees at build time.
