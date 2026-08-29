# Stack, database and hosting baseline

Research for [issue #2](https://github.com/lfeq/food-organizer/issues/2).
All facts below were checked against primary sources on **2026-08-28**. Free
tiers change often; re-check the dates before relying on any number.

## Question

What framework + database + hosting combination minimises the number of manual
steps between `git clone` and a working instance, for a non-expert self-hoster
deploying their own copy of this meal planner?

Fixed constraints (from issue #1): no email provider; one instance = one
household; plans and catalogue must survive redeployment; a family of five must
fit comfortably inside a free tier; code and docs English-only, UI bilingual.

## Headline finding: the three options are really two

The ticket asks to compare (a) Vercel + its first-party Postgres, (b) Vercel +
an external managed Postgres such as Neon or Supabase, and (c) SQLite on a host
with a persistent disk.

**(a) and (b) are now the same option.** Vercel no longer has a first-party
Postgres product. Vercel Postgres was *itself* Neon under the hood and was
transitioned to Neon's native Marketplace integration between Q4 2024 and Q1
2025; existing Hobby stores moved onto the Neon Free plan. Vercel's current
storage line-up is Blob (files), Global Config (key/value config), and
Marketplace databases from third parties — there is no Vercel-owned relational
database and no Vercel-owned block storage.

- Vercel Storage overview, last updated 2026-08-11:
  <https://vercel.com/docs/storage>
- Storage on Vercel Marketplace, last updated 2026-08-11:
  <https://vercel.com/docs/marketplace-storage>
- Neon's Vercel Postgres transition guide:
  <https://neon.com/docs/guides/vercel-postgres-transition-guide>
- Neon on the Vercel Marketplace: <https://vercel.com/marketplace/neon>

So the real comparison is: **Vercel + Neon (Marketplace-native)** vs **Vercel +
a database the self-hoster provisions on the provider's own site** vs **SQLite
on a persistent disk (Fly.io / Railway)**.

## Option 1 — Vercel + Neon via the native Marketplace integration

### Setup steps the self-hoster performs

1. Have a GitHub account and a Vercel account (sign in with GitHub — one
   OAuth click, no separate password).
2. Fork or use the repo's Deploy Button, which clones the repository into their
   own GitHub account and creates the Vercel project in one flow
   (<https://vercel.com/docs/deploy-button>).
3. Add the database. Either from the dashboard (Marketplace → Neon → Install →
   pick the **Free** plan and a region → Connect Project), or in one command
   from the terminal: `vercel install neon --plan free -e production`.
4. Redeploy once so the app picks up the injected variables, then open the URL
   and create the admin account in-app.

That is **two accounts, zero copy-pasted secrets**.

### Environment variables set by hand

**None for the database.** The Neon integration injects the credentials into
the Vercel project automatically: `DATABASE_URL` (pooled, via PgBouncer),
`DATABASE_URL_UNPOOLED` (direct), plus `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`,
`PGDATABASE`, `PGPASSWORD` and legacy `POSTGRES_*` aliases
(<https://neon.com/docs/guides/vercel-native-integration>).

The only thing the app itself may need is a session-signing secret. That is one
variable, and it can be generated at build time or on first boot instead of
being asked for — a design decision this project should make deliberately, since
every hand-typed variable is a step the ticket is trying to remove.

### What breaks or expires on the free tier

Neon Free plan (<https://neon.com/docs/introduction/plans>):

- 0.5 GB storage per project. Exceeding it makes **writes fail** until space is
  freed or the plan is upgraded. A text-only catalogue of dishes and 52 weekly
  plans a year is orders of magnitude below this.
- 100 CU-hours/month per project (~400 h at 0.25 CU). A household instance that
  is idle most of the day will not approach this.
- **Scale-to-zero after 5 minutes of inactivity is mandatory on Free and cannot
  be disabled.** The first request after an idle period pays a cold start
  (typically a few hundred ms). The app must tolerate that on the login page.
- No expiry date, and **no deletion of inactive projects**. If the monthly
  compute allowance is exhausted, the compute is suspended until the next
  billing period — the *data is preserved*.

Vercel Hobby (<https://vercel.com/docs/limits>, last updated 2026-08-25;
<https://vercel.com/docs/functions/limitations>, 2026-08-24):

- Function max duration on Hobby: 300 s default and maximum, 2 GB / 1 vCPU.
  Irrelevant at this scale.
- **Hobby projects cannot connect to Git repositories owned by a GitHub
  organisation** — only personal repos. A self-hoster forking into their personal
  account is fine; one forking into a family org would have to use a Vercel Team.
  Worth one line in the README.
- Hobby is intended for non-commercial personal use, which this is.

### Does the database survive redeployment?

Yes, completely. The database is a separate managed resource; deployments only
replace the application bundle. Schema migrations are the app's own concern
(run them from the build step or a startup check).

## Option 2 — Vercel + a database provisioned on the provider's own site

Same as option 1, except the self-hoster creates an account on neon.com or
supabase.com, creates a project there, copies the connection string, and pastes
it into Vercel as `DATABASE_URL`.

- **Steps:** three accounts instead of two, plus one copy-pasted secret. Every
  extra hop is a place a non-expert stalls — a pooled-vs-direct connection
  string chosen wrongly produces an error message that means nothing to them.
- **Only advantage:** billing stays with the database provider, and the
  self-hoster keeps the database if they leave Vercel. Not worth the step for
  this audience, and the Marketplace resource can be transferred anyway.

### Supabase specifically — unverified risk

Supabase Free plan quotas are documented (500 MB database, 1 GB file storage,
5 GB egress, 50,000 MAU, two free projects; paused projects do not count toward
the limit) —
<https://supabase.com/docs/guides/platform/billing-on-supabase>.

**Not verified in this session:** Supabase's free-plan *project pausing* policy
— after how many days of inactivity a free project is paused, how it is
restored, and whether a paused project's data is ever deleted after a further
period. Two lookups for this were not completed, and the number is not guessed
here. This is the single open follow-up from this ticket. It matters because a
family that stops meal-planning over a long holiday is exactly the usage
pattern that trips inactivity pausing, and because Supabase also brings auth
and storage features this app does not need. **Follow-up:** read Supabase's
project-status / pausing documentation and confirm (i) the inactivity window,
(ii) whether restore is self-service, (iii) whether data is ever deleted.

Neon has no equivalent risk: on Free it suspends *compute*, never the data, and
does not delete inactive projects.

## Option 3 — SQLite on a host with a persistent disk

SQLite is attractive on paper: no second service, the whole database is one
file, backups are a file copy. The problem is entirely on the hosting side.

### Why SQLite is not possible on Vercel

Vercel has no persistent-disk product. Its storage line-up is Blob, Global
Config and third-party Marketplace databases (<https://vercel.com/docs/storage>).
Functions are deployed as immutable bundles with an AWS-enforced 250 MB
uncompressed size limit (<https://vercel.com/docs/functions/limitations>), and
each deployment replaces the bundle. *Inference, not a direct quote:* the docs
do not contain a sentence saying "the filesystem is ephemeral", but with no
block-storage product, an immutable bundle per deployment, and autoscaling to
30,000 concurrent instances, there is nowhere for a SQLite file to live that
survives an invocation, let alone a redeploy. **SQLite + Vercel is ruled out.**

### Fly.io

Setup steps: install `flyctl`, `fly auth signup`, `fly launch` (writes a
`fly.toml` and a Dockerfile), `fly volumes create data`, mount it in
`fly.toml`, `fly deploy`, `fly secrets set` for any secrets. That is a
**command-line-only flow with roughly six steps and a required Dockerfile** —
much heavier than a Deploy Button for a non-expert.

Persistence (<https://fly.io/docs/volumes/overview/>):

- Volumes **do** persist across deploys and restarts.
- But: "A Machine can only mount one volume at a time and a volume can be
  attached to only one Machine", and "each volume exists on one server in a
  single region. It is not network storage."
- **Data-loss warning, verbatim from the docs:** "If you only have a single copy
  of your data on a single volume, and that drive fails, then the data is lost."
  Fly takes daily block-level snapshots (5-day default retention) but warns that
  "daily automatic snapshots may not have your latest data. You should still
  implement your own backup plan."
- If a deployment creates *new* machines, those machines need their own volumes.
  A misconfigured deploy can therefore come up against an empty volume — the
  app looks like it lost every plan, and the real data is still sitting on an
  orphaned volume.

Cost (<https://fly.io/docs/about/pricing/>): **there is no free allowance.**
Smallest shared-cpu-1x/256 MB machine ≈ $2.02/month, volumes $0.15/GB-month.
The trial (<https://fly.io/docs/about/free-trial/>) is "2 hours of machine
runtime or 7 days of access, whichever comes first"; no credit card needed to
start, but "if you don't add payment by day 7 or exhaust the included
resources, your apps will stop running."

**Fly fails the free-tier constraint outright.** It is a ~$3/month host, and
the ticket requires a family of five to fit in a free tier.

### Railway

Cost (<https://docs.railway.com/reference/pricing/plans>,
<https://docs.railway.com/reference/pricing/free-trial>):

- The trial is a **one-time $5 grant that expires 30 days** after use begins and
  does not roll over. Trial accounts are capped at 1 GB RAM, shared vCPU, and 5
  services per project.
- After the trial, the account reverts to the Free plan, which grants **$1 of
  credit per month** — not enough to keep a container running continuously.
- Hobby is $5/month flat.

**Data-loss trap, verbatim:** "Railway deletes stateful volumes created by Trial
accounts 30 days after the expiration of your credits." So a self-hoster who
deploys on the trial, uses the app for a month, forgets about it over a
holiday, and does not upgrade **loses the family's entire catalogue and plan
history** — silently, on a clock they never saw. This is the worst outcome in
the whole comparison and it disqualifies Railway as the documented default.

## Comparison

| | Accounts needed | Hand-set env vars | Free forever? | Survives redeploy | Silent data-loss risk |
|---|---|---|---|---|---|
| Vercel + Neon (Marketplace) | 2 (GitHub, Vercel) | none for the DB | Yes | Yes | None found. Compute suspends; data is kept |
| Vercel + externally-provisioned Postgres | 3 | `DATABASE_URL` | Yes | Yes | Supabase pausing policy **unverified** |
| SQLite on Fly.io | 2 (GitHub, Fly) + card | secrets via CLI | **No** — ~$3/mo | Yes, but single-copy | Single-drive failure = total loss; new machines can come up with empty volumes |
| SQLite on Railway | 2 + card eventually | secrets via UI | **No** — $1/mo credit | Yes | **Volumes deleted 30 days after trial credits expire** |

## Recommendation

**Next.js (App Router) + Postgres via the Neon native Vercel integration,
deployed to Vercel Hobby through a Deploy Button in the README.**

Three facts decide it:

1. **It is the only combination that is genuinely free and genuinely
   persistent.** Fly has no free allowance at all; Railway's free plan grants $1
   a month and deletes trial volumes. Neon Free has no expiry and does not
   delete inactive projects.
2. **It is the only combination with zero hand-copied secrets.** The Marketplace
   integration injects `DATABASE_URL` into the Vercel project itself. Every
   other path asks a non-expert to move a connection string between two
   dashboards.
3. **Nothing on this path can silently delete the family's data.** The worst
   Neon Free does is suspend compute (data preserved) or refuse writes past
   0.5 GB. Both are loud and recoverable; the Railway and Fly failure modes
   are not.

### On the framework half

The hosting evidence does point at one framework: **Next.js**. Not because it is
better in the abstract, but because it is the only framework Vercel builds with
no configuration at all, which is what makes the Deploy Button a one-click flow;
and because a Next.js app with `output: "standalone"` also runs in a container
on Fly or Railway, so choosing it does not lock the household to Vercel if the
free tier changes. The bilingual requirement is neutral between frameworks and
is served by a standard i18n library on top of Next's App Router.

What the hosting evidence does *not* decide: the ORM/query layer, the migration
tool, and the session/password-hashing approach. Those are separate decisions
and should not be smuggled into this ticket.

### Consequences to accept

- **Cold starts.** Neon Free suspends compute after 5 minutes idle and this
  cannot be disabled. The first page load after a quiet afternoon is slower.
  The login screen must not look broken while it waits.
- **Migrations need a home.** With a managed Postgres, someone has to run
  migrations on deploy. Doing it in the build step keeps the self-hoster's step
  count at zero.
- **Backups are the household's problem.** Neon Free's history-retention window
  is short. A "download my data" export in the app is worth more here than any
  provider feature, and costs the self-hoster nothing to use.
- **Hobby + GitHub organisations.** If the self-hoster forks into an org rather
  than a personal account, Vercel Hobby will refuse to connect the repo. One
  README line prevents a confusing dead end.

## Open follow-up

- Verify Supabase's free-plan project-pausing policy (inactivity window,
  restore procedure, whether paused data is ever deleted). Not established in
  this session. It does not change the recommendation — Neon wins on step count
  regardless — but it should be recorded before anyone proposes Supabase as an
  alternative.

## Sources

All checked 2026-08-28.

- <https://vercel.com/docs/storage> (page last updated 2026-08-11)
- <https://vercel.com/docs/marketplace-storage> (2026-08-11)
- <https://vercel.com/docs/limits> (2026-08-25)
- <https://vercel.com/docs/functions/limitations> (2026-08-24)
- <https://vercel.com/docs/deploy-button> (2025-03-12)
- <https://neon.com/docs/introduction/plans>
- <https://neon.com/docs/guides/vercel-native-integration>
- <https://neon.com/docs/guides/vercel-postgres-transition-guide>
- <https://supabase.com/docs/guides/platform/billing-on-supabase>
- <https://fly.io/docs/about/pricing/>
- <https://fly.io/docs/about/free-trial/>
- <https://fly.io/docs/volumes/overview/>
- <https://docs.railway.com/reference/pricing/plans>
- <https://docs.railway.com/reference/pricing/free-trial>

---

# Addendum, 2026-08-28 — the framework half, re-decided: TanStack Start + Effect

**This section supersedes the "On the framework half" recommendation above.**
Everything else in this document stands unchanged: the database and hosting
decision is still **Postgres on Neon via the native Vercel Marketplace
integration, on Vercel Hobby**, and none of the evidence below disturbs it.

The Next.js recommendation was rejected by the household, which chose
TypeScript with the **Effect** (effect-ts) ecosystem instead. The provisional
stack put to this check was:

- **TanStack Start** as the full-stack framework
- **`@effect/sql-pg`** as the database access layer
- deployed to **Vercel**, alongside the existing Neon integration
- with `@effect/platform` HttpApi + a separate SPA already rejected, because two
  deployables break the one-click self-host story

This addendum is an adversarial check of that choice against primary sources.
The job was to find what it costs, not to ratify it.

## Verdict

**The stack survives, with conditions.** Not one of the three ways it could have
failed actually fails:

- TanStack Start deploys to Vercel through **first-party framework
  auto-detection with no `vercel.json`**, so the one-click Deploy Button — the
  entire reason Vercel was chosen — still works (Fact 9).
- `@effect/sql-pg` uses **`pg` (node-postgres)**, not `postgres.js`, and never
  issues named prepared statements, so **Neon's pooled `DATABASE_URL` works
  as-is** with no `prepare: false` escape hatch needed and none missed (Facts 2
  and 6).
- Effect + TanStack Start is **not novel** — there are half a dozen public
  templates and at least one shipped app doing it (Fact 4).

Three conditions, all cheap, none optional:

1. **Set `connectTimeout` explicitly and retry the layer.** `@effect/sql-pg`
   eagerly runs `SELECT 1` at layer construction and hard-fails after a **5-second
   default**, and Neon Free's mandatory scale-to-zero puts a cold-start wake
   inside that budget (Fact 3). Neon's own docs recommend both a longer timeout
   *and* backoff retries.
2. **Keep `@tanstack/router-plugin` as an explicit dependency.** Vercel's
   framework detector requires it by name; without it the deploy silently falls
   back to a client-only static build with no SSR and no server functions
   (Fact 9).
3. **Pin every version exactly and never run `npm update`.** The Effect
   satellites are 0.x and ship breaking changes in minors; TanStack Start ships
   breaking changes in minors and does not mention them in release notes
   (Facts 5 and 8).

**And two costs the household is signing up for, which it should agree to with
its eyes open:**

- **TanStack Start is officially a Release Candidate, not 1.0.** The `1.168.49`
  version number is a monorepo build counter, not a GA declaration, and the docs
  still say "the road to v1" (Fact 8).
- **Effect 4.0 is in RC right now** — `4.0.0-rc.112` shipped three days before
  this check — and v4 is a rewrite that also **replaces `pg` with a hand-written
  Postgres wire protocol** (Facts 5 and 7). A migration is coming, it is not
  mechanical, and it will require re-verifying the database layer against Neon.

And note what v4 does *not* fix: its migration guide keeps `sql`, `schema`,
`http` and `rpc` in an `effect/unstable/*` namespace that "may receive breaking
changes in minor releases" **after 4.0 ships** (Fact 10). The churn is being
renamed, not removed.

Neither cost is a reason to reject the stack. Both are reasons to reject the
idea that this repo will be maintenance-free.

**Nothing here disturbs the database and hosting decision.** Neon on Vercel Hobby
stands exactly as recorded above.

## Fact 1 — package versions, straight from the npm registry

Read from `https://registry.npmjs.org/<pkg>` on **2026-08-28**. These are the
publish timestamps in the registry's own `time` map, not a changelog's claim.

| Package | `latest` | Published | Other dist-tags |
|---|---|---|---|
| `@tanstack/react-start` | **1.168.49** | 2026-08-22 | `pre` 1.168.33-pre.0 |
| `@tanstack/react-router` | **1.170.32** | 2026-08-22 | `pre` 1.170.19-pre.0 |
| `effect` | **3.22.1** | 2026-07-30 | **`rc` 4.0.0-rc.112 (2026-08-25)**, `beta` 4.0.0-beta.107 |
| `@effect/sql-pg` | **0.53.0** | 2026-07-13 | **`rc` 4.0.0-rc.112 (2026-08-25)** |
| `@effect/sql` | **0.52.1** | 2026-07-30 | — |
| `@effect/platform` | **0.97.1** | 2026-07-30 | — |
| `@effect/platform-node` | **0.108.1** | 2026-07-31 | — |

Two things jump out of that table.

**(a) TanStack Start publishes a 1.x version number — but do not read that as
GA. See Fact 8; the official docs still call it a Release Candidate.** The stale
`beta` dist-tag on `@tanstack/react-start` points at `0.0.1-beta.204` from
**2023-11-02** — an abandoned tag, not the current state. `latest` is 1.168.49.
`@tanstack/react-start` has **835 published versions** and
`@tanstack/react-router` has **1195**; the last eight releases of each landed on
2026-08-09, -12, -12, -14, -14, -18, -19 and -22. That is a release every two to
three days.

**(b) Effect 4.0 is in release candidate, right now.** `effect@4.0.0-rc.112`
was published **2026-08-25 — three days before this check**. The RC train is
moving at roughly one RC every two to three days (rc.108 on 08-12 through
rc.112 on 08-25). The satellite packages are being renumbered onto the same
version line: `@effect/sql-pg` and `@effect/platform-node` both publish a
`4.0.0-rc.112`. **A repo started today on `effect@3.22` is starting on the
version that is about to be superseded.** See Fact 5.

## Fact 2 — `@effect/sql-pg` uses `pg` (node-postgres), and that is the single
best piece of news in this check

Read from the published tarball of `@effect/sql-pg@0.53.0` (its `package.json`
and `src/PgClient.ts`), not from documentation:

```json
"dependencies": {
  "pg": "^8.16.3",
  "pg-pool": "^3.10.1",
  "pg-types": "^4.1.0",
  "pg-cursor": "^2.15.3",
  "pg-connection-string": "2.9.1"
}
```

This matters because of the obvious way this stack could have failed. Neon's
pooled connection string — the one the Vercel Marketplace integration injects
as `DATABASE_URL` — goes through **PgBouncer in transaction pooling mode**, and
transaction pooling is incompatible with server-side *named* prepared
statements. `postgres.js` (porsager) issues named prepared statements by
default and has to be told `prepare: false` to work against PgBouncer.

`@effect/sql-pg` **used to** depend on `postgres.js` and no longer does. From
the registry's own dependency records per version:

- `@effect/sql-pg@0.30.0` and `@0.40.0` → `"postgres": "^3.4.4"`
- `@effect/sql-pg@0.48.0` onwards → `"pg": "^8.16.3"`

The driver was swapped inside the 0.x line. `node-postgres` sends queries over
the extended protocol as **unnamed** statements unless a query is given a
`name`, and `PgClient.ts` calls `client.query(sql, params, cb)` with a plain
string throughout — no `name` is ever set. **So the default query path does not
create named prepared statements, and Neon's pooled `DATABASE_URL` is usable
as-is.** No `prepare: false` escape hatch is needed, and none is exposed —
which would have been a problem had the driver still been postgres.js.

*This is inference from reading the source plus node-postgres' documented
behaviour, not a sentence in Effect's docs saying "works with PgBouncer".* It
should be confirmed with one real query against a Neon pooled URL before the
first feature ticket is written.

### The one thing that will not work over the pooled URL

`PgClient` exposes `listen(channel)` and `notify(channel, payload)`.
`LISTEN`/`NOTIFY` are session-scoped and do not survive PgBouncer transaction
pooling. If this app ever wants them it must use `DATABASE_URL_UNPOOLED`. It
almost certainly never will — a household meal planner has no use for pub/sub —
but it is a trap worth naming so nobody wires it up and wonders why nothing
fires.

## Fact 3 — the Neon cold start has a concrete, named collision with
`@effect/sql-pg`'s default timeout

This is the finding the household most needs, and it comes from the source, not
from anyone's blog.

`PgClient.make` does **not** lazily connect. It eagerly runs a health check when
the layer is constructed, inside an `acquireRelease`, wrapped in a hard timeout
(`packages/sql-pg/src/PgClient.ts`, v0.53.0):

```ts
yield* Effect.acquireRelease(
  Effect.tryPromise({
    try: () => pool.query("SELECT 1"),
    catch: (cause) => new SqlError({ cause, message: "PgClient: Failed to connect" })
  }),
  () => Effect.promise(() => pool.end()).pipe(Effect.interruptible, Effect.timeoutOption(1000))
).pipe(
  Effect.timeoutFail({
    duration: options.connectTimeout ?? Duration.seconds(5),
    onTimeout: () => new SqlError({ cause: new Error("Connection timed out"), ... })
  })
)
```

Read that default: **if the first `SELECT 1` does not complete within 5 seconds,
layer construction fails with a `SqlError`.** Now recall the constraint recorded
earlier in this document: **Neon Free scale-to-zero after 5 minutes idle is
mandatory and cannot be disabled.** The first request after a quiet afternoon
has to wake a suspended compute *and* complete a round trip inside that 5-second
budget.

Neon's typical cold start is a few hundred milliseconds, so this will usually
pass. But 5 seconds is not a comfortable margin for a p99, and the failure mode
is the worst possible one for this audience: the family opens the planner after
lunch, the page errors, and they have no idea why — a retry works.

**Mitigation, and it is cheap:** set `connectTimeout` explicitly. `PgClientConfig`
accepts it, along with everything else needed here:

```ts
readonly url?: Redacted.Redacted
readonly ssl?: boolean | ConnectionOptions
readonly idleTimeout?: Duration.DurationInput
readonly connectTimeout?: Duration.DurationInput
readonly maxConnections?: number
readonly minConnections?: number
readonly connectionTTL?: Duration.DurationInput
readonly applicationName?: string
```

So: `PgClient.layer({ url: Redacted.make(process.env.DATABASE_URL!),
connectTimeout: Duration.seconds(30), maxConnections: 5 })` — a `url` field that
takes Neon's connection string verbatim, a timeout that survives a cold wake,
and a small pool because Vercel functions are many and short-lived. **The
default configuration is the dangerous one; the fixed configuration is three
lines.** Record it as a build-time requirement, not a tuning exercise for later.

Teardown is already serverless-friendly: release calls `pool.end()` with a
1-second cap, so a function invocation will not hang waiting to drain.

Confirmed against `node-postgres`' own source
(`packages/pg/lib/query.js` on `main`): `Query.prepare()` calls
`connection.parse({ text, name: this.name, types })`, and `this.name` comes from
`config.name`, which `@effect/sql-pg` never sets. An undefined name is the
**unnamed** statement, which Postgres discards at the end of the extended-query
cycle — exactly what PgBouncer transaction pooling tolerates.

The 5-second default is **unchanged in the v4 line**: `@effect/sql-pg@4.0.0-rc.112`
carries the same `duration: options.connectTimeout ?? Duration.seconds(5)` in
`src/PgClient.ts` (twice). Setting the timeout is not a v3 workaround that goes
away later; it is permanent configuration.

## Fact 4 — Effect + TanStack Start has prior art, but almost none of it is on
Vercel

> **Revised by Fact 11.** Counting repositories, as this section does, overstates
> the case. Counting *adoption* gives a thinner answer. Read both.


The worry going in was that this repo would be the first to try the combination
and would be debugging integration problems instead of writing a meal planner.
That worry is **not borne out.** A GitHub repository search on 2026-08-28
returns a working set of public projects doing exactly this:

| Repo | What it is | Last pushed |
|---|---|---|
| `shekohex/tanstack-start-effect-template` | "Opinionated Vite+, Effect, TanStack Start, Better Auth, **PostgreSQL** application template" | 2026-08-19 |
| `brandhaug/b2b-saas-starter` | TanStack Start + **Effect v4** + Drizzle on D1 + Better Auth, Cloudflare-first | 2026-08-28 |
| `kevin-courbet/tanstack-effect-example` | "Bare-bones TanStack Start + Effect.ts RPC example — list query + mutation with proper DI" | 2026-06-16 |
| `Guiguerreiro39/tanstack-effect-convex` | TanStack Start + Effect + Convex template | 2026-04-17 |
| `AlMoustapha01/effect-full-stack-app` | React + TanStack Start + Effect full-stack app | 2026-05-15 |
| `davidvornholt/punktlandung` | A real, shipped app: TanStack Start + Effect + Bun | 2026-08-17 |
| `mvellandi/gadgetbot` | TanStack Start + Effect + Zitadel, on Hetzner via Coolify | 2026-02-12 |
| `jackbisceglia/planar` | Linear clone: Zero + Solid + TanStack Start + Effect | 2025-12-18 |

So the pattern of *running an Effect runtime inside TanStack Start server
functions* has been solved in public more than once, recently, and there is at
least one PostgreSQL-flavoured template to read.

**But look at where they deploy.** Cloudflare, Bun, Hetzner/Coolify, Convex. The
list is conspicuously short of Vercel. The prior art de-risks the *language and
runtime* question and does **not** de-risk the *Vercel deployment* question,
which is the one this project actually depends on, because the Deploy Button is
the whole reason Vercel was chosen. Read the templates for how to wire Effect
into a server function; do not assume any of them proves the Vercel path works.

## Fact 5 — the real cost: Effect 4.0 is in release candidate *right now*, and
the satellites are all 0.x

This is the finding that should change how the household feels about the
decision, and it is not visible from the Effect website's front page.

**Effect 4.0 is imminent.** From the npm registry on 2026-08-28:

- `effect@4.0.0-rc.112`, published **2026-08-25 — three days ago**
- the RC train is running at one RC every two to three days: rc.108 (08-12),
  rc.109 (08-14), rc.110 (08-17), rc.111 (08-20), rc.112 (08-25)
- `latest` is still `3.22.1` from 2026-07-30, i.e. the stable line has not had a
  release in a month while the RC line publishes twice a week

And it is not a version bump — it is a rewrite. The Effect repository's branch
list on GitHub is full of `archive/effect-smol/*` branches ("effect-smol" was
the ground-up v4 rewrite), and `packages/effect/CHANGELOG.md` on the **`main`
branch now begins at `## 4.0.0-rc.112`**. v4 has taken over `main`; v3 is the
line being left behind. The 2026-08-25 GitHub release wave cut
`4.0.0-rc.112` for the entire ecosystem in one go — `effect`, `@effect/vitest`,
`@effect/sql-pg`, `@effect/sql-sqlite-*`, `@effect/sql-mysql2`, and the rest.

**The satellite packages are 0.x and churn hard.** Also from the registry:
`@effect/sql-pg` is at **0.53.0** after **448 published versions**;
`@effect/platform` at **0.97.1** after **532**; `@effect/sql` at **0.52.1** after
**334**. Under semver, a 0.x minor bump is allowed to break, and these use that
licence. The clearest proof is the one this document already relies on: **the
underlying Postgres driver was swapped from `postgres.js` to `pg` between
`@effect/sql-pg@0.40.0` and `@0.48.0`** — a change of database driver, shipped
inside a 0.x minor. That is not a hypothetical churn risk; it is a thing that
already happened to this exact package.

Note also that `@effect/sql-pg@0.53.0` pins its peers narrowly —
`effect@^3.22.0`, `@effect/sql@^0.52.0`, `@effect/platform@^0.97.0`,
`@effect/experimental@^0.61.0` — so these five packages move as a unit. There is
no upgrading one of them alone. Meanwhile `@effect/sql-pg@4.0.0-rc.112` peers on
`effect@^4.0.0-rc.112` only: the v4 line has collapsed `@effect/sql`,
`@effect/platform` and `@effect/experimental` out of the peer set, which is a
restructuring of the package graph, not a patch.

**What this costs the household, stated plainly.** This repo is meant to be
low-maintenance for a family. Starting it today on `effect@3.22` means
**building on the version that is one release away from being legacy**, and
budgeting for a v4 migration — of a rewritten library — within months. There is
no version of this decision where that migration does not happen; the only
choice is whether it happens on a small codebase soon or a larger one later.

### The two honest options

1. **Start on `effect@3.22` (stable) and plan the v4 migration.** Safest today.
   `latest` means "supported" and the ecosystem is coherent. Cost: a known
   migration ahead, on someone else's schedule.

   *Caveat found while checking the templates:* the two most recently updated
   ones are **already on v4** — `shekohex/tanstack-start-effect-template`'s
   `package.json` resolves Effect through a `catalog:effect-v4` entry, and
   `brandhaug/b2b-saas-starter` advertises Effect v4 in its description. The
   older example, `kevin-courbet/tanstack-effect-example`, is on `effect@^3.19.11`
   with `@effect/platform@^0.93.7` and `@tanstack/react-start@^1.159.14`. So the
   community is mid-migration: v3 is where the settled examples are, v4 is where
   the new ones are being written.
2. **Start on `effect@4.0.0-rc`.** The app is small and greenfield, so the
   migration cost is never lower than right now, and `brandhaug/b2b-saas-starter`
   shows someone is already running Effect v4 in a TanStack Start app. Cost:
   an RC in production, and RCs published twice a week can still break.

**Recommendation: option 1, deliberately, with the version pinned exactly.**
For a family app, "runs unattended for a year" beats "already on the new thing",
and an RC that ships every 60 hours is the opposite of unattended. Pin exact
versions in `package.json` (no `^`), commit the lockfile, and treat the v4
migration as a scheduled ticket rather than something that happens by accident.

*Correction to an easy assumption, worth stating because it is counter-intuitive:*
**`npm update` is not actually the danger here.** For a `0.x` dependency, a caret
range is narrower than it looks — `^0.97.1` will **not** accept `0.98.0` — so
`npm update` cannot pull a breaking satellite minor. The real risk runs the other
way: the repo silently goes stale, and whenever someone finally bumps, they face
every accumulated breaking change at once. The discipline is therefore not "never
update" but **"bump deliberately, one satellite minor at a time, and read the
changelog, because it will not tell you the change was breaking."**

## Fact 6 — the rest of the Neon/PgBouncer surface, and the traps that are real

Fact 2 cleared the prepared-statement worry. A closer read of Neon's own
documentation clears it twice over, and turns up four things that *are* real.

### The prepared-statement worry was doubly unfounded

<https://neon.com/docs/connect/connection-pooling> states verbatim that "Neon
uses PgBouncer in transaction mode (`pool_mode=transaction`)" and that
"PgBouncer support protocol-level prepared statements (as of PgBouncer 1.22.0)",
with a published pooler config of `max_prepared_statements=1000`. Neon's own
example on that page uses a **named** `pg` query (`name: 'fetch-user'`). So even
the aggressive case works. Combined with Fact 2 — `@effect/sql-pg` never sets
`name` at all — there is nothing to configure here.

**Where the wrong belief came from:** the README shipped inside the published
`@effect/sql-pg@0.53.0` npm tarball still describes the package as "An
`@effect/sql-pg` implementation using the `postgres.js` library." That sentence
is false as of 0.48.0 and was only corrected upstream in
<https://github.com/Effect-TS/effect/pull/7303> (merged 2026-08-17), after
0.53.0 shipped. Read the source, not the README.

### The four traps that are real

Neon documents what does **not** work on a pooled connection: `SET`/`RESET`,
`LISTEN`/`NOTIFY`, `WITH HOLD` cursors, temp tables, `LOAD`, session-level
advisory locks, and SQL-level `PREPARE`/`DEALLOCATE`. Checked against what
`@effect/sql-pg@0.53.0` actually does:

1. **`listen`/`notify` are unusable on `DATABASE_URL`.** As noted in Fact 2.
   Requires `DATABASE_URL_UNPOOLED`. This app should simply not use them.
2. **Query cancellation is silently broken through PgBouncer.** `PgClient`'s
   cancel path issues `SELECT pg_cancel_backend(${processId})` **on a different
   connection borrowed from the pool**. Through PgBouncer the process ID the
   client sees is the pooler's, not the backend's, so the cancel lands on an
   arbitrary backend or nothing at all. The code marks it best-effort and
   swallows failures. Practical effect: **interrupting an Effect fiber will not
   actually cancel the query server-side** — it detaches and the query runs on.
   Harmless for a meal planner's tiny queries; would matter if anything ever
   runs a long report.
3. **Cursor streaming (`pg-cursor`) is at risk** — it holds a portal across
   round trips on one connection, which transaction pooling only guarantees
   inside an explicit transaction. *Not verified end-to-end against Neon.* Avoid
   cursor streaming, or wrap it in a transaction.
4. **Migrations must use `DATABASE_URL_UNPOOLED`.** Neon explicitly reserves
   direct connections for schema migrations
   (<https://neon.com/docs/connect/choose-connection>). Since this document
   already recommends running migrations from the build step, that step must
   read `DATABASE_URL_UNPOOLED`, and the runtime must read `DATABASE_URL`. Both
   are injected by the Marketplace integration, so this costs the self-hoster
   nothing — but getting it backwards produces a failure nobody will diagnose.

### Vercel Fluid compute is what makes a TCP pool acceptable here

Neon's connection guide (<https://neon.com/docs/connect/choose-connection>)
steers *classic* serverless toward the HTTP/WebSocket driver
`@neondatabase/serverless` and away from TCP pools — but it carves out Vercel
Fluid explicitly, on the grounds that "Vercel Fluid keeps functions warm long
enough to reuse TCP connections." Vercel's own docs
(<https://vercel.com/docs/fluid-compute>, last updated 2026-08-24) state that
fluid compute has been **enabled by default for new projects since 2025-04-23**,
list **Hobby** among the supported plans, and describe instances being shared
across concurrent invocations.

So `pg` over TCP is the supported shape on this exact hosting, **conditional on
Fluid being on**. Two consequences, both build-time requirements:

- **Confirm Fluid is enabled on the project.** If it is ever off, a
  per-invocation `pg.Pool` is precisely the anti-pattern Neon warns against.
- **Build the `PgClient` layer once at module scope, not per request handler.**
  Layer release calls `pool.end()` (capped at 1 s). If the scope closes per
  invocation, every request pays a fresh TLS + SCRAM handshake to the pooler and
  Fluid's connection reuse is thrown away.

There is also a documented escape hatch if any of this goes wrong:
`PgClient.layerFromPool({ acquire })` accepts a caller-supplied `Pg.Pool`, so a
hand-tuned pool — or `@neondatabase/serverless`' `Pool`, which is
`pg`-API-compatible — can be dropped in without leaving `@effect/sql-pg`. That
is a meaningful piece of insurance and it should be recorded as the fallback.

### On the cold start: add a retry, not just a longer timeout

Neon's latency page (<https://neon.com/docs/connect/connection-latency>) says
activation "typically takes a few hundred milliseconds", and recommends two
mitigations by name: **increase connection timeouts**, and use **retries with
exponential backoff**. Fact 3 covers the first. The second matters because of a
gap this check could **not** close:

> **Unverified:** whether Neon's proxy *holds* the client connection open while
> a suspended compute wakes, or whether the first connect can outright error
> (`ECONNRESET` or similar). Neon's documentation does not say. The safe
> assumption is that it can error.

So the layer should be wrapped in `Effect.retry` with a short backoff schedule,
not merely given a longer `connectTimeout`. Effect makes that a one-liner, which
is a genuine point in this stack's favour — it is the kind of thing the library
is *for*.

### Nobody has reported doing this before

A search of the `Effect-TS/effect` issue tracker on 2026-08-28 for `neon`,
`serverless sql`, `sql-pg pool`, `"connection pool"`, `sql-pg in:title` and
`lambda in:title` returns **nothing relevant**. The only platform-adjacent
Vercel issue is #5215 (`NodeRuntime.runMain` in Vercel functions, open since
2025-07-14). This is absence of evidence rather than evidence of absence, but it
means: on `@effect/sql-pg` + Vercel + Neon specifically, **there is no upstream
issue trail to lean on when something breaks.**

## Fact 7 — the sharpest risk found in this check: Effect v4 is deleting `pg`

This was not on the list of questions and is the most important thing found.

<https://github.com/Effect-TS/effect/pull/7426> — **"Replace pg with a native
PgProtocol client"** — was **merged into `main` on 2026-08-25**. From the PR
body, verbatim:

> "`PgConnection.make` connects over TCP, Unix sockets, or a caller-supplied
> `Duplex`. Supports libpq URLs, optional TLS through `SSLRequest`, and trust,
> cleartext, MD5, or SCRAM-SHA-256 authentication."

The motivation is benchmark throughput (+25% to +67%). The v4 RC line already
ships `src/PgProtocol.ts`.

**Read that adversarially.** The v4 line replaces battle-tested `node-postgres`
with a **hand-written Postgres wire-protocol implementation, including its own
TLS negotiation and SCRAM-SHA-256**. This project would point that brand-new
codec at **PgBouncer** — not at a real Postgres — over **TLS**, with **SCRAM**.
That is the precise intersection where a from-scratch protocol implementation
fails in ways an upstream test suite running against a plain Postgres container
will not catch. And per Fact 6, there is no Neon/PgBouncer coverage in the
Effect issue tracker to catch it either.

Note the timing: `@effect/sql-pg@4.0.0-rc.112` (2026-08-25) still lists
`pg: ^8.23.0` — the rewrite merged just after that RC was cut. So the change is
ahead of, not behind, the current RC.

Two firm conclusions:

- **Do not adopt the Effect v4 RC against Neon pooled.** This reinforces
  Fact 5's recommendation (start on `effect@3.22`) with a much more specific
  reason than "RCs are risky".
- **The eventual v3 → v4 migration is bigger than a rename.** v4 also
  restructures the config: pool settings move out of `PgClientConfig` into a
  separate `PgPoolConfig extends PgClientConfig`. Combined with the driver
  replacement, that migration is a re-verification of the database layer against
  Neon, not a mechanical find-and-replace. Budget it as such.

## Fact 8 — TanStack Start is officially a Release Candidate, and the version
number is not telling you that

The reassuring thing about the version table in Fact 1 is that
`@tanstack/react-start` is at `1.168.49`. That reassurance is misplaced.

**The official docs still say Release Candidate.** From
<https://tanstack.com/start/latest/docs/framework/react/overview> (source file
`docs/start/framework/react/overview.md`, last committed **2026-06-01**),
verbatim:

> TanStack Start is currently in the **Release Candidate** stage! This means it
> is considered feature-complete and its API is considered stable.
> **This does not mean it is bug-free or without issues, which is why we invite
> you to try it out and provide feedback!**
> The road to v1 will likely be a quick one, so don't wait too long to try it
> out!

To answer the ticket's question precisely: **there is no "not production ready"
caveat in the official docs.** The RC banner above is the strongest warning that
exists, and it explicitly claims a stable API and feature-completeness. That is
a much softer statement than "do not ship this".

**But the version number is a monorepo counter, not a semver GA declaration.**
`@tanstack/react-start` has published 1.x since `1.111.10` on **2025-02-25** —
eighteen months ago — while a doc written 2026-06-01 still describes "the road to
v1" as ahead. The number is shared across the TanStack/router monorepo: Router
is at 1.170.x, `@tanstack/start-plugin-core` at 1.171.39, and
`@tanstack/react-start-rsc` is still at **0.1.48**. Anyone reasoning "it's 1.x,
therefore GA" is misreading a build counter.

**A 2.x is already staged in the same repo.** `@tanstack/solid-start`'s npm
dist-tags on 2026-08-28 include `rc: 2.0.0-rc.4`, `beta: 2.0.0-beta.31` and
`alpha: 2.0.0-alpha.10`, alongside `latest: 1.168.47`. No 2.x exists for
`@tanstack/react-start` yet. *Inference:* a breaking major is being prepared in
the same monorepo and React is likely to follow.

### The breaking-change record is the part that should worry a family app

`packages/react-start/CHANGELOG.md` runs 1400 lines back to 1.166.8 and contains
**no "Major Changes" section and no "BREAKING" entry** — it is entirely
`Patch Changes` and dependency bumps. Of ~500 GitHub release entries fetched
from `TanStack/router` covering 2026-07-13 → 2026-08-29, **zero** release bodies
contain the word "breaking".

That is not evidence of a clean record. It is evidence that **breaking changes
are not surfaced in the release notes**, which are the primary source a
maintainer would consult. Two breaking changes were found only by diffing npm
manifests:

- **`1.133.2` (2025-10-14)** raised the `vite` peer dependency from `>=6.0.0` to
  **`>=7.0.0`** and dropped `@vitejs/plugin-react` as a peer. A required major
  version bump of the build tool, shipped in a patch-looking minor, flagged
  nowhere.
- `1.168.49` adds `@rsbuild/core: ^2.0.0` as an optional peer and marks `vite`
  optional too — the build-tool contract is still moving.

Also: **`engines: { node: ">=22.12.0" }`** on 1.168.49. The Vercel project must
pin the Node 22.x runtime.

*Not verified:* whether there was a Vinxi → Nitro/Vite migration. `vinxi` does
not appear in `@tanstack/react-start`'s dependencies in any version sampled from
1.111.10 onward, and there is no migration guide in the docs nav. If the
household has heard about that migration, it predates the versions that matter.

**Practical consequence:** upgrade risk cannot be assessed from the release
notes. Pin exact versions, and treat any TanStack Start upgrade as a change that
requires actually running the app, not as a routine dependency bump. This is the
same discipline Fact 5 demands for Effect, for a different reason.

## Fact 9 — Vercel works, and it really is one-click — but Vercel is TanStack's
least-invested target and the official template is stale

This is the half of the check that the whole project depends on, because the
Deploy Button is why Vercel was chosen at all. It survives, with caveats.

### Vercel auto-detects TanStack Start — confirmed in Vercel's own source

From `packages/frameworks/src/frameworks.ts` in the `vercel/vercel` repository
(fetched 2026-08-28), verbatim:

```ts
name: 'TanStack Start',
slug: 'tanstack-start',
supersedes: ['ionic-react', 'vite'],
detectors: {
  every: [{ matchPackage: '@tanstack/router-plugin' }],
  some: [
    { matchPackage: '@tanstack/react-start' },
    { matchPackage: '@tanstack/solid-start' },
  ],
},
settings: {
  buildCommand:    { value: 'vite build' },
  devCommand:      { value: 'vite --port $PORT' },
  outputDirectory: { value: 'dist' },
},
```

Vercel's docs list it too: <https://vercel.com/docs/frameworks/more-frameworks>
(last updated 2026-08-11) names "**TanStack Start**: Full-stack Framework
powered by TanStack Router for React and Solid" **with a Deploy link**, and the
support matrix at <https://vercel.com/docs/frameworks> (2026-08-11) gives the
TanStack column: Static Assets ✓, SSR ✓, Streaming SSR ✓, Edge Routing Rules ✓,
Routing Middleware ✓, Output File Tracing ✓; ISR ✗; Image Optimization and Skew
Protection N/A.

**So the one-click Deploy Button flow this whole document is optimising for does
work with TanStack Start, first-party, with no `vercel.json`.** That is the
finding that keeps the stack alive.

### The detection gotcha that would silently break the self-hoster

Read the detector again: the `every` clause requires **`@tanstack/router-plugin`
in `package.json`**. A project that depends only on `@tanstack/react-start` —
which pulls the plugin in transitively — is **not** detected, and falls back to
the generic `vite` preset: a client-only static deploy, no SSR, no server
functions. The app would build, deploy, and then simply not work, with no error
naming the cause.

**Requirement: keep `@tanstack/router-plugin` as an explicit direct dependency
in `package.json`, and write a comment above it saying why.** This is exactly
the class of trap the ticket exists to eliminate, and it costs one line to
avoid. *(Inference from the detector logic; not confirmed by an actual deploy.)*

### What TanStack itself says about Vercel: two sentences

The entire `### Vercel` section of
<https://tanstack.com/start/latest/docs/framework/react/guide/hosting> (source
last committed 2026-07-13) is:

> Follow the [`Nitro`](#nitro) deployment instructions.
> Deploy your application to Vercel using their one-click deployment process,
> and you're ready to go!

For comparison, the same page names **Cloudflare, Netlify and Railway** as
"Official Hosting Partners" and recommends them; Netlify has a dedicated
`@netlify/vite-plugin-tanstack-start`; Cloudflare gets a full walkthrough.
**Vercel is not an Official Hosting Partner.** It is the least-invested-in target
of the documented options.

There is also no zero-config claim from TanStack's side: *inference from the
primary sources, since the docs do not spell it out* — the project must install
`nitro` and add the `nitro()` plugin from `nitro/vite` to `vite.config.ts`, or
the build produces a client bundle with no SSR. "One plugin, no platform config
file" is the honest description, not "zero config".

### Two things that are genuinely shaky

**Nitro is the path to Vercel, and TanStack labels it unfinished.** From the same
hosting doc, verbatim:

> ⚠️ The [`nitro/vite`](https://nitro.build/) plugin natively integrates with
> Vite Environments API as the underlying build tool for TanStack Start. It is
> still under active development and receives regular updates. Please report any
> issues you encounter with reproduction so they can be investigated.

**Vercel's own TanStack Start example is ten months stale and pins an alpha.**
<https://github.com/vercel/vercel/tree/main/examples/tanstack-start> was last
committed **2026-05-11** ("pin @tanstack/* deps to safe versions (INC-6508)").
Its `package.json` pins `@tanstack/react-start@1.133.37` (October 2025, ~35
minors behind `latest`) and, critically, **`nitro: "3.0.1-alpha.0"`**. It
contains no `vercel.json`. So the template a self-hoster would clone from
Vercel's own Deploy link is badly out of date and depends on an alpha build of
Nitro. **This repo should not clone that example. It should generate a fresh
TanStack Start app on current versions and rely on framework auto-detection,
which is independent of the example.**

*Not verified:* how Vercel reconciles the preset's `outputDirectory: 'dist'`
with Nitro's Vercel preset emitting Build Output API v3 into `.vercel/output`.
The expected behaviour is that `.vercel/output` wins when present — that is
standard Build Output API behaviour and is presumably why the zero-config path
works — but this was not confirmed for TanStack Start specifically. **It is the
first thing to test on the very first deploy.**

### Vercel Hobby limits: the duration one is a non-issue

<https://vercel.com/docs/functions/limitations> (last updated 2026-08-24)
confirms Hobby at **300 s default and maximum** — already recorded earlier in
this document, and it supersedes the 10 s / 60 s figures the household was
working from. SSR renders and Start server-function calls are sub-second work.
Not a constraint.

The Hobby limits that could actually bite are different ones from the same page:
**2 GB memory / 1 vCPU** (not raisable on Hobby), a **4.5 MB request/response
body cap** (`FUNCTION_PAYLOAD_TOO_LARGE`), and **single region only**. None
threaten a meal planner; the 4.5 MB cap is worth remembering if the app ever
grows a bulk import or an image upload.

## Fact 10 — refinements from a closer read of Effect's own changelogs and
migration guide

Three of these soften the picture, three sharpen it. All from primary sources on
2026-08-28.

### Softer than feared: core `effect` 3.x really has been stable

A grep of the entire v3 `packages/effect/CHANGELOG.md` (9,950 lines, on the `v3`
branch — note it is **not** on `main` any more) for the word "breaking" returns
**zero matches**, and `### Major Changes` appears exactly twice, at 2.0.0 and
3.0.0. Twenty-three minors from 3.0.0 (2024-04-16) to 3.22.0 (2026-07-13).

*Inference from absence, but a strong one*: this is a changeset-generated
changelog, so maintainers flagging breakage would show up. **The core library's
stability claim is real**, and that is the part the app's business logic sits on.

### Softer than feared: most satellite minors are mechanical

Checking the content rather than counting version numbers: `@effect/platform`
0.95.0 / 0.96.0 / 0.97.0 and `@effect/sql-pg` 0.46 / 0.47 / 0.50 / 0.51 / 0.52 /
0.53 contain **only** `Patch Changes → Updated dependencies → effect@3.2x.0`.
They bump a minor because their peer bumped a minor, not because anything broke.

Quantified: over the last twelve months `@effect/platform` shipped 7 minors and
`@effect/sql-pg` 6. Of those ~13, roughly **3 carried real breakage** — including
the driver swap already discussed, plus, in `@effect/platform`:

- 0.85.0 (2025-06-15) "HttpApiBuilder `.handleRaw` no longer parses the request body"
- 0.90.0 (2025-07-22) "Changes `Terminal.readInput` to return a `ReadonlyMailbox` of events"
- 0.91.0 (2025-09-23) "remove msgpackr re-exports"

So the honest rate is **about one genuinely breaking satellite release every four
months, never labelled as breaking.** That is materially better than "breaks every
minor", and still bad enough to justify pinning.

### Sharper: Effect 4.0 stable is targeted for Q3/Q4 2026 — i.e. now-ish

From the RC announcement (<https://www.effect.website/blog/releases/effect/40-rc>,
2026-08-12): "We are targeting the stable release for Q3/Q4 2026", and "We have
no more broad breaking changes planned." The beta post
(<https://www.effect.website/blog/releases/effect/40-beta>, 2026-02-18) commits
that "Effect v3 will continue to receive active maintenance after v4 reaches
stability" — but with "a feature freeze for v3: bug fixes and security patches
will continue, but new features will be developed exclusively for v4."

That is a reasonable deal for this project: a frozen, security-patched v3 is
close to ideal for an app that wants to sit still. But it confirms the migration
is a *when*, not an *if*, and "when" is measured in months.

### Sharper: v4 does not end the churn for the modules this app uses

This is the finding that most changes the shape of Fact 5. Verbatim from the v4
migration guide
(<https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md>):

> ### Unstable Module System
> v4 introduces **unstable modules** under `effect/unstable/*` import paths. These
> modules **may receive breaking changes in minor releases**, while modules
> outside `unstable/` follow strict semver.
> Unstable modules include: `ai`, `cli`, `cluster`, `devtools`, `eventlog`,
> `http`, `httpapi`, `jsonschema`, `observability`, `persistence`, `process`,
> `reactivity`, `rpc`, **`schema`**, `socket`, **`sql`**, `workflow`, `workers`.

`schema`, `sql` and `http` are precisely what a meal planner touches beyond
`Effect` and `Layer`. **The 0.x satellite churn is being renamed, not removed.**
Do not expect 4.0 to deliver a quiet dependency tree; expect it to deliver a
quiet *core* and a still-moving edge.

Also from the migration guide: `@effect/platform` is **merged into core `effect`**
in v4 (confirmed independently — `@effect/platform` has zero 4.x versions on npm,
while `@effect/platform-node` has 110), and `effect@4.0.0-rc.112` is **ESM-only**
(`"type": "module"`, no `main`), where `3.22.1` is dual CJS+ESM. Separately,
**`@effect/schema` is already deprecated** — its npm `deprecated` field reads
"this package has been merged into the main effect package", which landed in
`effect@3.10.0`. Use `Schema` from `effect`; never add `@effect/schema`.

The migration is not cosmetic. GitHub issue
<https://github.com/Effect-TS/effect/issues/6379> (opened 2026-02-20, closed
2026-08-09) catalogues what a real migration hit: `Effect.once`, `Effect.iterate`,
`Effect.reduce` and `Effect.if` gone; **all do-notation (`Effect.Do`,
`Effect.bind`, `Effect.let`, `Effect.bindTo`) gone**; `Effect.gen`'s `_`
parameter removed; `Context.Tag` → `Context.Service`; `FiberRef` →
`Context.Reference`; `Runtime<R>` **removed entirely**; `Schema.Data` gone.

### Sharper, and immediately actionable: a v3 layer-memoization footgun that
would open two database pools

From <https://github.com/Effect-TS/effect-smol/blob/main/migration/layer-memoization.md>,
verbatim:

> "In v3, each call to `Effect.provide` created its own memoization scope… two
> `Effect.provide` calls with overlapping layers would silently build those
> layers twice. In v4, the underlying `MemoMap`… is shared between
> `Effect.provide` calls."

Applied here: **two `Effect.provide` calls touching the `PgClient` layer in a v3
server function will silently construct two connection pools.** Combined with
Fact 6's requirement to hoist the layer to module scope, the rule is concrete:
build **one** `ManagedRuntime` at module scope and provide from it; never call
`Effect.provide` with the database layer inside a request handler.

## Fact 11 — revising Fact 4 downward: the prior art is real, but thinner than
the repo count suggests

Fact 4 counted repositories. Counting adoption instead gives a soberer answer,
and the correction belongs in the record.

- **There is no official integration from either side.** `@effect/tanstack` does
  not exist on npm (registry returns `{"error":"Not found"}`). There is no Effect
  example in the TanStack repo and no mention of Effect in the TanStack Start
  docs. Searching `Effect-TS/effect` for "tanstack" returns 7 results, none about
  TanStack Start.
- The **one** official touchpoint is in TanStack *Router* (not Start): the
  search-params guide documents Effect Schema working without an adapter, because
  Effect Schema implements Standard Schema. That is a happy coincidence of a
  shared spec, not an integration.
- **There is one community npm package**, `effect-tanstack-start`
  (`EthanShoeDev/effect-tanstack-start`, 5 stars, one maintainer, 9 versions,
  first published 2026-03-20), which "seamlessly integrate[s] Effect `HttpApi`
  with TanStack Start". Its download count is the number that matters:
  **1,264 downloads in the month to 2026-08-27, against 73.6M for
  `@tanstack/react-start` and 120.6M for `effect`.** That is ~0.002% of TanStack
  Start installs.
- Of the starter repos in Fact 4, the **highest-starred one is a trap**:
  `lucas-barake/effect-tanstack-start` (35 stars) is a single commit whose README
  is the unmodified TanStack scaffold template. Not a usable reference.
- And the most substantive examples are **already on Effect v4 beta**, which
  means the v3 prior art — the line this document recommends starting on — is
  thinner still.

**Revised verdict on Fact 4:** the combination is *not hostile* — TanStack Start
is plain Vite plus web-standard handlers, and nothing found says it is broken —
but this repo would be **an early adopter writing its own runtime-lifecycle
glue**, against a library whose serverless story is undocumented. Effect's docs
have **no serverless or edge deployment page at all**; `ManagedRuntime` is
covered only as a generic integration tool.

### The pattern to copy anyway

The de-facto approach, from `effect-tanstack-start`'s README, is worth adopting
verbatim and is consistent with everything above: create the `ManagedRuntime` at
**module level inside a `.server.ts`-suffixed file**, so TanStack Start's import
protection strips it from the client bundle, with a matching client runtime. Its
own warning, verbatim:

> "Don't provide stateful services (those backed by `Ref`, database connections,
> etc.) inside `ApiImplLive`. They should come from the runtime so that both the
> SSR client and HTTP handler share the same instances."

That is the same instruction Fact 6 and Fact 10 arrive at from two other
directions: **one runtime, one pool, hoisted to module scope, on the server side
of the import boundary.** If this repo gets that one thing right, most of the
integration risk in this document is retired.

### Not verified

- Whether Vite SSR needs `ssr.noExternal` for Effect. No primary source found in
  either direction; the Effect tracker has **zero** `optimizeDeps` issues and no
  open Vite SSR externalization issue. The v3 dual CJS/ESM shape is a theoretical
  dual-package hazard; v4 being ESM-only removes it.
- Any Symbol/generator transpile problem with Effect. No affirmative report found,
  and no affirmative all-clear either.
- Effect's GitHub milestones are not exposed via the API, so the remaining issue
  count before 4.0 stable could not be confirmed.
- The Effect blog quotes above were read through a fetch summarizer rather than as
  raw text. The MIGRATION.md, changelog, npm registry and GitHub API quotes
  elsewhere in this addendum are raw primary text.

## Sources for this addendum

All checked **2026-08-28** unless noted.

**Registry (raw JSON):** `https://registry.npmjs.org/` for `@tanstack/react-start`,
`@tanstack/react-router`, `@tanstack/start-plugin-core`, `@tanstack/solid-start`,
`effect`, `@effect/sql-pg`, `@effect/sql`, `@effect/platform`,
`@effect/platform-node`, `@effect/schema`, `effect-tanstack-start`; plus the
published tarballs of `@effect/sql-pg@0.53.0` and `@effect/sql-pg@4.0.0-rc.112`.

**Source code:**
- `Effect-TS/effect`, `packages/sql-pg/src/PgClient.ts` (v0.53.0 and v4.0.0-rc.112 tarballs)
- `brianc/node-postgres`, `packages/pg/lib/query.js` (`master`)
- `vercel/vercel`, `packages/frameworks/src/frameworks.ts` (`main`)
- <https://github.com/Effect-TS/effect/blob/v3/packages/effect/CHANGELOG.md>
- <https://github.com/Effect-TS/effect/blob/v3/packages/platform/CHANGELOG.md>
- <https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md>
- <https://github.com/Effect-TS/effect-smol/blob/main/migration/layer-memoization.md>
- <https://github.com/Effect-TS/effect/pull/7426> (merged 2026-08-25)
- <https://github.com/Effect-TS/effect/pull/7303> (merged 2026-08-17)
- <https://github.com/Effect-TS/effect/issues/6379>
- <https://github.com/vercel/vercel/tree/main/examples/tanstack-start> (last commit 2026-05-11)

**Docs:**
- <https://tanstack.com/start/latest/docs/framework/react/overview> (source last committed 2026-06-01)
- <https://tanstack.com/start/latest/docs/framework/react/guide/hosting> (2026-07-13)
- <https://tanstack.com/router/latest/docs/framework/react/guide/search-params>
- <https://vercel.com/docs/frameworks> (2026-08-11)
- <https://vercel.com/docs/frameworks/more-frameworks> (2026-08-11)
- <https://vercel.com/docs/fluid-compute> (2026-08-24)
- <https://vercel.com/docs/functions/limitations> (2026-08-24)
- <https://neon.com/docs/connect/connection-pooling>
- <https://neon.com/docs/connect/connection-latency>
- <https://neon.com/docs/connect/choose-connection>
- <https://www.effect.website/blog/releases/effect/40-beta> (2026-02-18)
- <https://www.effect.website/blog/releases/effect/40-rc> (2026-08-12)
