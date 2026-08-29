# Implementation spec — self-hostable weekly meal planner

**Status:** in progress. Walking skeleton (§13 steps 1–3) is complete as of
2026-08-28. Every decision below was settled on the wayfinder map
[Map: self-hostable weekly meal planner](https://github.com/lfeq/food-organizer/issues/1)
and its seven tickets. This document is the handoff: an agent should be able to
build the app from it without reopening the tickets.

**Build progress:**
- [x] §13 step 1 — Walking skeleton: TanStack Start app, SSR, Deploy Button
- [x] §13 step 2 — Effect runtime seam: ManagedRuntime, PgClient with retry
- [x] §13 step 3 — Migrations: runner + first migration (citext, enums, trigger)
- [ ] §13 step 4 — Auth and first run
- [ ] §13 step 5 — Catalogue
- [ ] §13 step 6 — Generating
- [ ] §13 step 7 — Plan screen
- [ ] §13 step 8 — Regenerating and repeating-week
- [ ] §13 step 9 — History
- [ ] §13 step 10 — Accounts
- [ ] §13 step 11 — Bilingual pass

**How to read it.** Sections state decisions, not options. Where a heading is
marked **Derived**, the content is mechanical fill-in written while assembling
this spec — consistent with everything decided, but never put to the household,
so it is the safe place to push back. Anything not marked is a settled decision,
and changing it means reopening the ticket named in §18.

**Read first:** [`CONTEXT.md`](CONTEXT.md) is the domain glossary and the source
of every noun used here (`Dish`, `Course`, `Member`, `Weekly plan`, `Week
start`, `Plan day`, `Slot`, `Repeating week`, `Seed catalogue`, `Locale`). Use
its vocabulary in code, tests and commits. Two ADRs carry reasoning that will
otherwise look wrong to a reader: [ADR-0001](docs/adr/0001-hand-rolled-bilingual-ui.md)
and [ADR-0002](docs/adr/0002-slots-snapshot-the-dish-name.md).

---

## 1. What the app is

A weekly meal planner for **one household**, self-hosted by that household.

It answers one question at a glance — *what are we eating today* — and one
weekly chore: *decide the week's midday meals without arguing about it*. The
household keeps a shared catalogue of dishes it knows how to cook; the app draws
a week from that catalogue at random.

Scope, fixed while charting and not open for reinterpretation:

- **The midday meal only.** Three courses — soup, side, main — seven days a week.
  Breakfast and dinner are eaten separately and are out of scope.
- **One instance is one household.** No household entity, no tenancy, no scoping
  column. You host yours, I host mine.
- **One shared catalogue**, with authorship recorded but no per-member ownership:
  every member can add, edit and delete any dish.
- **Plans are saved**, one per week, with browsable history.

The target reader of the repo is a non-professional who clones it and deploys
their own copy. **Self-hosting is a first-class constraint**: a decision that
adds a manual setup step for that person is a worse decision, all else equal.
In particular there is **no email provider**, by choice — which is why there is
no self-service password recovery anywhere in this spec.

---

## 2. The standing constraints

Every section below is downstream of these five. Where a build detail is
underspecified, resolve it in the direction these point.

1. **Steps between `git clone` and a working instance are the currency.** Two
   accounts (GitHub, Vercel), one click, one in-app form. No hand-copied secret,
   no third service.
2. **No email.** No verification, no magic link, no reset by mail. The admin is
   the recovery mechanism.
3. **Nothing stored is ever localised.** Locale lives between the server and one
   browser for the duration of one render. UI copy has a locale; household data
   does not.
4. **Code, issues, commits and documentation are English-only.** The *UI* is
   bilingual. Dish names are Spanish because the household types them in
   Spanish, not because they are UI copy.
5. **A weekly plan is history.** Once generated it holds its own copy of what
   came out. Nothing done to the catalogue afterwards may rewrite what a past
   week says the household ate.

---

## 3. Stack

**TypeScript on the Effect ecosystem: TanStack Start + `@effect/sql-pg`,
Postgres on Neon via the native Vercel Marketplace integration, deployed to
Vercel Hobby behind a Deploy Button.**

| Layer | Choice |
| --- | --- |
| Language | TypeScript, Node **>= 22.12** (pin the Vercel runtime) |
| Framework | TanStack Start (React), SSR + server functions |
| Effect | `effect@3.22.x`, **pinned exactly** |
| Database access | `@effect/sql-pg` (depends on `pg`/node-postgres) |
| Database | Postgres on Neon Free, provisioned through Vercel Marketplace |
| Hosting | Vercel Hobby |
| Auth | Owned by the app: `node:crypto` scrypt + opaque session tokens |
| i18n | Hand-rolled `as const` record + `Intl`. No library. |

### 3.1 Five load-bearing conditions

These are not style preferences. Each has a failure mode that is silent or
undiagnosable, and each was found by fact-checking rather than by building.

1. **Pin `effect@3.22.x`. Do not adopt the v4 RC.** Effect 4 replaces the `pg`
   driver with a hand-written Postgres wire protocol including its own TLS and
   SCRAM-SHA-256 (PR Effect-TS/effect#7426, merged 2026-08-25). Pointing a
   from-scratch codec at Neon's PgBouncer over TLS is exactly where such a
   rewrite fails, in ways an upstream suite running against plain Postgres will
   not catch.
2. **Depend on `@tanstack/router-plugin` by name in `package.json`.** Vercel's
   framework detector matches that exact package. A project that depends only on
   `@tanstack/react-start` (which pulls it in transitively) falls back to the
   generic Vite preset and ships a **client-only static build** — no SSR, no
   server functions, and no error saying why.
3. **`connectTimeout: Duration.seconds(30)`, and wrap the client layer in
   `Effect.retry` with backoff.** `@effect/sql-pg` eagerly runs `SELECT 1` when
   the layer is built, with a 5-second default timeout, straight into Neon
   Free's non-disableable 5-minute scale-to-zero. The failure mode is a family
   seeing an error page after a quiet afternoon.
4. **Exactly one `ManagedRuntime`, built at module scope in a `.server.ts`
   file.** Never call `Effect.provide` with the `PgClient` layer inside a request
   handler: in Effect v3 each `Effect.provide` gets its own memoization scope, so
   two overlapping provides silently build the layer twice — two connection
   pools. The `.server.ts` suffix is what TanStack Start's import protection keys
   off to keep the runtime out of the client bundle.
5. **Migrations run on `DATABASE_URL_UNPOOLED`; runtime uses `DATABASE_URL`.**
   Neon reserves direct connections for schema migration. Both variables are
   injected by the integration, so this costs the self-hoster nothing — but
   getting it backwards produces an undiagnosable failure.

Also settled and worth knowing: `PgClient.listen`/`notify` do **not** work over
a pooled connection, so do not build on them. Vercel Hobby's function duration
is 300s, not 60s. Never add `@effect/schema` — it is deprecated and merged into
`effect`; use `Schema` from `effect`.

### 3.2 Costs the household accepted knowingly

Do not re-litigate these mid-build; they were accepted with the facts in hand.

- **TanStack Start is a Release Candidate.** Breaking changes ship inside minor
  releases and are invisible in the release notes — v1.133.2 quietly raised the
  required Vite peer from `>=6` to `>=7`, and none of ~500 recent release bodies
  contain the word "breaking".
- **Effect 4 will not end the churn.** Its migration guide keeps `sql`, `schema`,
  `http` and `rpc` under `effect/unstable/*`, which by its own definition breaks
  in minors.
- **The combination is early.** No official integration exists in either
  direction; the runtime-lifecycle glue is ours. Budget for it.
- **AI coding assistance is measurably weaker on Effect** than on mainstream
  alternatives. The household's stated reason for accepting Effect's learning
  curve is that an agent writes the code, so this cost lands on that reasoning.
  If implementation stalls, look here first.

**Upgrade rule:** bump deliberately, one satellite minor at a time, reading the
changelog. Not "never bump" — a repo that goes stale meets every accumulated
breaking change at once. For a `0.x` dependency a caret range is narrower than
it looks (`^0.97.1` will not accept `0.98.0`), so routine updates cannot pull a
breaking satellite minor on their own.

### 3.3 Rejected, with the reason

- **Next.js** — rejected by the household on taste. The hosting half of the
  decision does not depend on it.
- **`@effect/platform` HttpApi backend + a separate React SPA** — the most
  Effect-idiomatic option. Rejected because two deployables replace one Deploy
  Button with configuring two services and the CORS between them.
- **SQLite on Fly.io or Railway** — data-loss traps, §4.3.
- **Supabase** — reconsidered during the auth ticket and declined, §7.8.

---

## 4. Deployment and the self-hosting path

### 4.1 What the self-hoster does

1. Sign in to Vercel with GitHub.
2. Click the **Deploy Button** in the README. This clones the repo into their
   account and creates the Vercel project.
3. Add the database: Vercel dashboard → Storage → Neon (Free), or
   `vercel install neon --plan free`. The integration injects `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED`, `PG*` and `POSTGRES_*` into the project.
4. Redeploy.
5. Open the app and complete the **first-run setup screen** (§7.4): create the
   admin account, confirm the week start, seed the catalogue.

Two accounts. **No secret is ever typed or copied.** There is no
`SESSION_SECRET`, no `ADMIN_PASSWORD`, no setup token — §7.3 explains why that
is a decision rather than an omission.

### 4.2 What the README must say

- **Fork into a personal GitHub account, not an organisation.** Vercel Hobby
  cannot connect to org-owned repositories. One line here prevents a dead end.
- The default UI language is **Spanish**; there is a toggle in the sidebar.
- **Backups are the household's problem.** An in-app data export is worth more
  here than any provider feature — §16.
- The first load after a quiet period is slow (Neon cold start). This is normal.

### 4.3 Why not the alternatives (recorded so nobody reopens it)

- **Vercel has no first-party Postgres.** Vercel Postgres *was* Neon underneath
  and was transitioned to Neon's own Marketplace integration in Q4 2024 – Q1
  2025. Vercel's storage line-up today is Blob, Global Config and third-party
  Marketplace databases.
- **Railway deletes stateful volumes 30 days after trial credits expire** (their
  docs, verbatim). A household that deploys on the trial, uses the app for a
  month and does not upgrade loses its catalogue and history on a clock it never
  saw.
- **Fly.io volumes are a single copy on a single machine**, and a deploy that
  creates new machines gives them new, *empty* volumes — the app looks wiped
  while the real data sits on an orphaned volume. Fly also has no free
  allowance.
- **SQLite on Vercel is impossible**: no persistent disk, immutable
  per-deployment bundles.
- Provisioning Neon or Supabase **on their own site** adds a third account and a
  hand-copied connection string, with a pooled-vs-direct choice that produces a
  meaningless error when it is wrong.

### 4.4 Neon Free, operationally

- Compute suspends after **5 minutes** idle and **this cannot be disabled**. It
  resumes on the next connection with no human involved. Hence condition 3; the
  login screen must not look broken while it waits.
- Data is preserved across suspension; inactive projects are not deleted.
- Past 0.5 GB the database refuses writes — loud and recoverable, not silent.
- **Migrations run on deploy** (a build step), so the self-hoster's step count
  stays at zero.

### 4.5 Unverified — first-deploy observations, not blockers

None of these change a decision. Confirm them on the first real deploy and write
down what you find.

- Whether a Neon cold start **errors** or merely stalls the first connect (Neon's
  docs do not say; the retry in condition 3 assumes it can error).
- How Vercel reconciles the framework preset's `outputDirectory: dist` with
  Nitro's `.vercel/output` Build Output API emission.
- Whether `pg-cursor` streaming survives PgBouncer transaction mode.
- Supabase's free-plan pausing policy, left unverified in research. Only matters
  if anyone reopens §7.8.

**Do not clone Vercel's `examples/tanstack-start` template.** Last touched
2026-05-11, pins `@tanstack/react-start@1.133.37` (~35 minors stale) and depends
on `nitro@3.0.1-alpha.0`. Generate a fresh app on current versions and rely on
auto-detection, which is independent of that example.

---

## 5. Data model

Seven tables, two enums, one shared `updated_at` trigger, four constraint
triggers. Full reasoning is on the schema ticket; the parts that will look wrong
to a reader are ADR-0002 and §5.3.

### 5.1 The base entity

Every table **except `session`** carries `id uuid` + `created_at timestamptz` +
`updated_at timestamptz`.

- **UUIDv7, generated in TypeScript**, not in Postgres. v7 is time-ordered, so
  the primary-key index does not fragment and `ORDER BY id` approximates
  `ORDER BY created_at`. Generating app-side hands the row its id before insert,
  keeps the Effect schema the owner of identity, and sidesteps Neon's Postgres
  version — `uuidv7()` is a Postgres 18 builtin and Neon still serves 17 by
  default.
- **`updated_at` is maintained by one shared trigger**, `set_updated_at()`, not
  by application code. Application code forgets, and migrations and manual SQL
  bypass it unconditionally.
- **`session` is exempt.** Its identity is the SHA-256 of the opaque token, so a
  second UUID would be a second identity for the same row. It keeps `created_at`
  and `expires_at`; the sliding expiry is a write to `expires_at`, which is not
  an "update" in the audit sense.

### 5.2 Two kinds of time

This model holds **instants** and **civil dates**. Conflating them is the classic
calendar bug and this app is unusually exposed to it.

| | Type | Stored as | Rendered as |
| --- | --- | --- | --- |
| `created_at`, `updated_at`, `session.expires_at` | instant | `timestamptz` | browser-local |
| `weekly_plan.week_start`, `plan_day.day_date` | civil date | `date`, no timezone | as written |

A week's identity is not an instant. "The week of March 1st" is the same week
for everyone; storing it as `timestamptz` is how a plan appears to flip to the
next week at 6pm Sunday depending on offset.

The one thing that genuinely needs a timezone is the server's answer to **"what
week is it now?"**, because "only the current and next week are writable" is an
*authorization* rule and the server cannot ask the browser what day it is
without letting anyone rewrite history. Hence `settings.timezone`, defaulting to
`America/Mexico_City`. The server computes
`(now() at time zone settings.timezone)::date`. It is not a deploy-time env var
and it does not affect rendering — instants still render in browser-local time.

### 5.3 Slots snapshot the dish name

`slot.dish_name` is a copied, `NOT NULL` value. `slot.dish_id` is a nullable
`ON DELETE SET NULL` back-reference that **no rule depends on**. Deleting a dish
is a real `DELETE`; there is no soft delete anywhere in this schema.

The alternative — an FK plus a `deleted_at` tombstone — satisfies deletion but
not **renaming**: fixing a typo would silently rewrite what a plan from three
months ago says the household ate. It also spreads `WHERE deleted_at IS NULL`
across every catalogue and generator query, the clause that is forgotten exactly
once and then wrong forever.

**Repeat detection compares `dish_name`, never `dish_id`** (§9.3). This is
load-bearing: if a dish has since been deleted, both slots hold `NULL`, and
`NULL = NULL` is not true in SQL, so a repeating week would stop reporting
itself the moment someone tidied the catalogue, with nothing about the plan
having changed. See ADR-0002.

### 5.4 `course` and `member_role` are Postgres enums

`course` is exactly three values a user can never edit; a lookup table is
ceremony for that, and if it ever *became* editable it would break "the
catalogue is three disjoint lists" and "a plan day holds three slots" — not an
extension worth making cheap. The enum gives the type a real name that
`@effect/sql-pg` maps to a literal union, and **declaration order gives the
display order** (soup → side → main) for free. Accepted cost: adding a value to
a Postgres enum is easy; removing or reordering one is not.

### 5.5 The schema

```sql
create extension if not exists citext;

create type course      as enum ('soup', 'side', 'main');
create type member_role as enum ('admin', 'member');

create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Exactly one row, created by the first-run setup screen (§7.4).
create table settings (
  id              uuid        primary key,
  singleton       boolean     not null default true unique check (singleton),
  week_start_dow  smallint    not null default 0 check (week_start_dow between 0 and 6),
  timezone        text        not null default 'America/Mexico_City'
                              check (now() at time zone timezone is not null),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table member (
  id                    uuid        primary key,
  username              citext      not null unique check (length(trim(username)) > 0),
  password_hash         text        not null,  -- scrypt, encoded with its salt and params (§7.1)
  must_change_password  boolean     not null default true,
  role                  member_role not null default 'member',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table session (
  token_hash  bytea       primary key check (octet_length(token_hash) = 32),  -- sha256(token)
  member_id   uuid        not null references member (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index session_member_id on session (member_id);

create table dish (
  id          uuid        primary key,
  name        citext      not null check (length(trim(name)) > 0),
  course      course      not null,
  author_id   uuid        references member (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (course, name)
);
create index dish_author_id on dish (author_id);

create table weekly_plan (
  id          uuid        primary key,
  week_start  date        not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table plan_day (
  id              uuid        primary key,
  weekly_plan_id  uuid        not null references weekly_plan (id) on delete cascade,
  day_date        date        not null unique,   -- globally unique: weeks never overlap
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (weekly_plan_id, day_date)
);

create table slot (
  id           uuid        primary key,
  plan_day_id  uuid        not null references plan_day (id) on delete cascade,
  course       course      not null,
  dish_name    citext      not null,             -- snapshot; the identity for repeat detection
  dish_id      uuid        references dish (id) on delete set null,  -- reference only
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (plan_day_id, course)                   -- three slots per day, one per course
);
create index slot_dish_id on slot (dish_id);
```

`set_updated_at()` is attached to all six of `settings`, `member`, `dish`,
`weekly_plan`, `plan_day` and `slot`:

```sql
create trigger <table>_set_updated_at before update on <table>
  for each row execute function set_updated_at();
```

### 5.6 The four constraint triggers

These express invariants spanning rows or tables, which a `CHECK` cannot. All
are `deferrable initially deferred`, so a legitimate multi-statement transaction
— swapping the admin role, generating a whole week — is not rejected halfway
through.

1. **At least one admin.** `after update or delete on member`: raise if
   `not exists (select 1 from member where role = 'admin')`.
2. **A plan's week start matches the setting.** `after insert or update on
   weekly_plan`: raise unless
   `extract(dow from week_start) = (select week_start_dow from settings)`.
   Cross-table, so it cannot be a `CHECK`; with the freeze below, a misaligned
   week becomes unrepresentable.
3. **A plan is complete or absent.** `after insert or update or delete on
   plan_day and slot`: raise unless every `weekly_plan` has exactly seven
   `plan_day` rows and every `plan_day` exactly three `slot` rows. This is the
   database-level statement of "no empty or half-filled plans"; deferral is what
   makes it compatible with generating in one transaction.
4. **The week start freezes.** On `settings`: reject a change to
   `week_start_dow` when `exists (select 1 from weekly_plan)`.

### 5.7 Deliberately absent

- **No `Household` table.** One instance is one household.
- **No locale column.** Locale is a cookie; nothing stored is localised.
- **No `seeded` flag on dishes.** The 27 seed dishes are ordinary rows authored
  by the first admin.
- **No writable-week column.** "Current and next week only" is derived from
  `week_start`, `settings.timezone` and `now()`, enforced in the server
  function. Storing it would go stale every week.
- **No repeating-week column.** It is a query over the plan (§9.3), so a reroll
  changing the answer needs no write.
- **No retention policy.** Nothing deletes a `weekly_plan`; history is
  unbounded. See §15.

---

## 6. Weeks, and which ones are writable

### 6.1 Week start

`settings.week_start_dow` holds `0..6` on Postgres's `dow` convention
(0 = Sunday, matching JS `Date.getDay()`), **defaulting to `0` — Sunday**. The
household is Mexican, where the civil week starts on Sunday.

It is chosen by the admin and **frozen once the first `weekly_plan` exists**: a
stored week means "the seven days beginning at the week start in force when it
was created", so changing it later would leave every historical week misaligned
and overlapping. The admin screen lets it change freely until then, and shows it
read-only afterwards **with the reason**. Migrating history on change was
considered and rejected as far too much machinery for a setting touched once.

The week start is **not** locale-derived. One instance is one household, so
everyone sees the same seven days in the same order regardless of UI language.
`Intl` formatting simply receives the offset.

### 6.2 Which weeks may be written

- **Current and next week only.** Both are fully generable and regenerable.
- **Earlier weeks are read-only history.** Nothing rewrites them.
- **Elapsed days of the current week are not locked.** Only past *weeks* freeze.
  Wednesday's reroll still works on Friday — day-level locking would put a clock
  in the domain for no benefit to a household.
- The week picker's range is capped accordingly: the sidebar offers **This week**
  and **Next week**, and history is read-only.

Every write path re-derives the current week server-side from
`settings.timezone`; a week identifier arriving from the client is validated,
never trusted.

---

## 7. Members, passwords and sessions

Auth is **owned by the app** on the same Neon Postgres. No external auth service,
no new account for the self-hoster, and no secret they must set.

### 7.1 Hashing

**`scrypt` from `node:crypto`.** Cost parameters are encoded alongside each hash,
so raising them — or moving to Argon2id later — is a rehash on next login, not a
migration.

Argon2id via `@node-rs/argon2` was rejected on **deployment risk, not
cryptographic merit**: it is a native module needing an explicit bundler
externalisation entry, with open issues in multiple frameworks where the bundler
cannot resolve its `wasm32-wasi` variant. Our stack is an RC framework on
Vite/Nitro whose glue we already own. A self-hoster hitting a build error is a
total failure of the one-click story, and the marginal GPU-resistance of
Argon2id is not what protects a family meal planner — password quality is.

### 7.2 Sessions

An **opaque token in the `session` table**, not a signed cookie and not a JWT.

- 32 bytes from `crypto.randomBytes`, stored **hashed** (SHA-256) against the
  member and an expiry.
- Delivered in an **httpOnly, Secure, SameSite=Lax** cookie.
- **30-day sliding expiry**, refreshed on use. A household that opens the app
  weekly never sees a login screen again.
- Every request does one indexed lookup, against a database we are querying
  anyway.

Revocation is therefore a `DELETE`, and four flows fall out for free: logout,
log-out-everywhere, sessions dying on an admin password reset, and sessions
dying when a member is removed (`ON DELETE CASCADE`). That is what makes the
admin-resets-a-password flow actually safe.

### 7.3 The secret the self-hoster must set: none

This is the point of opaque tokens over signed cookies, and it is downstream of
the standing preference in §2.

A signed-cookie approach needs a `SESSION_SECRET`. If the self-hoster does not
set it we must either refuse to boot (a dead deploy) or generate one per
instance — which silently logs everyone out on every redeploy, the worst of the
three because it presents as a bug rather than as configuration. Opaque tokens
delete the question.

### 7.4 First run

While **no member exists**, every route redirects to a one-time setup page. No
`ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, no setup token.

Setup does four things in one transaction:

1. Creates the `settings` row (week start, defaulting to Sunday; timezone,
   defaulting to `America/Mexico_City`).
2. Creates the **first admin** from a username and password typed on the page.
   `must_change_password` is `false` — they just chose it.
3. Inserts the **27 seed dishes** (§10), authored by that admin.
4. Signs them in.

Residual risk, accepted: a window of minutes between deploy and setup, on a URL
nobody else knows. That was weighed against making the self-hoster paste
anything at all.

### 7.5 Creating members, temporary passwords, resets

- The admin creates a member; **the app generates the password and shows it on
  screen once**. There is no email, so the admin reads it out or messages it.
- **Change on first login is forced**: while `must_change_password` is true the
  member cannot reach any app screen until they set their own password. The same
  path runs after an admin reset. Without this, a password the admin pasted into
  a chat app stays valid forever.
- An admin reset sets a new generated password, sets `must_change_password`, and
  **deletes that member's sessions**.
- Removing a member deletes their sessions, leaves their dishes with
  `author_id = NULL` (shown as "removed member"), and leaves the weeks they
  generated untouched.

### 7.6 Identity and roles

- **Username**: `citext`, unique case-insensitively, lowercase-normalised on
  input. Letters, digits, `-`, `_`; no spaces. Confusable names matter more in a
  shared household than anywhere else. Note `citext` folds **case only, not
  accents**: "Sopa" and "sopa" collide; "Fideo" and "Fideó" do not.
- **Password**: minimum **8 characters**. No composition rules, no expiry.
  Composition rules produce worse passwords and would be hostile to someone who
  just wants to see what is for lunch.
- **Any number of admins, never fewer than one.** Any admin may promote or
  demote any member, including another admin and themselves — this is a
  household, there is no hierarchy to defend. The floor is enforced in the
  database (§5.6 trigger 1), because with no email a zero-admin instance cannot
  reset a forgotten password and is unrecoverable short of hand-editing
  Postgres. The UI disables the control **with the reason shown** when you are
  the last admin.
- Both roles have identical rights over the catalogue and over plans. The admin
  role covers account management only.

### 7.7 Login throttling

**Per-account backoff**: track consecutive failures on the member; after ~5,
refuse for a short, self-expiring window. No permanent lockout an attacker can
trigger.

**IP-based limiting is rejected outright**: the whole household shares one home
IP, so one member fat-fingering their password would throttle the entire family.

### 7.8 Supabase: considered, declined

Raised as "does Supabase not give us Postgres plus better authentication?" It
gives the first and not the second.

- The deployment objection was **wrong and is withdrawn**: Supabase's native
  Vercel Marketplace integration is the same one-click shape as Neon's.
- **Supabase Auth has no username identifier.** `signInWithPassword` takes an
  email or a phone number. Username login means fabricating
  `name@something.local` addresses and mapping to them in our own table — a fake
  layer permanently in the model, to reach a login mode we would have written
  ourselves anyway.
- **Supabase Free pauses a project after 1 week of inactivity**, restorable
  self-service for 90 days. Neon Free only suspends *compute* after 5 minutes
  and resumes on the next connection with no human involved. A household that
  plans a week and then takes a holiday would hand its admin a manual un-pause
  step.

The flows Supabase Auth is genuinely better at — magic links, OAuth, email
recovery, MFA — are all out of scope on this map.

---

## 8. Authorization matrix — **Derived**

Mechanical consequence of §6.2 and §7.6, written out so the implementer does not
have to re-derive it per route.

| Action | Who | Extra condition |
| --- | --- | --- |
| First-run setup | anyone | only while no member exists |
| Log in / out | anyone | per-account backoff (§7.7) |
| Change own password | any member | forced while `must_change_password` |
| View plan, history, catalogue | any member | — |
| Add / edit / delete a dish | any member | — |
| Generate a week | any member | target is current or next week |
| Regenerate a day | any member | day's week is current or next |
| Create member, reset password, remove member, change roles | admin | never below one admin |
| Change week start | admin | only while no `weekly_plan` exists |
| Change timezone | admin | — |

A member with `must_change_password` reaches exactly two things: the
change-password screen and logout.

---

## 9. Generating and regenerating

### 9.1 Generating a week

Draw one dish per course per day: three independent draws of seven,
**without replacement within the course**, so generating never repeats a dish
within the week as long as that course holds at least seven dishes.

- **Generating has no memory.** What came out last week does not influence this
  week.
- **An empty course refuses the whole operation**, naming the empty courses
  ("Add at least one side before generating"). A slot therefore always holds a
  dish; there is no empty-slot state anywhere in the model, the screens or this
  spec. The seed catalogue makes this rare, but a household can still delete its
  way to an empty course.
- **A course below seven repeats as needed** — there are not enough dishes to go
  round. This is announced by the banner in §9.3, not refused.
- **Generating over an existing plan is offered behind an explicit
  confirmation** stating the current plan is replaced. It overwrites **in
  place**: no version history, no second plan for that week.
- The plan, its seven `plan_day` rows and its twenty-one `slot` rows are written
  **in one transaction** — required by constraint trigger 3 and by "complete or
  not at all".

### 9.2 Regenerating a day

Redraw **all three courses** for one plan day.

Per course, the candidate set is: **dishes of that course not used elsewhere in
that week**, which necessarily excludes the dish being replaced (it is used, in
this day). Two consequences the household relies on:

- No within-week duplicate is ever introduced while alternatives remain, so the
  without-replacement promise holds for the week as a whole, not just for the
  initial draw.
- The button always visibly does something: it cannot hand back the dish it just
  replaced.

There is no separate "pool" that regenerating draws down. **Each regeneration
recomputes against the week as it currently stands**, so repeated regenerations
cannot drift into duplicates.

**When the candidate set is empty, it falls back to the whole course**,
excluding only the dish being replaced — it does **not** refuse. Refusing would
make the app's most-used control dead on arrival on a small catalogue. Swapping
with another day was also rejected: it preserves the no-repeat promise at any
catalogue size but silently changes a second day nobody asked about, and
reroll's contract is **"this slot changes, nothing else does"**.

So **regenerating may repeat**, and the app says so — §9.3.

The candidate count is exactly `dishes_in_course − 7`, which is why the seed
catalogue is nine and not seven:

| Per course | Generating | Regenerating |
| --- | --- | --- |
| 7 | no repeats | every reroll repeats |
| 8 | no repeats | one candidate — rerolling twice returns the original |
| 9+ | no repeats | real choice |

### 9.3 Repeating week

A repeat is a **property of the plan**, not of the catalogue: *does this week
hold the same dish twice in one course?* Not *does this course hold fewer than
seven dishes?*

This is the load-bearing framing. Computed from the week itself it is correct
for every cause — a short catalogue, an exactly-seven catalogue, or a reroll —
and a week can *become* repeating after it was generated, which is exactly what
rerolling into a repeat does. A predicate over the catalogue is fixed at
generate time and cannot express that.

```sql
-- which courses repeat this week
select s.course
from slot s join plan_day d on d.id = s.plan_day_id
where d.weekly_plan_id = $1
group by s.course, s.dish_name
having count(*) > 1;
```

Comparison is on `dish_name` (§5.3, ADR-0002).

**How it is said:**

- **A banner on the plan, one line per repeating course, naming no dish**, and
  pointing at the fix: "Soups repeat this week — add more dishes." Naming the
  dish, or marking the offending slot, frames an expected consequence of a small
  catalogue as a fault in one particular day.
- **No per-slot repeat markers.** This settles the conflict with the design
  canvas, which drew inline `↻2×` markers, **against** the canvas.
- **A toast on the reroll that causes a repeat**, outcome-triggered: it fires
  when the dish the reroll landed on is already elsewhere in that week — not
  merely when the fallback ran, since the fallback can still land on an unused
  dish. The toast is the causal link; the banner is the standing state. Without
  it the banner materialises one reroll later with nothing connecting it to the
  button that was pressed.

---

## 10. The seed catalogue

**27 dishes, nine per course**, inserted once at setup, authored by the first
admin. Nine is the smallest catalogue where both generating and regenerating
behave as expected on day one (§9.2).

Afterwards a seeded dish is an ordinary catalogue entry in every respect —
editable, deletable, indistinguishable from one the family adds. **No `seeded`
flag**, because a second kind of dish would have to be handled by every screen
and query to save one household one afternoon of deleting.

**Spanish names only.** A dish name is a proper name the family says out loud,
not UI chrome: *pozole* stays *pozole* in an English UI. This is the boundary the
whole i18n design rests on — chrome is translated, household data is not.

### The 27 names — **Derived**

Everyday Mexican household cooking. These are a starting catalogue, not a
statement about the household's taste: they exist so a fresh instance can
generate a sensible first week, and the household is expected to edit them.
**Swap freely** — the only hard requirements are nine per course and names
unique within a course.

**Soups (`soup` — "sopa")**

1. Sopa de fideo
2. Caldo de pollo
3. Sopa de lentejas
4. Crema de calabaza
5. Sopa de tortilla
6. Caldo tlalpeño
7. Sopa de verduras
8. Sopa de elote
9. Consomé de res

**Sides (`side` — "guarnición")**

1. Arroz rojo
2. Frijoles de la olla
3. Ensalada de nopales
4. Papas con chorizo
5. Calabacitas a la mexicana
6. Arroz blanco con elote
7. Ensalada verde
8. Puré de papa
9. Chayotes al vapor

**Mains (`main` — "plato fuerte")**

1. Milanesa de res
2. Pollo en mole
3. Tinga de pollo
4. Albóndigas en chipotle
5. Chiles rellenos
6. Bistec a la mexicana
7. Cochinita pibil
8. Pescado empapelado
9. Tortitas de papa

---

## 11. Screens and navigation

Four screens and no more: **plan**, **dishes**, **history**, **accounts**.
Accounts is admin-only. Decided from a prototype rather than from prose; the
losing variants and the phone-first round remain on the
[`prototype/screens`](https://github.com/lfeq/food-organizer/tree/prototype/screens)
branch (`prototypes/screens-web/index.html?variant=W1` is the chosen one) as the
primary source. **Only the decisions below are binding.**

**Web first, at desktop width.** The phone layout is deliberately deferred
(§15); W1 was chosen partly because it degrades to one column gracefully.

### 11.1 Navigation

A persistent left **sidebar** on every screen:

- instance name at the top,
- **This week · Next week · Dishes · History · Accounts** (Accounts admin-only),
- the signed-in member and the **`EN / ES` toggle** pinned at the bottom.

Nothing is more than one click from anywhere. No tabs, no drawer, no hamburger.

**Week switching lives in the sidebar as its own entry**, not as a control on
the plan: "show me next week" is navigation, not an edit to the week you are
looking at.

### 11.2 The plan (the front door)

Two columns.

- **Today is a large card on the left**, showing all three courses at reading
  size, with its own labelled reroll button.
- **The other six days are compact cards** stacked in a narrower right-hand
  column, one line per course, each with a `↻` control.

Today is distinguished three ways at once — its own column, a green outline, and
a `today` tag — because the app's single most common use is answering "what are
we eating today" at a glance.

**Days already elapsed are dimmed but not locked**: past *weeks* freeze, elapsed
days do not, so they keep their reroll control (§6.2).

When the week has no plan, the screen offers **Generate**; when it has one and
the week is writable, generating again is offered behind the confirmation in
§9.1. The repeating-week banner (§9.3) sits above the two columns.

**Reroll lives on the plan only**, one control per day. There is no reroll in
the catalogue or in history.

### 11.3 Dishes (the catalogue)

**One screen, three columns side by side** — one per course, each with its own
count — not three screens. It fits without scrolling at catalogue sizes this
household will see, and it makes the three-way split of the domain visible in
the layout.

Adding and editing happen in a **modal sheet**, not on a separate route, so the
list stays behind it as context. Every member may add, edit and delete any dish.
Authorship is shown; a dish whose author was removed reads "removed member".

Deleting a dish must say plainly that **past weeks keep it** — and, symmetric
with ADR-0002's consequence, renaming a dish must say that it changes the
catalogue and every *future* plan but no past one. That asymmetry is deliberate
and needs to be said out loud in the UI.

### 11.4 History — **Derived**

A read-only list of past weeks, most recent first, each opening the same plan
view with every write control absent (not merely disabled). No reroll, no
generate. The screen exists to answer "what did we eat", nothing more.

### 11.5 Accounts (admin only)

Member list with role; create member (password shown once, §7.5); reset
password; remove member; promote/demote. The last-admin control is **disabled
with the reason shown**, never simply missing (§7.6).

This is also where the instance settings live: **week start** (editable until
the first plan exists, read-only with the reason afterwards, §6.1) and
**timezone**.

### 11.6 Look and feel

From the household's own design canvas, *Planificador semanal de comidas*
(direction 1b, desktop take 1d): **IBM Plex Sans / IBM Plex Mono, warm paper
background, one green accent**, amber reserved for the repeating-week notice.

Two things on that canvas are **not** binding, having been decided against
elsewhere: the inline per-slot repeat markers (§9.3) and a pseudo-author called
"setup" for seeded dishes — seeded dishes are authored by the real admin
account, so there is only one kind of author (§10).

The canvas's `14 weeks stored`, its `used 3× in the last 8 weeks` dish
statistic, and its `Print` button are **not in scope** (§15).

---

## 12. Bilingual UI

The UI language is a **render-time concern only**. No i18n library, no locale in
the URL, no locale in the database. Full reasoning in ADR-0001.

### 12.1 How a locale is chosen

A **cookie**, written by the sidebar toggle and read server-side during SSR, so
there is no flash of the wrong language. Not a `Member` column and not a path
segment:

- there are no public or shareable URLs in this app, so a URL segment buys
  nothing and would have to be threaded through every link;
- locale is per-device by consequence, which suits a bilingual household — the
  kitchen tablet can be Spanish while a laptop is English;
- `Member` stays about who cooks, not what font they read. Promoting the cookie
  to a column later is a small migration if it ever matters.

### 12.2 The default

**Spanish, hard-coded.** `Accept-Language` is deliberately ignored, on the login
screen and on a first visit alike. The household cooks in Spanish and the seed
catalogue is Spanish-named; English is the second seat. Browser sniffing is a
classic source of both "why is this in the wrong language" and SSR hydration
mismatches, for a benefit the one-click toggle already provides.

### 12.3 Where translations live

A hand-rolled `Record<Key, { en: string; es: string }>` in the repo, `as const`.
Roughly 150 strings; both locales ship in the bundle at ~10–15 KB raw, which is
less than any library's runtime alone.

**A missing translation is not a runtime concept.** The `as const` record
requires every key in both languages, so an omission is a `tsc` error caught in
the build the self-hoster already runs. There is no fallback chain and no
key-rendering behaviour to design, because the missing case cannot reach
production.

Interpolation is ours (~5 lines of `replace` over `{name}`). If interpolation
and plural branching sprawl past ~10 helper lines, that is the signal to revisit
the whole decision.

Read the locale once per request and pass it down through React context. **Never
put it in module state** — a warm serverless instance serves many households'
requests… and in this app, many members of one household.

### 12.4 Dates and numbers are not translation

Day names, month names and the week's identity are formatted with **`Intl`**,
not written into the string table: `Intl.DateTimeFormat`, `NumberFormat`,
`RelativeTimeFormat`, `ListFormat`, and `PluralRules` for the plural *category*
(the branching is ours; Spanish and English share simple `one`/`other`).

Locale tags: **`es-MX`** and **`en-US`**. The week start is **not** taken from
the locale — it comes from `settings.week_start_dow` (§6.1).

### 12.5 The constraint this places on the build

**Server functions return codes, never prose.** How a locale reaches a
`createServerFn` call is undocumented — a client-initiated server-function POST
is a separate request from the SSR render, and no source states how locale
resolves there. Rather than spike it, the constraint removes the question: the
string table is rendered client-side, so nothing server-side needs to know the
locale. Any server-side failure comes back as an identifier the client
translates.

### 12.6 Result codes — **Derived**

A starting inventory of the identifiers §12.5 requires. Extend it as needed; the
rule, not the list, is what was decided.

| Code | Raised when |
| --- | --- |
| `AUTH_INVALID_CREDENTIALS` | username or password wrong |
| `AUTH_THROTTLED` | per-account backoff active |
| `AUTH_MUST_CHANGE_PASSWORD` | member reached the app with the flag set |
| `AUTH_PASSWORD_TOO_SHORT` | under 8 characters |
| `USERNAME_TAKEN` | case-insensitive collision |
| `USERNAME_INVALID` | characters outside letters, digits, `-`, `_` |
| `LAST_ADMIN` | demotion or removal would leave zero admins |
| `DISH_NAME_TAKEN` | `(course, name)` collision |
| `DISH_NAME_EMPTY` | blank after trim |
| `GENERATE_EMPTY_COURSE` | one or more courses hold no dishes — **carries which** |
| `WEEK_NOT_WRITABLE` | target is neither the current nor the next week |
| `PLAN_NOT_FOUND` | reroll against a week with no plan |
| `WEEK_START_FROZEN` | week-start change attempted after the first plan |

`GENERATE_EMPTY_COURSE` carries the offending course values as data, since the
message names them; the client translates the course names.

---

## 13. Build order — **Derived**

Nothing here was decided; it is one sensible sequence, where each step ends
somewhere demonstrable.

1. **Skeleton + deployment.** Fresh TanStack Start app on current versions,
   `@tanstack/router-plugin` as an explicit dependency, Neon integration added,
   Deploy Button in the README. Prove SSR works on Vercel *before* writing any
   domain code — conditions 2 and 5 fail silently and are miserable to diagnose
   later.
2. **The Effect runtime seam.** One `ManagedRuntime` at module scope in a
   `.server.ts`, `PgClient` layer with `connectTimeout` and retry, a trivial
   server function that reads one row. This is the glue the stack decision warned
   is ours to write; get it wrong here rather than at feature four.
3. **Migrations.** The full schema, triggers and constraint triggers, run on
   `DATABASE_URL_UNPOOLED` as a build step.
4. **Auth and first run.** Setup screen, login, sessions, forced password change.
   Seed the catalogue as part of setup.
5. **Catalogue.** Three-column screen, modal add/edit, delete with its warning.
6. **Generating.** One transaction, the empty-course refusal, the confirmation on
   overwrite.
7. **The plan screen.** Today card plus six compact days, sidebar navigation,
   this-week/next-week.
8. **Regenerating**, the repeating-week query, the banner and the toast.
9. **History**, read-only.
10. **Accounts**, including week start and timezone.
11. **The bilingual pass.** Extract every string to the record, add the toggle
    and the cookie, format all dates through `Intl`. Doing this last is
    deliberate: it is mechanical once the screens exist, and the `tsc` error on a
    missing key makes it self-checking.

Steps 5–8 are the app; 1–3 are where the stack's accepted risks land.

### Testing — **Derived**

The generator is where the value and the subtlety are; it is also pure. Test it
directly against a seeded catalogue, at 6, 7, 8 and 9 dishes per course, for:
generating never repeats at ≥7; regenerating never returns the replaced dish;
regenerating introduces no repeat while candidates remain; the fallback fires
and is announced at exactly 7; the empty-course refusal names every empty course.
The constraint triggers deserve a test each — they are the invariants that make
the rest of the code able to assume a plan is complete.

---

## 14. Out of scope

Ruled out deliberately. An implementer who finds themselves building any of
these has drifted, and should stop and ask.

- **Per-person nutrition plans.** The household genuinely wants this — feeding
  each member's dietitian plan into the generator — and it is the obvious next
  effort. It is *not* in this spec. It probably forces splitting `Person` from
  `Member` (a child on a plan may not have an account) and turns generating from
  "draw at random" into "draw subject to constraints". Build the app as
  specified first.
- **Multiple households on one instance.** The model is "you host yours, I host
  mine". Offering this as a service would be a different product.
- **Breakfast and dinner.** Only the midday meal is shared.
- **OAuth and magic-link login.** Both require the self-hoster to configure an
  external provider — a Google Cloud project, or an email service — before the
  app can be used at all.
- **Pinning or hand-editing a slot.** Regenerating a whole day is the only edit.
- **Cross-week variety.** Generating has no memory, on purpose.
- **Cooking turns** (assigning who cooks each day). Raised and set aside.

---

## 15. Deferred, not rejected

These are real questions with no answer yet. They do not block the build, and
guessing at them in code is worse than leaving them out.

- **Phone layout.** Web first was chosen deliberately, but the app is opened
  standing in a kitchen. Whether the plan's two columns simply collapse to one or
  the phone gets its own layout is unsettled; the design canvas's direction 1b is
  the starting point.
- **Printing the week.** A week on the fridge is the offline answer for a
  household, and it is the one surface where the phone-versus-desktop question
  does not apply. Unclear whether it is a stylesheet or a screen.
- **History retention.** The shipped behaviour is **unbounded** — nothing deletes
  a `weekly_plan`, and old weeks hold their own copies of dish names forever.
  Whether to add a bound is a product question, not a schema one.
- **Dish usage statistics** (`used 3× in the last 8 weeks`). Compatible with the
  no-memory rule as a read-only statistic, but it needs history queryable by
  dish, and nothing has asked for it yet.
- **Migrating to Effect 4.** Not before the app exists, and not before
  `effect/unstable/*` settles. Re-verify the database layer against Neon when it
  happens; the driver rewrite is the risk (§3.1).

---

## 16. One thing worth building that nobody has ticketed

Backups are the household's problem on Neon Free, and the app holds the only
copy of a catalogue that took an afternoon to write. **A "download my data"
export is worth more here than any provider feature** — this came out of the
hosting research and never became a ticket. It is not required to ship, and it
is cheap: the whole database is seven small tables and nothing in it is
localised.

---

## 17. Gaps the implementer must resolve

Two loose ends that the map did not close. Neither blocks starting; both need an
answer before the screen or table they touch is finished.

1. **The instance display name.** The sidebar shows an instance name at its top
   (the canvas draws "casa hernández"). It was explicitly agreed this is
   *config*, not a `Household` row — but the schema has no column for it.
   Cheapest resolution: add `settings.display_name text` (nullable, editable on
   the accounts screen, falling back to a static app title when null). Chosen
   here as the recommendation, not as a decision.
2. **The generated temporary password's shape.** §7.5 says the app generates it
   and shows it once; nothing says what it looks like. It is read aloud across a
   kitchen, so favour a short, unambiguous, pronounceable form over entropy —
   `must_change_password` means it lives for minutes.

---

## 18. Provenance

Every claim above traces to one of these. Where two disagree, the later one
wins, and the disagreements are noted in the table.

| Decision | Ticket |
| --- | --- |
| Stack, database, hosting, the five conditions | [Choose the stack, database and hosting baseline](https://github.com/lfeq/food-organizer/issues/2) |
| Passwords, sessions, first run, roles, throttling | [Decide password storage and sessions without email](https://github.com/lfeq/food-organizer/issues/3) |
| Bilingual UI, cookie, `Intl`, server codes | [Decide how the bilingual UI works](https://github.com/lfeq/food-organizer/issues/4) |
| Generator edges, empty course, writable weeks, seeding | [Pin down the generator's edge-case rules](https://github.com/lfeq/food-organizer/issues/5) |
| Screens, sidebar, plan layout, catalogue, reroll placement | [Prototype the screens and navigation](https://github.com/lfeq/food-organizer/issues/6) |
| Schema, week start, time model, snapshotting, admin floor | [Decide the data model and schema](https://github.com/lfeq/food-organizer/issues/7) |
| Reroll repeats, seed catalogue of nine, repeating-week framing | [Decide what happens when regenerating must repeat](https://github.com/lfeq/food-organizer/issues/10) |

**Amendments applied here, so the tickets alone would mislead:**

- The seed catalogue is **27 dishes (nine per course)**, not the 21 (seven) the
  generator ticket first decided. Amended by the reroll-repeats ticket.
- The repeating-week banner is a **property of the plan**, not the
  "fewer than seven dishes" catalogue predicate the generator ticket first
  described. Same amendment.
- The week runs from a **configurable week start defaulting to Sunday**, not the
  Monday–Sunday the bilingual ticket asserted in passing. Amended by the schema
  ticket.
- **No per-slot repeat markers**, against the design canvas that draws them.

Supporting material: [`docs/research/stack-and-hosting.md`](docs/research/stack-and-hosting.md)
(sources and check dates, all 2026-08-28), the
[`prototype/screens`](https://github.com/lfeq/food-organizer/tree/prototype/screens)
branch, and the *Planificador semanal de comidas* design canvas.
