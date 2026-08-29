# Hand-rolled bilingual UI, no i18n library

The interface exists in Spanish and English, which normally calls for an i18n
library. We use a plain `as const` `Record<Key, { en, es }>` in the repo instead,
with `Intl` for dates, numbers and plural categories, because at roughly 150
strings written by the one household that also reads them, the tooling a library
buys — extraction, a translator handoff, lazy loading — has no one to serve,
while the one thing we actually need is free: the `as const` record makes a
missing translation a `tsc` error rather than a runtime fallback we would have to
design.

The locale itself is a cookie, read server-side during SSR. It is not a column on
`Member` and not a URL segment: this app has no public or shareable URLs, and a
bilingual household plausibly wants the kitchen tablet in Spanish and a laptop in
English. Spanish is the hard-coded default and `Accept-Language` is deliberately
ignored.

## Considered options

- **Paraglide** (`@inlang/paraglide-js`) was the strongest alternative and the
  closest call: compile-time, near-zero runtime, and the only option with an
  official TanStack Start SSR example pinned to our exact version. It was
  rejected on one point that self-hosting makes load-bearing — its
  `project.inlang/settings.json` references plugin modules by **jsDelivr CDN
  URL**, so the self-hoster's build reaches out to the network. Its genuine
  advantage is `AsyncLocalStorage` per-request locale isolation on a warm
  serverless instance, which the cookie sidesteps: read it once per request, pass
  the locale down through React context, never touch module state.
- **`i18next`** mutates its config object at runtime, so it needs a deep clone per
  request or namespaces leak between requests on a warm instance.
- **`typesafe-i18n`** is unmaintained; its author died in 2023.
- **`next-intl`** is scoped to Next.js by its own docs.
- **`lingui`** needs a Babel step alongside Start's Vite pipeline, with no
  verified TanStack Start integration.

## Consequences

- **Nothing stored is ever localised.** Everything in Postgres is household data
  in the language it was typed; dish names are shown as typed in either locale.
  This is what keeps a future data export, and a printed week, from needing a
  locale at all.
- **Server functions return codes, never prose.** How a locale reaches a
  `createServerFn` call is undocumented — a client-initiated POST is a separate
  request from the SSR render. Keeping the string table client-side removes the
  question rather than answering it.
- Both locales ship in the bundle (~10–15 KB raw), which is less than any
  library's runtime alone. Interpolation is ours to write. If interpolation and
  plural branching outgrow ~10 helper lines, revisit this decision.

Decided on [issue #4](https://github.com/lfeq/food-organizer/issues/4), which
holds the full reasoning.
