# Gating a Vercel production deploy on GitHub Actions CI

Research for [issue #27](https://github.com/lfeq/food-organizer/issues/27), part of
[#25](https://github.com/lfeq/food-organizer/issues/25).
All facts below were checked against primary sources on **2026-08-29**. Vercel
plan boundaries and GitHub feature gating change often; re-check the dates before
relying on any of them.

## Question

What mechanisms make a Vercel *production* deploy wait for, or depend on, a
GitHub Actions CI run passing, and what does each cost?

For every mechanism: does it work on the Vercel **Hobby** plan and a free GitHub
account; does it preserve **preview deployments**; what does a **forker** see
(the SPEC's one-click "Deploy with Vercel" story must keep working for someone
with no CI history and none of our secrets); and how does it behave when CI is
**slow, never reports, or is skipped**?

## Headline finding: there is a first-party mechanism, and it is not the one the ticket names

Vercel ships **Deployment Checks** — a project setting that reads GitHub commit
statuses and GitHub Actions check runs and *holds a production deployment out of
the production domain until the selected checks pass*. It is exactly the feature
#25 is asking for, it is documented, and it was not on the ticket's list. The
three mechanisms the ticket names all work too, but each is a worse fit for a
personal, forkable, Hobby-plan project than the built-in one — and one of them
(merge queue) is not available to this repository at all.

Note also, established below: this repository is **private and owned by a personal
account**, which removes GitHub branch protection *and* merge queues from the table
until it goes public.

---

## Mechanism A — Vercel Deployment Checks (GitHub Checks provider)

**Fact 1.** Deployment Checks are "conditions that must be met before promoting a
production build to your production environment." Vercel still creates the
production deployment, but "will hold each production deployment until all
required checks pass before assigning it to your custom production domains."
The documented workflow is: push to the default branch → Vercel creates a
production deployment → run safety checks → once passing, release.
<https://vercel.com/docs/deployment-checks> (last updated 2026-08-11)

**Fact 2.** The GitHub provider reads *existing* CI results, with no workflow
changes required in the normal case: "When a project is connected to GitHub using
Vercel for GitHub, Vercel can read the statuses of your commits and selected
GitHub Action results. Using these statuses, Vercel can prevent production
deployments from promoting to production until your checks have passed." Setup is
three dashboard steps — link the repo, ensure automatic aliasing for production is
on, then Settings → Build and Deployment → Deployment Checks → **Add Checks** →
provider **GitHub** → pick the check names.
<https://vercel.com/docs/deployment-checks>

**Fact 3.** The `vercel/repository-dispatch/actions/status@v1` action is only
*required* when the workflow is triggered by `repository_dispatch`; otherwise "you
can depend on the check directly."
<https://vercel.com/docs/deployment-checks>

**Fact 4.** Checks are identified **by GitHub job name**, and Vercel deliberately
inherits GitHub's edge cases: "Changing the name of a job requires updating your
Deployment Checks to align with the names," and "Avoid using the same name for
actions across multiple workflows. Due to GitHub's implementation of Check Runs,
these will collide and introduce race conditions when used with GitHub branch
protection rules, GitHub rulesets, and Vercel Deployment Checks." A rename of the
`test` job silently un-gates production.
<https://vercel.com/docs/deployment-checks>

**Fact 5.** There is a documented manual override: "You can bypass Deployment
Checks by selecting **Force Promote** from the deployment details page."
<https://vercel.com/docs/deployment-checks>

**Fact 6.** The feature was announced 2025-10-09 as available to "all projects with
GitHub repository connections"; the newer *native* checks changelog (2026-04-28)
says they are available to every team. Neither the docs page nor the
Hobby-vs-Pro comparison table names a plan gate for Deployment Checks.
<https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions>,
<https://vercel.com/changelog/native-deployment-checks>,
<https://vercel.com/docs/plans/hobby> (2026-08-11)

- **Hobby:** **unverified.** No primary source states that Deployment Checks are
  gated by plan, and none states they are available on Hobby either. The Hobby/Pro
  comparison table on `/docs/plans/hobby` does not mention them. The changelogs say
  "every team", and a Hobby personal account is now a Hobby *team*
  (<https://vercel.com/docs/plans/hobby>, "When your personal account gets converted
  to a Hobby team…"). **This is the single fact most worth confirming by opening
  the dashboard before committing to this mechanism.**
- **Previews:** preserved. Deployment Checks gate *promotion to the production
  domain* only; preview deployments are untouched.
- **CI slow / never reports / skipped:** the deployment is built and sits
  unpromoted. The previous production deployment keeps serving. There is no
  documented timeout — a check that never reports means production simply never
  advances, which is fail-closed. **Unverified:** whether Vercel eventually times
  out a pending check.
- **Forker:** the forker's own Vercel project has an empty Deployment Checks list
  (it is a project setting, not repo content), so their deploys promote normally.
  Nothing in `vercel.json` or `.github/` carries this configuration. This is the
  mechanism's biggest advantage for #25.
- **Cost:** dashboard configuration only; no new secrets, no workflow changes, no
  extra build minutes. Requires production auto-aliasing to stay **on**.

---

## Mechanism B — Ignored Build Step / `ignoreCommand`

**Fact 7.** The exit-code contract is inverted from intuition. "When your
deployment enters the `BUILDING` state, the command you've entered in the Ignored
Build Step section will be run… If the command exits with code `1`, the build
continues as normal. If the command exits with code `0`, the build is immediately
aborted, and the deployment state is set to `CANCELED`."
<https://vercel.com/docs/project-configuration/project-settings#ignored-build-step>
(2026-08-25); same contract in the KB guide,
<https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel>

**Fact 8.** It can live in the repo: `vercel.json`'s `ignoreCommand` (type
`string | null`) "overrides the Ignored Build Step in Project Settings… When the
command exits with code 1, the build will continue. When the command exits with 0,
the build is ignored."
<https://vercel.com/docs/project-configuration/vercel-json#ignorecommand> (2026-08-14)

**Fact 9.** The command "is executed within the Root Directory and can access all
System Environment Variables." The available Git variables include
`VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_REPO_OWNER`, `VERCEL_GIT_REPO_SLUG`,
`VERCEL_GIT_COMMIT_REF`, `VERCEL_ENV`, and `VERCEL_GIT_PREVIOUS_SHA` (the latter
"only exposed when an Ignored Build Step is provided"). **There is no
`GITHUB_TOKEN` and no GitHub credential of any kind in the system environment
variable list.**
<https://vercel.com/docs/environment-variables/system-environment-variables> (2026-07-15)

So the command *can* identify the commit, but to query
`GET /repos/{owner}/{repo}/commits/{sha}/check-runs` on a private repo it would
need a personal access token stored by hand as a Vercel environment variable — a
long-lived GitHub credential living in Vercel, rotated by nobody. (For a *public*
repo the check-runs endpoint is readable unauthenticated, but at 60 requests/hour
per IP on a shared build IP.)

**Fact 10.** Skipping is not free and it is not silent: "Canceled builds are
counted as full deployments as they execute a build command in the build step.
This means that any canceled builds initiated using the ignore build step will
still count towards your deployment quotas and concurrent build slots."
Hobby's quota is 100 deployments per day / 100 per hour / 60 per five minutes.
<https://vercel.com/docs/project-configuration/project-settings#ignored-build-step>,
<https://vercel.com/docs/limits> (2026-08-25)

**Fact 11.** A `CANCELED` deployment never becomes the production deployment, so
the previous production deployment keeps serving — production state is only
replaced by a successful production build being aliased. The three production
deployment states are Staged, Promoted and Current, and only the **Current** one is
"aliased to your domain and the one that is currently being served to your users."
<https://vercel.com/docs/deployments/promoting-a-deployment> (2026-06-26)

**Fact 12.** Vercel emits a distinct `repository_dispatch` event for this case —
`vercel.deployment.ignored`, documented as "canceled as a result of the ignored
build script" — so a skip is observable from GitHub Actions if you want to react
to it.
<https://vercel.com/docs/git/vercel-for-github#repository-dispatch-events> (2026-08-11)

- **Hobby:** yes. It is a plain project setting / `vercel.json` key with no plan gate.
- **Previews:** preserved if the command branches on `VERCEL_ENV` (the built-in
  "Only build production" preset is literally this). Written carelessly it kills
  previews too.
- **CI slow / never reports / skipped:** this is the mechanism's fatal flaw. The
  ignore command runs **once**, synchronously, at the moment the deployment enters
  `BUILDING` — which is seconds after the push, while `npm ci && typecheck && test`
  is still starting. Nothing in the docs polls or waits. The author must choose:
  fail closed (exit 0 → nothing ever deploys, because CI is essentially never
  finished that early) or fail open (exit 1 → the gate does nothing). Making it
  work means writing a bespoke polling loop inside the ignore command, burning
  Vercel build time waiting on GitHub, with no documented timeout budget.
  **Unverified:** whether the ignore command has outbound network access. Nothing
  in the primary docs states it; general build-container network access is implied
  by the install step but not asserted for this command.
- **Forker:** the `vercel.json` `ignoreCommand` **is repo content and travels with
  the fork.** A forker gets our polling logic, without our PAT env var and possibly
  without CI history for their commits. Whichever way the script fails on missing
  input decides whether their first deploy works. This directly threatens the
  one-click story in #25's notes.

---

## Mechanism C — Deploy from GitHub Actions (`vercel build` + `vercel deploy --prebuilt --prod`)

**Fact 13.** Disabling Vercel's own Git deploys is a `vercel.json` key:
`git.deploymentEnabled` accepts an object of branch patterns → boolean, or a plain
boolean; "To turn off automatic deployments for all branches, set the property
value to `false`." Per-branch minimatch patterns are supported, so
`{"main": false}` disables production only and leaves preview branches on Vercel's
integration.
<https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled> (2026-08-25)

**Fact 14.** The documented CI sequence, from Vercel's own GitHub page: install
`vercel@latest`, `vercel pull --yes --environment=production --token=$VERCEL_TOKEN`,
`vercel build --prod`, then `vercel deploy --prebuilt --prod`. "You'll need separate
GitHub Actions for preview (non-`main` pushes) and production (`main` pushes)."
<https://vercel.com/docs/git/vercel-for-github#using-github-actions>

**Fact 15.** The secrets are exactly three: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`. The latter two are the `orgId` and `projectId` written into
`.vercel/project.json` when the CLI links a directory.
<https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel>,
<https://vercel.com/docs/cli/project-linking> (2026-08-11)

**Fact 16.** The same KB guide warns that without `git.deploymentEnabled: false`,
"both Vercel's integration and your GitHub Actions workflow trigger on the same
push" — i.e. you get double deployments and double quota consumption.
<https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel>

**Fact 17.** `--prebuilt` has a real cost for this app: "When using the `--prebuilt`
flag, System Environment Variables will be missing at build time, so frameworks
that rely on them at build time may not function correctly… If you need System
Environment Variables at build time, do not use the `--prebuilt` flag or use
Git-based deployments." Our build command is
`node scripts/migrate.mjs && vite build`; anything in it that reads `VERCEL_*` (or
`VERCEL_ENV` to pick a database) breaks. The plain `vercel deploy --prod` variant
(build on Vercel, trigger from Actions) avoids this at the cost of uploading source.
<https://vercel.com/docs/cli/deploy#prebuilt> (2026-08-11)

**Fact 18.** Fork behaviour is decided by a single GitHub rule: "With the exception
of `GITHUB_TOKEN`, secrets are not passed to the runner when a workflow is
triggered from a forked repository."
<https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets>

- **Hobby:** yes. Nothing here is plan-gated; CLI deployments count against the same
  100/day Hobby quota (<https://vercel.com/docs/limits>).
- **Previews:** preserved only if you either scope `git.deploymentEnabled` to `main`
  alone, or write a second preview workflow. Turning it off wholesale kills PR
  previews, which is the thing #25 explicitly leaves unspecified.
- **CI slow / never reports / skipped:** correct by construction. The deploy job
  `needs:` the test job; if tests never run, the deploy job never runs, and
  production stays on the previous deployment. No polling, no timeout guessing.
  This is the mechanism with the cleanest CI-never-reports story. The corresponding
  weakness is silence: a path-filtered or skipped workflow means production simply
  never updates, with no signal on the Vercel dashboard.
- **Forker:** this is where it hurts. The forker inherits `.github/workflows/` **and**
  `vercel.json`'s `git.deploymentEnabled: false`. Their Vercel Git integration is
  therefore switched off by our repo content, and the workflow that was supposed to
  replace it has no `VERCEL_TOKEN` — a fork's push-to-`main` workflow runs with the
  fork's own (empty) secrets, so the CLI step fails on a missing token. Net effect:
  **the fork never deploys anything after the first one.** The "Deploy with Vercel"
  button itself still works — it "allows users to deploy a new project through the
  Vercel Project creation flow, while cloning the source Git repository"
  (<https://vercel.com/docs/deploy-button>, 2025-03-12) — so their *first* deploy
  succeeds and every subsequent push silently does nothing. That is a worse failure
  than an outright error.
- **Cost:** three secrets to provision and rotate; a duplicated build (Actions
  builds, Vercel hosts) or a second preview workflow; loss of build-time system env
  vars under `--prebuilt`; and a repo-content change that breaks forkers.

---

## Mechanism D — Branch protection, required status checks, merge queue

**Fact 19.** This repository is currently **private and owned by a personal
account** (`gh repo view lfeq/food-organizer --json visibility,isInOrganization`
→ `{"isFork":false,"isInOrganization":false,"visibility":"PRIVATE"}`, checked
2026-08-29). That single fact decides most of this section.

**Fact 20.** "Protected branches are available in public repositories with GitHub
Free and GitHub Free for organizations. Protected branches are also available in
public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise
Cloud, and GitHub Enterprise Server."
<https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/protected-branches.md>,
rendered at
<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>
→ **not available on this repo today** (Free + private). Available for free the
moment it goes public.

**Fact 21.** "Pull request merge queues are available in any public repository owned
by an organization, or in private repositories owned by organizations using GitHub
Enterprise Cloud."
<https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/merge-queue.md>,
rendered at
<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue>
→ **merge queue is unavailable to a personal-account repo at any price**, public
or private. Going public is not enough; the repo would have to move into an
organization.

**Fact 22.** Required status checks are satisfied loosely: "Required status checks
must have a `successful`, `skipped`, or `neutral` status before collaborators can
make changes to a protected branch." A check that **never reports** blocks the
merge; a check that reports `skipped` (a path-filtered workflow that GitHub records
as skipped) **passes the gate**.
<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>

**Fact 23.** Merge queue requires CI rework, not just a toggle: "A merge queue will
wait for required checks to be reported before it can proceed with merging. You
must update your CI configuration to trigger and report on merge group events when
requiring a merge queue," and "A merge queue cannot be enabled with branch
protection rules that use wildcard characters (`*`) in the branch name pattern."
Our `ci.yml` triggers on `push` and `pull_request` only, so it would need a
`merge_group` trigger added.
<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue>

**Fact 24.** Rulesets (the modern replacement for branch protection rules) are
themselves partly gated: "A ruleset is a named list of rules that applies to a
repository **or to multiple repositories in an organization for customers on GitHub
Team and Enterprise plans**." Repository-level rulesets follow the same public-repo
availability as protected branches.
<https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>

- **Hobby (Vercel):** irrelevant — this is entirely a GitHub-side mechanism, and it
  costs nothing on Vercel.
- **Previews:** fully preserved. Vercel's Git integration is untouched.
- **CI slow / never reports:** blocks the *merge*, not the deploy. Which is the
  catch: branch protection only makes `main` green **by construction for merges**.
  It does nothing about a direct push to `main` by the repo owner (who can bypass
  their own rules), and nothing about a merge commit whose combined tree fails even
  though each PR passed. #25's stated failure — "a push with failing tests still
  ships" — is only half-closed by this.
- **Forker:** completely invisible. Branch protection and rulesets are repository
  settings, not repo content; a fork starts with none. This is the most
  fork-transparent mechanism of the four.

---

## Mechanism E — Staged production deploys + manual promotion (`--skip-domain` / auto-assign off)

Not on the ticket's list, but it is the primitive Deployment Checks is built on, and
it can be driven from Actions.

**Fact 25.** Turning off "Auto-assign Custom Production Domains" (Settings →
Environments → Production → Branch Tracking) makes every `main` build a **Staged**
production deployment that must be manually promoted; "Vercel will instantly promote
the deployment; it doesn't require a rebuild." The CLI equivalent is
`vercel deploy --prod --skip-domain`, which "will disable the automatic promotion
(aliasing) of the relevant domains to a new production deployment. You can use
`vercel promote` to complete the domain-assignment process later."
<https://vercel.com/docs/deployments/promoting-a-deployment>,
<https://vercel.com/docs/cli/deploy#skip-domain>

A CI job that `needs:` the test job and runs `vercel promote` gives the same gate as
Mechanism C without disabling Vercel's Git integration — but it still needs
`VERCEL_TOKEN`, and it still breaks for a forker (their deploys would stage and never
promote, because auto-assign is a **project setting** they do not inherit — so
actually their side is fine; the setting is ours alone). Note that Deployment Checks
require auto-aliasing to be **on** (Fact 2), so E and A are mutually exclusive.

---

## Mechanism F — Deploy Hooks with auto-deploy disabled

**Fact 26.** A Deploy Hook is an unauthenticated URL bound to a project *and branch*:
"send a GET or POST request to the provided URL… You do not need to add an
authorization header." Hobby allows 5 hooks per project and 60 triggers/hour/project.
<https://vercel.com/docs/deploy-hooks> (2026-08-11)

Combined with `git.deploymentEnabled: false`, an Actions job that `needs:` the test
job can `curl` the hook. It avoids the Vercel CLI and `--prebuilt` entirely (Vercel
still does the build, so system env vars are intact — Fact 17 does not apply). The
hook URL is still a secret ("this allows anyone with the URL to deploy your project,
treat it with the same security as you would any other token"), so the fork story is
identical to Mechanism C: the forker inherits `git.deploymentEnabled: false` plus a
workflow with no hook secret, and never deploys again.

---

## Mechanism G — Things that look like a gate and are not

**Fact 27.** **Vercel Deployment Protection is access control, not a build gate.**
"Deployment Protection lets you control who can access your preview and production
URLs." On Hobby only Vercel Authentication with Standard Protection is available,
and Standard Protection explicitly leaves the production domain public: "This
protects your preview deployments and deployment URLs, but your production domain
remains publicly accessible. To protect production domains, you need a Pro or
Enterprise plan." It cannot stop a broken build from shipping.
<https://vercel.com/docs/deployment-protection> (2026-08-21)

**Fact 28.** **GitHub deployment environments with required reviewers gate Actions
jobs, not Vercel's Git integration.** "Environments, environment secrets, and
deployment protection rules are available in public repositories for all current
GitHub plans… For access to environments, environment secrets, and deployment
branches in private or internal repositories, you must use GitHub Pro, GitHub Team,
or GitHub Enterprise. If you are on a GitHub Free, Pro, or Team plan, other
deployment protection rules, such as a wait timer or required reviewers, are only
available for public repositories." A job with `environment:` pauses until approved
— useful only in combination with Mechanism C/F, where the deploy is an Actions job.
<https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/environments.md>,
rendered at
<https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments>

**Fact 29.** **`Require Verified Commits` is not a CI gate either**, though it sits
in the same settings page and does cancel deployments: "When enabled, Vercel will
only create deployments for commits that have been verified by GitHub. For all other
commits, the deployment will be automatically canceled."
<https://vercel.com/docs/project-configuration/git-settings> (2026-08-25)

**Fact 30.** Fork PRs never leak our Vercel project by default: "If you receive a
pull request from a fork of your repository, Vercel will require authorization from
you or a team member to deploy the pull request. This behavior protects you from
leaking sensitive project information such as environment variables and the OIDC
Token." (Toggleable as Git Fork Protection.)
<https://vercel.com/docs/git/vercel-for-github#deployment-authorizations-for-forks>

---

## Trade-off summary

| Mechanism | Hobby plan | Previews preserved | Forker impact | CI never reports |
|---|---|---|---|---|
| **A. Vercel Deployment Checks (GitHub)** | **Unverified** — no documented plan gate; changelogs say "every team" (Facts 1, 6) | Yes — gates promotion only | **None.** Project setting, not repo content | Deployment builds but is never promoted; previous production keeps serving (fail-closed, no documented timeout) |
| **B. Ignored Build Step / `ignoreCommand`** | Yes (Fact 7) | Yes, if branched on `VERCEL_ENV` | **Bad.** `vercel.json` travels with the fork; needs our PAT | Runs once at `BUILDING`, seconds after push — must fail open (no gate) or fail closed (never deploys) unless you write a polling loop |
| **C. Deploy from Actions (`--prebuilt --prod`)** | Yes (Fact 15) | Only with per-branch `deploymentEnabled` or a 2nd workflow | **Worst.** Inherits `deploymentEnabled: false` + a workflow with no secrets → first deploy works, every later push silently does nothing | Correct by construction — deploy job never runs; silent on the Vercel side |
| **D. Branch protection / required checks** | N/A (GitHub-side, free) | Yes, untouched | **None.** Repo setting, not content | Blocks the merge; but `skipped` checks pass, and direct pushes to `main` bypass it |
| **D′. Merge queue** | **Unavailable** — personal-account repo (Facts 19, 21) | — | — | — |
| **E. Staged deploys + `vercel promote`** | Yes (Fact 25) | Yes | Auto-assign is our project setting; forker unaffected, but they inherit no promote workflow | Deployment stages forever; mutually exclusive with A |
| **F. Deploy Hook + auto-deploy off** | Yes, 5 hooks / 60 triggers per hour (Fact 26) | Same caveat as C | Same as C | Same as C |
| **G. Deployment Protection / verified commits** | Hobby: production domain stays public (Fact 27) | — | — | Not a CI gate at all |

## What this implies for #25

The decision hinges on two facts that were not in the ticket's framing. First,
**this repo is private and personal-account-owned** (Fact 19), which removes branch
protection (Fact 20) *and* merge queues (Fact 21) from the table entirely — option 3
as written is not buildable today, and going public would recover only the branch
protection half. Second, **Vercel has a purpose-built feature for exactly this
gate** (Facts 1–2) that lives entirely in project settings, so it does not travel
with a fork — which is precisely the constraint #25's notes single out ("the SPEC's
one-click Deploy with Vercel story must keep working… do not push the gate into the
product"). Both of the ticket's remaining options push the gate into `vercel.json`
or `.github/`, where a forker inherits it without our secrets: option 1 leaves them
running our polling script with no token, and option 2 leaves them with Vercel's Git
integration switched off and a workflow that cannot authenticate — a fork that
deploys once and then silently stops. It also answers #25's open question about
what happens to an in-flight deploy: under Deployment Checks the build always
completes and simply never reaches the production domain, so the previous production
deployment keeps serving and previews are untouched. The one thing to establish
before this can be chosen is Fact 6 — whether the **Add Checks** button is actually
present on a Hobby project — and, if it is not, whether the fallback is Mechanism E
(staged deploys promoted from a `needs:`-gated Actions job, which keeps the fork
damage to a project setting) or Mechanism C. That choice belongs to a later ticket.

## Sources for this file

All checked **2026-08-29**.

**Vercel docs:**
- <https://vercel.com/docs/deployment-checks> (2026-08-11)
- <https://vercel.com/docs/project-configuration/project-settings> (2026-08-25)
- <https://vercel.com/docs/project-configuration/vercel-json> (2026-08-14)
- <https://vercel.com/docs/project-configuration/git-configuration> (2026-08-25)
- <https://vercel.com/docs/project-configuration/git-settings> (2026-08-25)
- <https://vercel.com/docs/project-configuration> (2026-08-25)
- <https://vercel.com/docs/environment-variables/system-environment-variables> (2026-07-15)
- <https://vercel.com/docs/git/vercel-for-github> (2026-08-11)
- <https://vercel.com/docs/deployments/promoting-a-deployment> (2026-06-26)
- <https://vercel.com/docs/deployments/managing-deployments> (2026-08-21)
- <https://vercel.com/docs/deployment-protection> (2026-08-21)
- <https://vercel.com/docs/deploy-hooks> (2026-08-11)
- <https://vercel.com/docs/deploy-button> (2025-03-12)
- <https://vercel.com/docs/cli/deploy> (2026-08-11)
- <https://vercel.com/docs/cli/project-linking> (2026-08-11)
- <https://vercel.com/docs/builds/configure-a-build> (2026-08-11)
- <https://vercel.com/docs/limits> (2026-08-25)
- <https://vercel.com/docs/plans/hobby> (2026-08-11)
- <https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel>
- <https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel>
- <https://vercel.com/changelog/block-vercel-deployment-promotions-with-github-actions> (2025-10-09)
- <https://vercel.com/changelog/native-deployment-checks> (2026-04-28)

**GitHub docs** (rendered pages, plus the raw `github/docs` source for the
availability notes that the rendered HTML-to-markdown conversion drops):
- <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>
- <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue>
- <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- <https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets>
- <https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments>
- <https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/protected-branches.md>
- <https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/merge-queue.md>
- <https://raw.githubusercontent.com/github/docs/main/data/reusables/gated-features/environments.md>

**Repository state:** `gh repo view lfeq/food-organizer --json visibility,isFork,isInOrganization`;
local `vercel.json` and `.github/workflows/ci.yml`.

## Caveats

- The Vercel docs pages were read through a fetch summarizer that returns the page
  as markdown; the quoted passages above are verbatim from that markdown. The two
  KB guides (`how-do-i-use-the-ignored-build-step-field-on-vercel`,
  `how-can-i-use-github-actions-with-vercel`) and the two changelog entries came
  back as *summaries* rather than raw text — their claims (Facts 6, 15, 16, and the
  KB half of Fact 7) are the least raw material here, though Fact 7's exit-code
  contract and Fact 15's secret names are each independently confirmed by a
  non-summarised page (`/docs/project-configuration/vercel-json#ignorecommand` and
  `/docs/git/vercel-for-github#using-github-actions` respectively).
- Flagged unverified: Deployment Checks availability on Hobby specifically;
  whether Vercel times out a never-reported Deployment Check; whether the Ignored
  Build Step command has outbound network access.
