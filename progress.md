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

Issue #18 — Generating a week, and the plan screen.

**Known gaps:**

The route tree (`routeTree.gen.ts`) is auto-generated — running
`npm run generate-routes` regenerates it. CI already runs typecheck which
catches stale route trees at build time.

---

## 2026-08-28 — Accounts: members, roles and password resets (issue #17)

**What was done:**

Full member management: create, reset, remove, promote/demote, login throttling,
and the forced-password-change gate.

- **migrations/0003_accounts.sql** — adds `login_failures int` and
  `login_locked_until timestamptz` to `member` for §7.7 per-account backoff.

- **src/auth.server.ts** — `generateTempPassword()`: 3 CVC syllables joined by
  hyphens (e.g. "bak-fon-rit"). Uses `randomBytes` for entropy. Consonant set
  excludes l (looks like 1), c/j/q/x/y (ambiguous sound). Resolves §17 gap 2.

- **src/auth-fns.ts** — login throttling in `doLogin`: checks `login_locked_until`,
  increments `login_failures` on failure (locks for 5 min after 5 consecutive
  failures, resets effective failures if lock has expired), resets on success.
  New `doChangePassword` server fn: verifies session, updates password_hash, clears
  `must_change_password`, `login_failures`, `login_locked_until`.

- **src/accounts-fns.ts** — five admin-only server fns, each verified against the
  session cookie before acting:
  - `listMembers()` — all members sorted by username.
  - `createMember()` — validates username, generates temp password, inserts with
    `must_change_password=true` and role=member.
  - `resetMemberPassword()` — new temp password, `must_change_password=true`,
    deletes all sessions for that member.
  - `removeMember()` — deletes member (sessions cascade, dishes ON DELETE SET NULL).
  - `setMemberRole()` — app-layer last-admin guard before DB update; DB constraint
    trigger (§5.6 #1, deferrable) is the safety net.

- **src/routes/__root.tsx** — added redirect: members with `must_change_password`
  are sent to `/change-password` for any path except that route itself.

- **src/routes/change-password.tsx** — forced change form with new+confirm
  password fields; sign-out escape hatch.

- **src/routes/accounts.tsx** — admin-only (beforeLoad guard + server-side check).
  Member table with role badge, must-change-password status, and per-row actions:
  promote/demote (disabled with "Last admin" label when only one admin remains),
  reset password (shows temp password once in a monospace reveal modal), remove
  (warns dishes/history are kept). "Add member" shows temp password once after
  creation; modal cannot be dismissed via backdrop until done.

- **src/routes/index.tsx / dishes.tsx** — "Accounts" sidebar item linked to
  `/accounts` for admins.

- **src/__tests__/auth.server.test.ts** — 3 tests: CVC-CVC-CVC shape, unambiguous
  chars only, uniqueness across 20 calls.

- **src/styles.css** — accounts header, members table, role-badge, status-badge,
  temp-password display (monospace, selectable, dashed border), auth-actions row.

**Acceptance criteria check:**

- ✅ Admin-only accounts screen; non-admins redirected away by beforeLoad.
- ✅ Creating a member shows password once — modal cannot be closed until "Done".
- ✅ `must_change_password` gates: root beforeLoad redirects to /change-password.
- ✅ Admin reset: new generated password, must_change_password=true, sessions deleted.
- ✅ Removing a member: sessions deleted via ON DELETE CASCADE; dishes null author.
- ✅ Any admin can promote/demote any member including themselves.
- ✅ At-least-one-admin: app-layer guard returns LAST_ADMIN; DB trigger (§5.6 #1)
  is the enforcement safety net.
- ✅ Last-admin control disabled with "Last admin" label, never hidden.
- ✅ Login throttling: per-account, 5-failure backoff, self-expiring 5-min window.
- ✅ No permanent lockout (window expires automatically).
- ✅ Generated temp password: CVC-CVC-CVC, unambiguous consonants, pronounceable.
- ✅ Both roles have equal rights to catalogue and plans (no change needed).

**What to pick up next:**

Issue #18 — Generating a week, and the plan screen.

## 2026-08-28 — Generating a week, and the plan screen (issue #18)

**What was done:**

- **migrations/0004_weekly_plan.sql** — `weekly_plan`, `plan_day`, `slot` tables per §5.5 schema; `set_updated_at` triggers on all three; all four §5.6 constraint triggers (deferrable initially deferred): plan week_start matches settings.week_start_dow, plan is complete-or-absent (7 days × 3 slots), week_start_dow freezes once a plan exists, and the existing at-least-one-admin trigger is untouched.

- **src/plan-fns.ts** — four server functions:
  - `getPlanSettings()` — returns `week_start_dow` and `timezone` from settings.
  - `getWeekPlan({ weekStart })` — returns the full plan with days and slots, or null.
  - `generateWeek({ weekStart })` — validates writability server-side (derived from `settings.timezone`), checks no empty course, draws 7 dishes per course without replacement (cycling if < 7), deletes any existing plan for the week, inserts plan + 7 days + 21 slots in one transaction (deferred triggers enforce completeness).
  - `getRepeatingCourses({ weeklyPlanId })` — runs the §9.3 SQL to find courses where any dish_name appears more than once.

- **src/routes/plan.$weekStart.tsx** — the plan screen (`/plan/YYYY-MM-DD`):
  - Loader calls `getPlanSettings`, `getWeekPlan`, `getRepeatingCourses`; computes current/next week client-side from settings; marks writability.
  - Today's card on the left (large, green outline, "today" tag); other 6 days compact on right.
  - Elapsed days dimmed but not locked.
  - Past weeks show "read only" badge, no generate button.
  - Empty week shows Generate button.
  - Existing week: "Regenerate" behind confirmation modal.
  - Amber banner per repeating course (§9.3).
  - Error handling: empty-course names the empty courses; WEEK_NOT_WRITABLE message.

- **src/routes/plan.next.tsx** — redirect helper for "Next week" sidebar link.

- **src/routes/index.tsx** — now redirects to `/plan/$weekStart` for the current week (derived from `settings.week_start_dow`).

- **src/routes/dishes.tsx** / **accounts.tsx** — sidebar "Next week" now links to `/plan/next` instead of being disabled.

- **src/styles.css** — plan screen styles: two-column layout, today card with green outline, today tag, compact day cards, repeat-banner (amber), readonly badge.

**Acceptance criteria check:**

- ✅ Migration adds `weekly_plan`, `plan_day`, `slot` per spec DDL. Week identity is `date`, never `timestamptz`.
- ✅ `slot.dish_name` is `NOT NULL` copy; `dish_id` is nullable back-reference.
- ✅ Deferred constraint trigger: plan's `week_start` matches `settings.week_start_dow`.
- ✅ Deferred constraint trigger: every `weekly_plan` has exactly 7 `plan_day` rows and every `plan_day` exactly 3 `slot` rows.
- ✅ Deferred constraint trigger: `settings.week_start_dow` cannot change once any `weekly_plan` exists.
- ✅ Generating writes plan, 7 days, 21 slots in one transaction.
- ✅ Each course drawn independently without replacement (cycling if < 7).
- ✅ No cross-week memory.
- ✅ Empty course refuses the whole operation and names every empty course.
- ✅ Regenerating over existing plan behind explicit confirmation; overwrites in place.
- ✅ Current week derived server-side from `settings.timezone`.
- ✅ Only current and next week writable; earlier weeks refuse writes.
- ✅ Sidebar: "This week" and "Next week" as navigation entries.
- ✅ Today as large card on left; other 6 days compact on right.
- ✅ Today distinguished three ways: own column, green outline, "today" tag.
- ✅ Elapsed days dimmed but not locked.
- ✅ Week with no plan offers Generate.

**What to pick up next:**

Issue #20 — History: browsing past weeks.

---

## 2026-08-28 — Reroll and repeating-week notice (issue #19)

**What was done:**

- Extracted pure generator logic to `src/generator.ts`: `drawN` (Fisher-Yates shuffle
  with cycle for short catalogues) and `pickReroll` (picks unused dish first, falls back
  to full course minus replaced dish, returns `causedRepeat`).
- Refactored `generateWeek` in `plan-fns.ts` to use `drawN` instead of the old biased
  sort-shuffle.
- Added `rerollDay` server fn in `plan-fns.ts`: verifies week is writable server-side,
  loads all week slots, computes candidates per course (dishes not used anywhere in the
  week), falls back to full course minus replaced dish when empty, UPDATEs the 3 slot
  rows in place (respects the `UNIQUE(plan_day_id, course)` constraint and the deferred
  completeness trigger — no delete/re-insert needed).
- Plan route (`plan.$weekStart.tsx`): labeled "↻ Reroll day" button on the featured
  (today/first) card; icon-only "↻" button on each of the 6 compact cards; both visible
  only when `isWritable` (elapsed days in current week keep their control per spec).
  Outcome-triggered toast fires when `causedRepeat` is true; auto-dismisses after 4 s.
- Added CSS for `.plan-reroll-btn`, `.plan-reroll-btn--labeled`, `.plan-toast` with
  slide-in animation.
- 14 unit tests in `src/__tests__/generator.test.ts` covering: empty pool throws;
  drawN at 6/7/8/9 dishes; reroll never returns replaced dish; no repeat while
  candidates remain (8-dish pool); fallback fires and causes repeat at exactly 7 dishes;
  9-dish pool has two candidates, no repeat possible.

**Key notes for next agent:**

- The `dish_name` on `slot` is `citext` (case-insensitive in DB) but compared as
  plain string in TypeScript — safe because names round-trip through the DB unchanged.
- `rerollDay` updates slots IN PLACE (UPDATE, not DELETE+INSERT) to avoid temporarily
  violating the `every plan_day must have exactly three slot rows` constraint trigger.
- Toast state survives `router.invalidate()` because the component is not unmounted
  during a loader reload.

---

## #20 History: browsing past weeks (2026-08-28)

- Added `listPastWeeks` server fn in `plan-fns.ts`: queries `weekly_plan` where
  `week_start < current_week_start` (computed server-side via settings timezone), ordered DESC.
  Returns `{ week_start: string }[]` as a mutable array (spread from readonly sql result).
- Created `src/routes/history.tsx`: sidebar with "History" active, lists past weeks newest-first
  as linked rows (`/plan/$weekStart`). Empty state shows "No past weeks yet."
- Updated `routeTree.gen.ts` to register the `/history` route (import, constants, all interfaces,
  `rootRouteChildren` object).
- Replaced the disabled "History" sidebar item in `plan.$weekStart.tsx`, `dishes.tsx`, and
  `accounts.tsx` with an active `<Link to="/history">` link.
- Added `.history-list`, `.history-list-item`, `.history-week-link` CSS to `styles.css`.
- The plan route already keeps write controls absent (not merely disabled) for past weeks via
  `isWritable` — generate button, reroll buttons, and the regen modal are all gated; no changes
  needed to that route's logic.

**Key notes for next agent:**

- The `listPastWeeks` fn does NOT include the current or next week — only strictly past weeks
  (before today's computed week start). Future agent should not re-query those from here.
- The route tree file (`routeTree.gen.ts`) is auto-generated by the TanStack Router plugin at
  dev-server start. The manually added `/history` entry will be overwritten on the first `npm run dev`
  — the plugin will regenerate it correctly from the new `history.tsx` file. This is expected.
- Bilingual pass (#22, #23) is next — all user-visible strings are currently English-only.

---

## #22 Bilingual infrastructure: string table, cookie, Intl (2026-08-28)

- Created `src/i18n.ts`: `Record<StringKey, { en: string; es: string }>` string table `as const
  satisfies` the entry type — missing a language in either direction is a `tsc` error, not a
  runtime fallback. `LocaleContext` (React context, default `"es"`). `t(locale, key)` translation
  helper. `interpolate(template, vars)` for `{name}` placeholders (~3 lines; flagged for revisit
  if it grows past ~10 per ADR-0001).
- Created `src/locale-fns.ts`: `getLocale` (GET server fn, reads `"locale"` cookie, defaults to
  `"es"`) and `setLocale` (POST server fn with `.validator()`, writes cookie with a 10-year
  max-age, secure in production, `sameSite: lax`).
- Updated `src/routes/__root.tsx`: `beforeLoad` now resolves `getAuthState` and `getLocale` in
  parallel, returning `{ authState, locale }` as route context. Added `component: RootLayout` that
  reads `locale` from route context and wraps `<Outlet />` in `<LocaleContext.Provider>` — locale
  is read once per request from the cookie and passed down through React context, never in module
  state (§12, ADR-0001).
- Updated all four sidebar routes (`plan.$weekStart.tsx`, `dishes.tsx`, `accounts.tsx`,
  `history.tsx`): sidebar nav items and "Sign out" button now use `t(locale, key)`. Each route
  adds an `EN / ES` toggle in `sidebar-bottom` via `handleSetLocale` (calls `setLocale` then
  `router.invalidate()` to re-run `beforeLoad` with the new cookie).
- Updated `src/styles.css`: `.sidebar-bottom` is now a flex column, new `.sidebar-user-row`
  holds username + toggle side by side. `.locale-btn`, `.locale-btn--active`, `.locale-sep`
  styles added.

**Sidebar strings translated (§22 worked example):**
`thisWeek`, `nextWeek`, `dishes`, `history`, `accounts`, `signOut` — Spanish (`es`) is the
active locale by default; English (`en`) via cookie.

**Key notes for next agent (#23 — translate every screen):**

- Add new string keys to `src/i18n.ts` `strings` object; the `satisfies` constraint makes a
  missing locale a build error.
- All routes access locale via `useContext(LocaleContext)` — the context is already provided by
  `RootLayout` in `__root.tsx`.
- The `lang` attribute on `<html>` in `RootDocument` is currently hardcoded `"es"`. It should be
  set dynamically from the locale read in `beforeLoad` when #23 lands.
- Dates in `plan.$weekStart.tsx` (`formatDate`) and `history.tsx` (`formatWeekLabel`) still use
  `"en-US"` locale for `Intl.DateTimeFormat` — update these to use the active locale tag
  (`es-MX` / `en-US`) as part of #23.
