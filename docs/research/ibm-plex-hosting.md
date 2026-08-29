# Serving IBM Plex: Google Fonts CDN vs self-hosting

Research for [issue #34](https://github.com/lfeq/food-organizer/issues/34)
(child of map [#31](https://github.com/lfeq/food-organizer/issues/31)).
All byte counts below were measured on **2026-08-29** by downloading the actual
files, not estimated. Font versions move; re-measure before quoting these
numbers a year from now.

## Question

The mockup pulls IBM Plex Sans and IBM Plex Mono from the Google Fonts CDN.
Before that becomes the app's font strategy: what does each option cost in
bytes, what are the privacy/GDPR consequences of the CDN, and what are the
licence terms for redistributing IBM Plex in a public repo that people fork?

## What the repo does today

`docs/planificador-semanal-de-comidas/project/Meal Planner Mockups.dc.html`
line 10 carries the mockup's font strategy verbatim:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

So the weights in question are **Sans 400/500/600/700** and **Mono
400/500/600**, normal style only — the mockup uses no italics anywhere.

The *app* meanwhile is in a third state. `src/styles.css:7` already says

```css
font-family: "IBM Plex Sans", system-ui, sans-serif;
```

but nothing loads IBM Plex, so every visitor today silently falls through to
`system-ui`. Whatever this ticket decides, something has to change — the
current state is a font declaration with no font behind it.

`src/routes/__root.tsx` imports `../styles.css?url` and injects it as a
`<link rel="stylesheet">` from the root route's `head()`. That matters for the
practical shape at the end of this note: there is exactly one app stylesheet,
and it is a Vite CSS entry.

Build/deploy setup (`package.json`, `vite.config.ts`, `vercel.json`): Vite 8 +
`@tanstack/react-start` + Nitro, `buildCommand: "npm run migrate && npm run
build"`, deployed to Vercel Hobby. No font tooling of any kind is present.

## Headline finding: the two options ship *byte-identical* files

This is the single fact that collapses most of the argument.

`@fontsource-variable/ibm-plex-sans` and `@fontsource/ibm-plex-mono` are built
from the google/fonts sources by the same pipeline Google's CDN uses, and the
woff2 files they ship are **the same bytes** as the ones `fonts.gstatic.com`
serves. Verified by MD5, comparing the files fetched from the CDN against the
files unpacked from the npm tarballs:

```
b2c9031d9fd6493ccda94908cdba4abd  gstatic .../zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxeKYY.woff2
b2c9031d9fd6493ccda94908cdba4abd  @fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2

79936b18df9f734fb6b0a256b20d36b4  gstatic .../-F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2
79936b18df9f734fb6b0a256b20d36b4  @fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2

b1c8a895f5fd3fe6cbf5b4cf95c58d87  gstatic .../-F6qfjptAgt5VM-kVkqdyU8n3twJwlBFgg.woff2
b1c8a895f5fd3fe6cbf5b4cf95c58d87  @fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2

5a2ce7798732476dec03a9561de231fe  gstatic .../-F6qfjptAgt5VM-kVkqdyU8n3vAOwlBFgg.woff2
5a2ce7798732476dec03a9561de231fe  @fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2
```

So self-hosting does not cost a single extra byte of font payload. It costs
build output and removes two third-party origins. That reframes the whole
comparison: this is not a bytes-vs-privacy trade-off, it is a
round-trips-and-third-parties question with the bytes held constant.

## Second finding: IBM Plex Sans on Google Fonts is a variable font

The mockup asks for four Sans weights. It gets **one file**.

Google's `css2` response for `IBM+Plex+Sans:wght@400;500;600;700` emits four
`@font-face` blocks per subset, but all four point at the *same* URL. The
family is variable, and `google/fonts`'s `ofl/ibmplexsans/METADATA.pb` confirms
why:

```
filename: "IBMPlexSans[wdth,wght].ttf"
...
axes { tag: "wdth" min_value: 75.0 max_value: 100.0 }
axes { tag: "wght" min_value: 100.0 max_value: 700.0 }
```

Requesting the variable range directly (`css2?family=IBM+Plex+Sans:wght@100..700`)
returns `font-weight: 100 700` faces — so any weight from 100 to 700 is free
once the file is downloaded.

**IBM Plex Mono is not variable on Google Fonts.**
`css2?family=IBM+Plex+Mono:wght@100..700` returns `400: Font family not found`,
and `ofl/ibmplexmono/METADATA.pb` lists static instances
(`IBMPlexMono-Thin.ttf`, `IBMPlexMono-Regular.ttf`, …) with no `axes` block.
Mono costs one file per weight.

There *is* a variable IBM Plex Mono upstream — see "The @ibm/* packages" below —
but it is not the one Google or Fontsource serve, and it is not the better
choice here.

## The byte numbers

Measured by downloading every woff2 the mockup's exact `link` tag resolves to.

### What the browser actually downloads (Spanish + English → `latin` only)

| Face | woff2 bytes |
| --- | --- |
| IBM Plex Sans, variable 100–700, `latin` | 45,712 |
| IBM Plex Mono 400, `latin` | 14,708 |
| IBM Plex Mono 500, `latin` | 14,888 |
| IBM Plex Mono 600, `latin` | 15,620 |
| **Total font payload** | **90,928 B (88.8 KiB)** |

Identical for both options, per the MD5 check above.

Spanish needs `á é í ó ú ü ñ ¿ ¡`. Every one of those is inside the `latin`
subset's `unicode-range` (`U+0000-00FF` covers all of them). **`latin-ext` is
not needed for Spanish or English** — it exists for Polish, Czech, Turkish,
Romanian and the like. It only starts to matter if the household types a dish
or member name containing such a character, and even then the browser fetches
the extra file lazily and only for the subset it actually needs. Cost if it
ever happens:

| Face | `latin-ext` woff2 bytes |
| --- | --- |
| Sans variable | 30,964 |
| Mono 400 | 13,348 |
| Mono 500 | 13,432 |
| Mono 600 | 14,328 |
| **Total `latin-ext` add-on** | **72,072 B (70.4 KiB)** |

For completeness, the full per-subset table as served by Google
(`ibmplexsans/v23`, `ibmplexmono/v20`), summed across the mockup's weights and
**deduplicated** (Sans's four weights are one file):

| Subset | Sans | Mono (400+500+600) | Total |
| --- | ---: | ---: | ---: |
| latin | 45,712 | 45,216 | 90,928 |
| latin-ext | 30,964 | 41,108 | 72,072 |
| cyrillic | 29,512 | 26,168 | 55,680 |
| cyrillic-ext | 23,568 | 21,576 | 45,144 |
| greek | 19,500 | — | 19,500 |
| vietnamese | 13,160 | 18,840 | 32,000 |
| **all subsets** | **162,416** | **152,908** | **315,324** |

(A naive read of the Google CSS that does not dedupe the Sans URL comes to
802,572 B across all subsets and weights — that number is wrong, and it is the
number you get if you assume four static Sans weights.)

### Bytes over the wire, first cold load

| | Google Fonts CDN | Self-hosted |
| --- | ---: | ---: |
| CSS | 15,785 B in a **separate request to a new origin** | 7,482 B of `@font-face` rules **folded into the `styles.css` the browser fetches anyway** — no extra request |
| Fonts | 90,928 B from `fonts.gstatic.com` | 90,928 B, same origin |
| **Total** | **106,713 B over 5 requests across 2 extra origins** | **98,410 B over 4 requests, all same-origin** |

The 15,785 B CSS figure is the real response for the mockup's exact URL with a
modern Chrome UA — it is large because Google enumerates all six subsets for
each of the seven requested weights. The 7,482 B figure is the *measured*
minified output of a real Vite build of the recommended imports (see below),
and it replaces nothing — it is added to a stylesheet the app already ships and
already fetches.

### Bytes added to the Vercel build output

The recommended imports (see "Practical shape") pull in every subset, because
Fontsource's per-weight CSS files carry the `unicode-range` metadata that makes
lazy subset loading work. Unused subsets sit in the build output and are never
downloaded by a Spanish/English household.

| Package / import | Files emitted | Bytes |
| --- | ---: | ---: |
| `@fontsource-variable/ibm-plex-sans/wght.css` (6 subsets, woff2 only) | 6 | 162,416 |
| `@fontsource/ibm-plex-mono/{400,500,600}.css` (5 subsets × 3 weights × woff2 + woff) | 30 | 283,796 |
| **Total** | **36** | **446,212 B (436 KiB)** |

This is not a projection. A throwaway Vite 8 build of exactly the four
`@import` lines recommended below emitted **36 files totalling 446,212 bytes**
into `dist/assets/`, plus a 7,482 B stylesheet, with every `url()` rewritten to
a content-hashed path such as
`/assets/ibm-plex-sans-latin-wght-normal-IvpUvPa2.woff2`. The per-file sizes in
`dist/` match the npm tarballs byte for byte — Vite copies the woff2 through
untouched.

The Mono half is inflated by legacy `.woff` v1 fallbacks that Fontsource
references alongside each `.woff2`; dropping them (see "Trimming" below) takes
Mono to 152,908 B and the total to **315,324 B across 21 files**. Not worth
doing on day one.

### What Vercel Hobby thinks of 436 KiB and 36 files

Nothing at all. From <https://vercel.com/docs/limits> (last updated
2026-08-25): the Hobby source-upload limit is **100 MB**, the file-count limit
is **15,000 source files**, build disk is **32 GB**, and the build step may run
**45 minutes**. Build *output* files have no documented upper limit at all —
"there is no upper limit for output files created during a build", with only a
soft warning about build times past ~100,000 files.

Serving is equally uneventful. From <https://vercel.com/docs/caching/cdn-cache>
(last updated 2026-08-11):

> Static files are automatically cached on Vercel's global network for the
> lifetime of the deployment after the first request.

> If a static file is unchanged, the cached value can persist across
> deployments due to the hash used in the filename.

> CDN caching is available for all deployments and domains on your account,
> regardless of the pricing plan.

Static assets get `max-age=N, immutable` browser caching. So self-hosted fonts
are served from Vercel's global edge with the same immutable-caching story
`fonts.gstatic.com` provides — Vite's content hashes are exactly the "hash used
in the filename" that clause refers to. **Hobby is not a CDN downgrade.**

### What Vite does with these files

From <https://vite.dev/guide/assets>: "Common image, media, and font filetypes
are detected as assets automatically", `url()` references in CSS "are handled
the same way" as JS imports, and referenced assets "will get hashed file
names". This applies to CSS imported from `node_modules` — the docs state the
behaviour generically with no carve-out.

One number matters: `build.assetsInlineLimit` defaults to **4096** bytes, and
assets below it are inlined as base64. The smallest woff2 in play is 13,160 B,
so **nothing here is ever inlined** — every font lands as a separate hashed
file, which is what we want, since a base64 font inside the stylesheet would
block rendering on bytes the browser may not need.

Vite has no unused-CSS elimination, so the `@font-face` rules for subsets this
household never uses stay in the emitted stylesheet. They cost ~2 KB of CSS and
zero network bytes, because `unicode-range` means the browser never requests
their files.

## Licence: SIL OFL 1.1 — redistribution and forking are explicitly permitted

`IBM/plex`'s `LICENSE.txt` opens:

> Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"
>
> This Font Software is licensed under the SIL Open Font License, Version 1.1.

`google/fonts`'s `METADATA.pb` for both families records `license: "OFL"`, and
both npm packages declare `"license": "OFL-1.1"`. The relevant OFL clauses,
verbatim:

> PERMISSION & CONDITIONS
> Permission is hereby granted, free of charge, to any person obtaining
> a copy of the Font Software, to use, study, copy, merge, embed, modify,
> redistribute, and sell modified and unmodified copies of the Font
> Software, subject to the following conditions:
>
> 1) Neither the Font Software nor any of its individual components,
> in Original or Modified Versions, may be sold by itself.
>
> 2) Original or Modified Versions of the Font Software may be bundled,
> redistributed and/or sold with any software, provided that each copy
> contains the above copyright notice and this license. These can be
> included either as stand-alone text files, human-readable headers or
> in the appropriate machine-readable metadata fields within text or
> binary files as long as those fields can be easily viewed by the user.
>
> 3) No Modified Version of the Font Software may use the Reserved Font
> Name(s) unless explicit written permission is granted by the corresponding
> Copyright Holder. This restriction only applies to the primary font name as
> presented to the users.
>
> […]
>
> 5) The Font Software, modified or unmodified, in part or in whole,
> must be distributed entirely under this license, and must not be
> distributed under any other license. The requirement for fonts to
> remain under this license does not apply to any document created
> using the Font Software.

Applied to this repo:

- **Committing the woff2 files to a public repo that people fork is
  permitted.** Clause 2 covers "bundled, redistributed … with any software",
  which is exactly what a web app shipping its own fonts does. Forking is just
  more redistribution and is equally covered.
- **The one obligation is clause 2's notice requirement**: each copy must carry
  the copyright notice and the OFL text. If the fonts arrive via npm this is
  satisfied automatically — both `@fontsource-variable/ibm-plex-sans` and
  `@fontsource/ibm-plex-mono` ship a 93-line `LICENSE` file containing the full
  OFL alongside `Copyright 2019 IBM Corp.`, and it lands in `node_modules`,
  and Vite does not strip it because it never touches it. If instead the binary
  files are ever vendored into `public/` or `src/`, the OFL text **must** be
  copied in beside them. That is the only licence action item.
- **Clause 5 does not infect the app.** "The requirement for fonts to remain
  under this license does not apply to any document created using the Font
  Software" — the app's own code and licence are unaffected. The OFL binds the
  font files only.
- **Clause 3, the Reserved Font Name, is the trap to avoid.** "Plex" is a
  Reserved Font Name. Shipping the fonts unmodified under the name "IBM Plex
  Sans" is fine. Re-subsetting them with `glyphhanger`/`pyftsubset` and *still*
  calling the result "IBM Plex Sans" is a Modified Version using a Reserved
  Font Name, which clause 3 forbids without IBM's written permission. This is a
  concrete reason to prefer the pre-built Fontsource/Google subsets over a
  custom subsetting step.
- **Clause 1**: the fonts may not be sold by themselves. Irrelevant here; the
  app is not sold at all.

Note the asymmetry worth stating plainly: **the licence permits self-hosting
outright.** There is no licence argument for the CDN. The CDN route is
permitted too, but it is Google's terms rather than the OFL that govern it.

## Privacy and GDPR: precise, and less dramatic than the internet says

### What the CDN actually does

Loading `fonts.googleapis.com` and `fonts.gstatic.com` sends the visitor's IP
address, `User-Agent` and `Referer` to Google on every cold load. That is
inherent to any cross-origin request; it is not a Google-specific misdeed. The
GDPR question is whether a website operator has a legal basis for causing it.

Google's own account of this is unusually candid and worth quoting rather than
paraphrasing, from its Google Fonts privacy FAQ:

> The Google Fonts API is designed to limit the collection, storage, and use of
> end-user data. The use of the Google Fonts Web API is unauthenticated and the
> Google Fonts API does not set or log cookies. […] Font requests are separate
> from and don't contain any credentials sent to google.com while using other
> Google services that are authenticated, such as Gmail.

> When end users visit a website that embeds Google Fonts, their browsers send
> HTTP requests to the Google Fonts Web API… Such HTTP requests include (1) the
> IP address used by the respective user to access the Internet, (2) the
> requested URL on the Google server, and (3) HTTP headers including the user
> agent… and the referer… For clarity, Google does not use any information
> collected by Google Fonts to create profiles of end users or for targeted
> advertising.

So the data flow is real and Google admits it precisely; the claim is that it
is not cookied, not authenticated, and not used for profiling. That is a
materially different thing from an ad tracker, and any framing of the CDN as
"Google tracking your users" overstates it. What remains true is that an IP
address is personal data under the GDPR, and a transfer occurred.

### LG München I, 3 O 17493/20 — what it actually held

Judgment ("Endurteil") of 20 January 2022, Landgericht München I, 3rd civil
chamber. Full text on the official Bavarian case-law database:
<https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2022-N-612>
(BeckRS 2022, 612).

The operative ruling:

1. An injunction requiring the defendant to stop disclosing the plaintiff's
   dynamic IP address to Google by embedding Google Fonts, enforceable by a
   fine of up to €250,000 per violation.
2. A disclosure order (what personal data is processed).
3. **Damages of €100.00** plus interest.
4. Costs against the defendant.

Legal bases: **Art. 6(1)(f) GDPR** — the court held "legitimate interests"
could not justify the transfer, *because Google Fonts can be used without
transmitting the IP address at all* (i.e. by self-hosting), so the interference
was not necessary. Damages under **Art. 82 GDPR** and **§ 823(1) BGB** in
conjunction with the general right of personality; the injunction under
**§§ 823(1), 1004 BGB analog**.

### Being precise about its weight

Five things people routinely get wrong about this case:

- **€100.** Not thousands. One hundred euros plus costs, to one plaintiff.
- **It is a first-instance Landgericht decision.** German courts do not operate
  stare decisis; it binds the parties and nobody else. Legal press reports it
  became final without appeal, but that status is secondary-sourced, not
  verified here against a court register.
- **The ratio is narrow and is about necessity, not about Google.** The finding
  is that a legitimate-interests basis fails when a less intrusive alternative
  (self-hosting) is trivially available. The same reasoning would apply to any
  avoidable third-party asset request.
- **The follow-on litigation went the other way, but for procedural reasons.**
  LG München I, 30 March 2023, 4 O 13063/22
  (<https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2023-N-6354>,
  BeckRS 2023, 6354) threw out a claimant who had crawled ~100,000 sites and
  sent mass €170 cease-and-desist letters citing the 2022 judgment, holding the
  claims an abuse of rights under § 242 BGB: "Wer sich aber bewusst und gezielt
  in eine Situation begibt, in der ihm eine Persönlichkeitsrechtsverletzung
  droht, gerade um die Persönlichkeitsverletzung an sich zu erfahren, um sodann
  daraus Ansprüche zu begründen, ist nicht schutzbedürftig." **But that court
  expressly declined to decide the underlying GDPR question** — "Es kann
  offenbleiben, ob die … dynamische Einbindung von Google-Fonts gegen die DSGVO
  verstieß." So 4 O 13063/22 defangs the shakedown industry; it does not
  rehabilitate the practice.
- **The German DPA line is a recommendation, not a ban.** The Bavarian
  supervisory authority's own FAQ (<https://www.lda.bayern.de/de/faq.html>)
  says of external fonts: "wir empfehlen, diese über den eigenen Webserver
  einzubinden und selbst zu hosten." Recommend, self-host. No prohibition.

### Does it even apply to a private household app?

Partly, and less than you'd hope. GDPR Art. 2(2)(c) exempts processing "by a
natural person in the course of a purely personal or household activity", and
Recital 18 elaborates — but its final sentence is the catch:

> However, this Regulation applies to controllers or processors which provide
> the means for processing personal data for such personal or household
> activities.

The CJEU reads the exemption narrowly (C-101/01 *Lindqvist*; C-212/13 *Ryneš*).
The settled reading of that last sentence is that the exemption covers the
household *member's* use of the tool, not the operation of the service that
provides the tool. Someone self-hosting this app for their own family is a
strong candidate for the exemption; the practical problem is that this repo is
public and designed to be forked, so we do not control who deploys it or for
whom. A fork run for a scout troop, a small business kitchen, or a shared house
of unrelated tenants is outside the exemption, and we would have shipped them a
default that a German court has already ruled against once.

### The honest read for this ticket

The legal risk to *this* app, on the facts, is close to nil: a login-gated
household planner with a handful of users, most likely covered by the household
exemption, with the only known adverse ruling worth €100 and the follow-on
shakedown wave judicially dismantled. **Do not self-host out of fear of a
lawsuit.**

Self-host anyway, because:

- the licence permits it outright, and there is no licence cost;
- the bytes are identical, so there is no performance cost — there is a
  performance *gain*;
- it removes a class of question the project would otherwise have to answer
  for every forker in every jurisdiction; and
- the court's own reasoning is the honest engineering argument stripped of
  legalese: there is a less intrusive alternative and it is trivially
  available.

That is a decision made on the merits, with the GDPR story as a tiebreaker that
happens to point the same way.

## Performance: the part that actually matters here

The bytes are equal, so the difference is entirely in the request waterfall,
and this app has a specific reason to care.

**Google Fonts CDN, cold load:**

1. HTML arrives, `<link>` to `fonts.googleapis.com` discovered.
2. DNS + TCP + TLS to `fonts.googleapis.com` (the mockup's `preconnect` can
   overlap this with HTML parsing — good, and it is there).
3. CSS returns (15.8 KB).
4. Only *now* can the browser learn the font URLs. DNS + TCP + TLS to
   `fonts.gstatic.com` (again, `preconnect` helps).
5. Four woff2 files.

Two extra origins, and a strictly serialized dependency: **no font byte can be
requested until a request to a different origin has completed.**

**Self-hosted, cold load:**

1. HTML arrives, `<link>` to the app's own `styles.css` discovered — a
   connection the browser already has open, since it just fetched the HTML from
   it.
2. CSS returns with `@font-face` rules inline.
3. Four woff2 files, same origin, same connection, no new handshakes.

Removes two DNS lookups, two TLS handshakes, and one full cross-origin
round-trip from the critical path.

This compounds with the constraint already recorded in
`docs/research/stack-and-hosting.md`: the Neon Free plan's mandatory
scale-to-zero after 5 minutes means the first request after idle already pays a
database cold start. Adding two third-party connection setups on top of the
slowest load the app has is the wrong place to spend latency.

**The "shared cache" argument for the CDN is dead.** It used to be true that a
visitor who had loaded IBM Plex on another site would get it free. Chrome
partitioned the HTTP cache by top-level site — "Partition the HTTP Cache",
enabled by default, desktop milestone 77
(<https://chromestatus.com/feature/5730772021411840>) — and Safari and Firefox
did likewise. Every site now pays a fresh download. There is a proposal to
restore sharing for a hand-curated list of extremely pervasive resources
(<https://chromestatus.com/feature/5202380930678784>), but it is at "Proposed"
status and explicitly targets scripts and stylesheets, not font binaries.

## The `@ibm/*` packages: a real variable Mono, but don't

`IBM/plex` ships `packages/plex-mono-variable`, published as
`@ibm/plex-mono-variable@1.0.0` (OFL-1.1). It is a genuine variable Mono,
`font-weight: 100 700`, family name `IBM Plex Mono Var`, which neither Google
Fonts nor Fontsource offers. Its Latin1 subset is **32,576 B** — 12,640 B
*smaller* than Fontsource's three static Mono latin weights (45,216 B).

Two reasons not to take that trade:

1. **The `@ibm/*` builds are worse where it counts.**
   `@ibm/plex-sans-variable@0.2.0`'s `IBM Plex Sans Var-Roman-Latin1.woff2` is
   **68,988 B** against Google's/Fontsource's 45,712 B for the same coverage —
   Google's subsetting and compression pipeline is 23 KB better. Mixing sources
   to get the good Sans and the small Mono means two subset schemes, two family
   naming conventions and two `unicode-range` vocabularies in one stylesheet.
   The net saving over an all-Fontsource setup is 12.6 KB, on a 90 KB budget,
   for a large jump in complexity.
2. **Both `@ibm/*` packages run a `postinstall` telemetry script.** Their
   `package.json` declares `"dependencies": {"@ibm/telemetry-js": "^1.6.1"}`
   and `"scripts": {"postinstall": "ibmtelemetry --config=telemetry.yml"}`, and
   the README states: "By installing this package as a dependency you are
   agreeing to telemetry collection." Adding a phone-home postinstall hook to
   every `npm install` — including every forker's — as the outcome of a *privacy*
   ticket would be an unforced own goal. It is build-time rather than
   runtime data collection, but it is precisely the category of thing this
   ticket exists to remove.

Fontsource's packages have no dependencies and no install scripts.

## Recommendation

**Self-host, via Fontsource: variable Sans + static Mono 400/500/600.**

The decision is not close. Identical bytes, fewer round-trips, no third-party
origins, licence-clean, and it removes an entire question from every forker's
plate. The only cost is 436 KiB of static build output that Vercel Hobby will
not notice.

Concretely:

- `@fontsource-variable/ibm-plex-sans` for Sans — one 45,712 B file covers
  400/500/600/700 and anything else in 100–700.
- `@fontsource/ibm-plex-mono` for Mono — three static weights, 45,216 B total,
  because no variable Mono exists in this pipeline.
- Only the `wght` (weight-only) Sans axis, not `standard`/`wdth`. The
  `wdth`-carrying variants cost **65,488 B** vs 45,712 B for the same latin
  coverage, and the design uses no width variation.
- Normal style only. The mockup contains no italics; adding them would double
  the file count for nothing.

## Practical shape

### 1. Install

```
npm install @fontsource-variable/ibm-plex-sans @fontsource/ibm-plex-mono
```

Both at `5.3.0` as of 2026-08-29, both `OFL-1.1`, both zero-dependency with no
install scripts.

### 2. Import, at the top of `src/styles.css`

`src/routes/__root.tsx` already links `../styles.css?url` as the single app
stylesheet, so CSS `@import` is the natural seam — Vite resolves bare package
specifiers in `@import` and inlines the rules into the emitted stylesheet,
rewriting each `url()` to a hashed asset path.

```css
@import "@fontsource-variable/ibm-plex-sans/wght.css";
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/500.css";
@import "@fontsource/ibm-plex-mono/600.css";
```

CSS requires `@import` to precede all other rules, so these go above the
existing `* { box-sizing: border-box; }`.

Verified: a scratch Vite 8 build of precisely these four lines resolved all
four bare specifiers, inlined 36 `@font-face` rules into one 7,482 B
stylesheet, and emitted the 36 hashed font files. No plugin, no config, no
`public/` copying step.

### 3. Fix the family names

The variable package registers the family as **`IBM Plex Sans Variable`**, not
`IBM Plex Sans`. `src/styles.css:7` must change:

```css
font-family: "IBM Plex Sans Variable", "IBM Plex Sans", system-ui, sans-serif;
```

(keeping bare `IBM Plex Sans` as the fallback for anyone with it installed
locally). Mono keeps the plain name:

```css
font-family: "IBM Plex Mono", ui-monospace, monospace;
```

The mockup's inline styles all say `'IBM Plex Sans'`; whoever ports the mockup
markup needs to know about the `Variable` suffix or the app will silently
render in `system-ui` again. Defining one custom property
(`--font-sans` / `--font-mono`) in `:root` and using it everywhere is the way to
stop this from recurring.

### 4. The trap to avoid when trimming

It is tempting to import only the subsets in use:

```css
/* DO NOT DO THIS */
@import "@fontsource/ibm-plex-mono/latin-400.css";
@import "@fontsource/ibm-plex-mono/latin-ext-400.css";
```

Fontsource's *per-subset* CSS files deliberately omit `unicode-range` — they
assume you are importing exactly one subset. Import two and you get two
`@font-face` rules for the same family/weight/style with no ranges to
distinguish them; the later one wins outright and the browser downloads one
file and renders the other subset's characters from the fallback font. The
per-*weight* files (`400.css`, `500.css`, `600.css`) and the variable
`wght.css` *do* carry `unicode-range` for all subsets, which is what makes the
lazy per-subset loading in the byte table above actually work. Use those.

If build-output size ever needs trimming, the correct route is to write the
`@font-face` rules by hand against the packages' `./files/*.woff2` subpath
exports (both packages export `"./files/*"`), copying the `unicode-range`
values from the generated CSS. That also drops the legacy `.woff` v1 fallbacks
and takes the output from 446,212 B to 315,324 B. Not worth doing until there
is a reason.

### 5. What to delete

Nothing in `src/` references Google Fonts, so there is nothing to remove from
the app. The mockup file keeps its `link` tags — it is a design artefact, not
shipped code, and rewriting it would only make it diverge from what the
designer sees.

## Open follow-up

Questions this raised that the map may want as tickets:

1. **Font preloading.** The fonts are discovered only after `styles.css` parses,
   which is one round-trip later than optimal. `<link rel="preload" as="font"
   type="font/woff2" crossorigin>` in the root route's `head()` would fix it,
   but needs the Vite-hashed filenames, which means reading the build manifest
   at build time. Worth measuring before building machinery for it.
2. **`font-display` and the FOUT.** Fontsource's CSS ships
   `font-display: swap`, matching the mockup's `&display=swap`. Swap means a
   visible flash of `system-ui` before IBM Plex arrives. `optional` would avoid
   the reflow at the cost of sometimes not using the font at all on a first
   visit. Which one this app wants is a design call, not a research finding.
3. **Design tokens for typography.** §3 above surfaces that `IBM Plex Sans
   Variable` vs `IBM Plex Sans` is a foot-gun that will recur every time mockup
   markup is ported. A `--font-sans` / `--font-mono` custom-property pair, or
   whatever the styling ticket settles on, should own the family strings in one
   place.
4. **Whether the variable Sans unlocks weights the design should use.** The app
   gets 100–700 continuous for free. The mockup uses four discrete weights
   chosen under a static-font assumption. Nothing is broken, but there is
   headroom nobody has looked at.
5. **A `docs/` note or README line on the OFL notice obligation**, so that if
   anyone ever vendors font binaries into `public/` instead of taking them from
   npm, clause 2's requirement to ship the licence alongside is not forgotten.

## Sources

All checked **2026-08-29**.

**Measured directly (raw bytes, not documentation):**
- `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`
  fetched with a Chrome UA; all 39 referenced `fonts.gstatic.com` woff2 files
  downloaded and sized.
- `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100..700` (variable range, 200 OK)
- `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@100..700` (400 "Font family not found")
- npm tarballs, unpacked and measured: `@fontsource-variable/ibm-plex-sans@5.3.0`,
  `@fontsource/ibm-plex-sans@5.3.0`, `@fontsource/ibm-plex-mono@5.3.0`,
  `@ibm/plex-mono-variable@1.0.0`, `@ibm/plex-sans-variable@0.2.0`
  (via `https://registry.npmjs.org/`).

**Source code and repository metadata:**
- <https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt>
- <https://api.github.com/repos/IBM/plex/contents/packages>
- <https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsans/METADATA.pb>
- <https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/METADATA.pb>
- The `LICENSE`, `package.json`, `index.css`, `wght.css`, `400.css`,
  `latin-400.css` and `latin-ext-400.css` files inside the Fontsource tarballs.
- The `README.md`, `package.json` and `fonts/split/woff2/*.css` files inside the
  `@ibm/*` tarballs.

**Case law and regulation:**
- LG München I, 20.01.2022, 3 O 17493/20:
  <https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2022-N-612>
- LG München I, 30.03.2023, 4 O 13063/22:
  <https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2023-N-6354>
- Regulation (EU) 2016/679, Art. 2(2)(c) and Recital 18.
- CJEU C-101/01 (*Lindqvist*), C-212/13 (*Ryneš*) on the narrow reading of the
  household exemption.
- BayLDA FAQ, external fonts entry: <https://www.lda.bayern.de/de/faq.html>

**Platform documentation:**
- <https://vercel.com/docs/limits> (last updated 2026-08-25)
- <https://vercel.com/docs/caching/cdn-cache> (last updated 2026-08-11)
- <https://vite.dev/guide/assets> and <https://vite.dev/config/build-options>
- <https://developers.google.com/fonts/docs/css2>
- Google Fonts privacy FAQ (`developers.google.com/fonts/faq/privacy` →
  `fonts.google.com/faq#privacy`). Both URLs now serve a client-rendered shell;
  the quotes above were read from a 2026-07-04 Wayback snapshot of the docs
  page.

**Browser behaviour:**
- <https://chromestatus.com/feature/5730772021411840> — "Partition the HTTP
  Cache", Enabled by default, desktop 77.
- <https://chromestatus.com/feature/5202380930678784> — "Cache sharing for
  extremely-pervasive resources", Proposed.

**Not verified:**
- That LG München I 3 O 17493/20 was never appealed. Widely reported in German
  legal press; not confirmed against a court register.
- Whether the Datenschutzkonferenz has issued Google-Fonts-specific guidance.
  Searched; not found; not ruled out.
- Real-world load timings. Every performance claim here is reasoning from
  request-waterfall structure and measured file sizes, not from a lab trace.
- The exact Hobby "Fast Data Transfer" monthly allowance. The figure on
  `vercel.com/docs/limits` is rendered client-side and did not come through in
  a plain fetch. Irrelevant at this scale — 90 KB of immutably-cached fonts per
  cold visitor — but noted rather than guessed.
