# Food Organizer

A self-hosted weekly meal planner for one household.

<!--
  The `products` parameter provisions the Neon database as part of the clone
  wizard, so `DATABASE_URL_UNPOOLED` exists before the first build runs. This
  matters more than it looks: `npm run migrate` now fails the build when that
  variable is missing (see scripts/migrate.mjs), so a button that does not
  provision a database produces a red first deploy rather than a green one.

  Keep the full integration shape -- `{"type":"neon"}` is not a form Vercel
  recognises, and a malformed value is ignored silently rather than rejected.
-->

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flfeq%2Ffood-organizer&project-name=food-organizer&repository-name=food-organizer&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D)

## Before you deploy

- **Fork into a personal GitHub account, not an organisation.** Vercel Hobby
  cannot connect to repositories owned by a GitHub organisation.
- The default UI language is **Spanish**. There is a language toggle in the
  sidebar.
- **Backups are your responsibility.** The app includes a "download my data"
  export to help, but the database runs on Neon Free, which does not provide
  managed backups.
- **The first load after a quiet period is slow.** Neon Free suspends the
  database after five minutes of inactivity. The app retries the connection
  automatically; the login screen may take a few seconds to appear.

## Deploying

1. Click the **Deploy with Vercel** button above.
2. Vercel will clone this repo into your account and create the project.
3. When prompted, add the **Neon** database from Vercel Storage (Free plan).
   The integration injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
   automatically — do not copy connection strings manually. **Do not skip this
   step**: the build applies the database schema, so without it the deploy
   fails rather than shipping an app with no database.
4. Click **Deploy**. The database schema is applied as a build step.
5. Open the deployed URL and complete the first-run setup: create the admin
   account, confirm the week start, and seed the catalogue.

## Local development

```bash
cp .env.example .env.local
# Fill in DATABASE_URL and DATABASE_URL_UNPOOLED from your Neon project
npm install
npm run dev
```

The dev server starts on <http://localhost:3000>.

To apply migrations locally:

```bash
npm run migrate
```
