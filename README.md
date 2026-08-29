# Food Organizer

A self-hosted weekly meal planner for one household.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flfeq%2Ffood-organizer&stores=%5B%7B%22type%22%3A%22neon%22%7D%5D)

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
   automatically — do not copy connection strings manually.
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
