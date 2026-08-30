# Visual system

The design system established by the Claude Design mockup, written out so that
two people implementing different screens produce the same thing.

**Source of truth:** `docs/planificador-semanal-de-comidas/project/Meal Planner Mockups.dc.html`
(511 lines, self-contained HTML/CSS, eleven artboards `1a`–`1k`). The mockup is
**binding**: its palette, typography, spacing, and components replace the ones
in `src/styles.css`. Where this document and the mockup disagree, this document
wins — every difference is deliberate and recorded under
[Where the mockup contradicts itself](#where-the-mockup-contradicts-itself).

**Status:** decided. Every value below is settled. Nothing here is a suggestion
awaiting a per-screen judgement call.

## What this covers, and what it does not

**Covers:** colour roles, the type scale and the Sans/Mono split rule, the
spacing scale, radii, borders, elevation, and the component variants
(buttons, cards, chips, badges, fields, list rows, notice, sheet, tab bar,
sidebar).

**Does not cover:**

- **Per-screen layout.** How the desktop grid reflows within a screen is a
  separate decision on the redesign map. The week-screen variant (`1b`) and
  what the sidebar becomes on a phone are now settled and written up above.
- **How this gets implemented.** Settled separately, in
  [CSS structure](./css-structure.md): the tokens named here *are* CSS custom
  properties on `:root` under these exact names, `styles.css` splits into
  `src/styles/`, and there is one literal `@media (min-width: 900px)`. That
  document decides the shape of the code; this one decides the design.
- **Copy.** Every visible string goes through `src/i18n.ts` (ADR-0001). The
  English words in the mockup are placeholders for keys, not content.
- **Accessibility remediation.** The [contrast audit](#contrast-audit) below
  reports the numbers; four of them fail WCAG AA and the fix is decided
  elsewhere.

## How the mockup was read

The file has two kinds of CSS, and only one of them is the design.

- **Canvas chrome** — the `<style>` block in `<helmet>` and every `dv-`
  prefixed class (`dv-turn`, `dv-card`, `dv-note`, `dv-oid`, …). This is the
  design-doc viewer's own furniture: the grey backdrop the artboards sit on,
  the numbered pills, the caption text. **Not part of the product.**
- **Artboard content** — everything from `<section class="dv-turn">` onward,
  styled with inline `style=` attributes. **This is the design.**

Three consequences worth stating plainly, because each is easy to get wrong:

1. **`#eae7e0` is not an app colour.** It appears exactly once in the file, as
   the canvas viewer's `body` background. No artboard uses it. The app's page
   ground is `#f6f4ef`.
2. **The only `box-shadow` in the file is on `.dv-card`**, the viewer's frame
   around each artboard. **The product design uses no shadows at all.**
3. **The `9:41` / carrier row at the top of `1a` and `1b` is a simulated phone
   status bar.** It is mockup furniture. Do not build it.

Artboard widths (390px phone, 980px desktop) are canvas sizes chosen to show
the design, not breakpoints.

## Colour

Nine colours carry the whole system. Everything else is one of them at an
opacity, and every opacity below is over a named ground — never over an
unknown one.

### Grounds

| Token | Value | What it is for |
| --- | --- | --- |
| `--ground-page` | `#f6f4ef` | The screen itself: the warm paper everything sits on. Every phone screen and the desktop content column. |
| `--ground-surface` | `#fffefb` | Anything that lifts off the page: cards, the sheet, list blocks, the tab bar. The lightest ground in the system. |
| `--ground-inverse` | `#191817` | Ink used as a ground: the desktop sidebar, dark buttons, badges. |
| `--ground-notice` | `#faf3e2` | The amber notice, and the inline highlight on a repeated dish name. **Reserved for the short-catalogue notice and nothing else.** |
| `--ground-sunken` | `rgba(25,24,23,.05)` | An explanatory block recessed into the page (the admin-rights note in `1k`). No border. |
| `--ground-chip` | `rgba(25,24,23,.07)` | An unselected chip in a filter row. |
| `--ground-accent-soft` | `rgba(45,106,77,.09)` | The selected cell of a segmented control. |
| `--scrim` | `rgba(25,24,23,.45)` | Behind a sheet. |

### Ink

| Token | Value | What it is for |
| --- | --- | --- |
| `--ink` | `#191817` | Everything that must be read: dish names, headings, button labels, the day a card is for. |
| `--ink-secondary` | `#6d6862` | Sans prose that supports the primary line — the "soup · side" summary under a main, an explanatory sentence. |
| `--ink-muted` | `#8b857d` | **Mono only.** Labels, dates, counts, authorship, and every eyebrow. If text is muted and not mono, it is `--ink-secondary`, not this. |
| `--ink-faint` | `rgba(25,24,23,.3)` | Non-essential glyphs: the `⋯` overflow dot, the `→` chevron, an inactive `↻`. See the [contrast audit](#contrast-audit) — this is decorative weight, and anything interactive needs more. |
| `--ink-on-inverse` | `#fffefb` | Text and glyphs on `--ground-inverse`. |
| `--ink-on-inverse-muted` | `rgba(255,254,251,.62)` | Idle sidebar navigation items. |
| `--ink-on-inverse-faint` | `rgba(255,254,251,.4)` | Sidebar footer metadata. |

### Accent

One green, used sparingly.

| Token | Value | What it is for |
| --- | --- | --- |
| `--accent` | `#2d6a4d` | The primary plan action, links, inline text actions, the selected segmented cell, the active tab's underline, the text caret. |
| `--accent-hover` | `#1f4d38` | Hover on a link or an accent-coloured text action. |
| `--ink-on-accent` | `#fffefb` | Text on `--accent`. |

The mockup never uses the accent as a large fill except on a button. It is a
2–5% colour: on a typical screen it appears on one button, one underline, and
maybe one text link.

### Notice (amber)

**Reserved for the short-catalogue notice.** Amber never means "warning" in
general here — it means "your catalogue is too short for this course, so dishes
repeat". Five values, all used together:

| Token | Value | What it is for |
| --- | --- | --- |
| `--notice-ground` | `#faf3e2` | The notice card, and the inline pill around a repeated dish name. |
| `--notice-rule` | `rgba(138,96,35,.35)` | Its border. |
| `--notice-ink` | `#6b4c1c` | Its headline. |
| `--notice-ink-secondary` | `#7a5a26` | Its explanatory sentence. |
| `--notice-ink-action` | `#8a6023` | Its call to action and its `!` glyph. |

### Danger

| Token | Value | What it is for |
| --- | --- | --- |
| `--danger` | `#8a2323` | Destructive label text. |
| `--danger-rule` | `rgba(138,35,35,.3)` | Destructive outline border. |

There is no danger *ground*. Destructive actions are outlined, never filled —
the only one in the mockup is **Delete** in the dish sheet.

### Rules and borders

| Token | Value | What it is for |
| --- | --- | --- |
| `--rule` | `rgba(25,24,23,.1)` | The default hairline: a card's border, a section divider, the tab bar's top edge. |
| `--rule-inset` | `rgba(25,24,23,.07)` | A separator *between rows inside* one surface. Lighter than `--rule` on purpose: the block already has an outer edge. |
| `--rule-control` | `rgba(25,24,23,.18)` | The border of an outlined button, an icon button, or an unfocused field. |
| `--rule-dashed` | `rgba(25,24,23,.22)` | `1px dashed`. A locked or not-yet-real region — the "past days" placeholder tile. |
| `--rule-strong` | `#191817` | `1px solid`. Emphasis, not decoration: **the today card, and a focused field.** Nothing else takes a full-ink border. |

Border width is `1px` everywhere except the active tab's `2px solid --accent`
top edge.

### Elevation

**There is none.** No artboard uses `box-shadow`. Depth is expressed by a
change of ground plus a hairline: `--ground-surface` inside `--ground-page`,
edged with `--rule`. A card that needs to stand out further changes its
*border* to `--rule-strong`, never gains a shadow.

The one exception in spirit is the sheet, which reads as raised because of the
`--scrim` behind it, not because of a shadow.

## Typography

Two families, both IBM Plex, loaded from one stylesheet in the mockup:

```
IBM Plex Sans  400 500 600 700
IBM Plex Mono  400 500 600
```

Fallback stacks: `'IBM Plex Sans', system-ui, sans-serif` and
`'IBM Plex Mono', ui-monospace, monospace`. **Whether these are served from
Google Fonts or self-hosted is a separate decision** and does not affect
anything below.

### The Sans/Mono split rule

This is the single rule that makes the design feel like itself. State it as two
questions:

> **Is this text the household's own words?** → **Sans.**
> **Is it the app talking about them?** → **Mono.**

**Sans** carries content and intent: dish names, page titles, prose sentences,
button labels, member names, the summary line under a main.

**Mono** carries structure and measurement: eyebrows ("WEEK OF", "SOUP"), day
and date labels, counts ("21 total", "14 weeks stored"), authorship ("added by
mariana"), status ("member · last seen today"), badges, chips, tab labels, and
system statements about the instance itself.

Three consequences that resolve most real cases:

- **A dish name is always Sans**, at every size, on every screen — including
  inside a mono-heavy block. Names are household data (CONTEXT.md, *Locale*);
  mono is the app's voice.
- **A course label is always Mono**, uppercase: `SOUP` / `SIDE` / `MAIN` —
  `SOPA` / `GUARNICIÓN` / `FUERTE` in Spanish — are the app's taxonomy, not the
  family's words. So are day labels. The Spanish set is up to 2.5× wider; see
  [Bilingual fit](#bilingual-fit).
- **Anything uppercase with letter-spacing is Mono.** The reverse also holds:
  Sans is never letter-spaced and never uppercased.

**The one deliberate exception is artboard `1c`**, the printed-ticket variant,
which sets the entire screen in Mono as its whole point. If `1c` is chosen as
the week-screen direction, it overrides the split rule *on that screen only*.

### Sans scale

| Role | Style | Where |
| --- | --- | --- |
| `title-page-desktop` | `700 26px/1.1` | Desktop week heading; the sign-in wordmark. |
| `title-page` | `700 22px/1.15` | The page title on a phone: "Dishes", "History", "Accounts", the week range. |
| `title-sheet` | `700 16px/1.2` | The sheet header ("Edit dish"). |
| `dish-hero` | `600 21px/1.15` | The main course on the today card. The largest dish name in the system. |
| `dish-today` | `500 17px/1.2` | Soup and side on the today card. |
| `dish-card` | `600 15px/1.25` | The main course on a non-today day card, and in the history and short-catalogue lists. |
| `item-name` | `500 15px/1.3` | A row in a list: a dish in the catalogue, a member in accounts. |
| `body` | `400 14px/1.45` | Default reading size. Field values, the desktop day-card grid. |
| `body-sm` | `400 13px/1.5` | A supporting sentence with room to breathe. |
| `meta-sans` | `400 12.5px/1.45` | The secondary line under a dish name ("Sopa de tortilla · Calabacitas con elote"), and short explanatory prose. |
| `button-lg` | `600 13px/1` | A full-width button (Save dish, Sign in). |
| `button` | `600 12px/1` | The standard button label. |
| `button-sm` | `600 11px/1` | A compact outlined button (`↻ Reroll day`). |
| `link-inline` | `500 12px/1` | A bare text action (`↻ Reroll`, `Reset password`). |

### Mono scale

| Role | Style | Where |
| --- | --- | --- |
| `eyebrow` | `600 9px/1.2`, `letter-spacing: .14em`, uppercase | The small label above a heading: "WEEK OF", "THIS WEEK", "SELF-HOSTED INSTANCE". Also a field label. Always `--ink-muted`. |
| `day-label` | `600 10px/1.4`, `letter-spacing: .12em`, uppercase | The day a card belongs to: `MON 24`, or `THU` over `27` in a day-card gutter. |
| `course-label` | `600 9px/1.2`, `letter-spacing: .14em`, uppercase | `SOUP` / `SIDE` / `MAIN`. Same style as `eyebrow`; named separately because it is the most repeated text in the app. |
| `badge` | `600 9px/1`, `letter-spacing: .12em`, uppercase | A filled tag: `TODAY`, `ADMIN`. On `--ground-inverse`. |
| `tag` | `500 9px/1`, `letter-spacing: .12em`, uppercase | An outlined tag: `READ ONLY`. |
| `chip` | `600 10px/1`, `letter-spacing: .1em`, uppercase | A filter chip: `SOUPS 7`. Idle weight `500`. |
| `tab` | `600 10px/1`, `letter-spacing: .12em`, uppercase | A tab-bar label. Idle weight `400`. |
| `meta` | `400 11px/1.5` | All metadata: "21 total · shared catalog", "added by mariana", "last seen 3 d ago", a date. Always `--ink-muted`. |
| `note` | `400 11px/1.6` | A mono paragraph — the sign-in explanation, the admin-rights block, the "added by … used 3× …" footer. |

`meta` and `note` differ only in leading: `note` is for two or more lines.

### Letter-spacing

Two values, and one variant-only third:

- **`.14em`** — the tightest, smallest uppercase text: eyebrows and course labels at 9px.
- **`.12em`** — everything else uppercase at 10px: day labels, badges, tags, chips, tabs.
- **`.3em`** — `1c` only, on its centred ticket title. Not part of the general system.

Never letter-space Sans. Never letter-space lowercase mono.

### Line height

Where the mockup omits a line-height it inherits the browser default, which is
not a decision. Every role above states one. The pattern behind them:

- **`1`** — single-line controls (buttons, chips, badges, tabs).
- **`1.1`–`1.25`** — headings and dish names, which are short and want to look set.
- **`1.4`–`1.6`** — anything that wraps.

## Bilingual fit

The locale toggle switches **live**, so no measurement in this system may be
derived from one language. Both are first-class, and Spanish is the wider one
almost everywhere.

The worst case is the course label, the most repeated text in the app. At
`course-label` (`9px`, `.14em`, IBM Plex Mono's `0.6em` advance → `6.66px` per
character):

| | soup | side | main |
| --- | --- | --- | --- |
| English | `SOUP` 27px | `SIDE` 27px | `MAIN` 27px |
| Spanish | `SOPA` 27px | `GUARNICIÓN` **67px** | `FUERTE` 40px |

The mockup sizes that column at `46px`, which fits English and clips
`GUARNICIÓN` by a third. Hence the rule:

> **No mono label element is ever given a fixed width.** Course labels, chips,
> badges, tags and tab labels size to their content. Where a row of them can
> overflow, it scrolls; it never truncates and never wraps.

Three consequences:

- **Never abbreviate to fit.** `GUARN.` in a household app reading its own
  menu is a worse outcome than a wider column. If a label will not fit, the
  layout changes, not the word. (`Fuerte` is not an abbreviation — it is the
  household's own short form for the course, fixed in `CONTEXT.md`, and it is
  what both languages' layouts are sized against.)
- **Never branch layout on locale.** There is no Spanish variant of a
  component. One layout absorbs both, which is what makes a live toggle safe.
- **Fixed widths are still allowed where the content is language-invariant.**
  The day card's `44px` mono gutter is fixed on purpose: `MON 24` and `LUN 24`
  are the same width, and fixing it is what aligns the days down the week.

**Sans is unaffected in principle** — dish names, titles and button labels were
already intrinsic — but Spanish copy still runs longer, so no Sans control may
be sized to its English label either.

## Spacing

**The mockup has no spacing scale.** Measured values include 1, 2, 3, 4, 5, 6,
7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 26, 30, 40, and 44 pixels.
Reproducing that literally guarantees two implementers diverge, so the system
snaps to a **4px scale**, with two half-steps for typographic gaps that a 4px
grid makes too airy.

| Token | Value |
| --- | --- |
| `--space-025` | `2px` |
| `--space-05` | `6px` |
| `--space-1` | `8px` |
| `--space-2` | `12px` |
| `--space-3` | `16px` |
| `--space-4` | `20px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `40px` |

`4px` exists as a raw value for the tightest label-to-value gaps but is not a
step anyone should reach for when spacing blocks.

**How the mockup's values map onto it:**

| Measured | Snaps to |
| --- | --- |
| 1, 2, 3 | `2px` |
| 4, 5, 6, 7 | `6px` |
| 8, 9 | `8px` |
| 10, 11, 12, 13 | `12px` |
| 14, 15, 16, 18 | `16px` |
| 20, 22 | `20px` |
| 24, 26 | `24px` |
| 30, 32 | `32px` |
| 40, 44 | `40px` |

### The spacing decisions that matter

Snapping only helps if the recurring cases are named. These are binding:

| Where | Value |
| --- | --- |
| Phone screen gutter | `16px` on both sides, everywhere. |
| Desktop content padding | `24px 32px 32px`. |
| Desktop sidebar | width `184px`, padding `24px 16px`, `24px` between its groups. |
| Card padding (day card, history card, list row) | `12px 16px`. |
| Card padding (today card, sheet sections) | `16px`. |
| Gap between day cards in a list | `8px`. |
| Gap between courses inside the today card | `8px`. |
| Gap between the day gutter and a card's content | `12px`. |
| Gap between a label and its value | `2px`. |
| Sheet padding | `20px 16px 24px`, `16px` between its sections. |
| Screen header | `16px` top, `12px` below, before the first content block. |
| Sign-in screen | `40px 24px`, `20px` between blocks. |

## Radii

Five values. Everything in the mockup collapses to one of them.

| Token | Value | What it is for |
| --- | --- | --- |
| `--radius-tag` | `3px` | Badges and outlined tags. |
| `--radius-control` | `8px` | Buttons, fields, segmented cells, icon buttons, the notice. |
| `--radius-card` | `10px` | Any card. |
| `--radius-sheet` | `16px 16px 0 0` | The bottom sheet. |
| `--radius-pill` | `999px` | A header action button, and filter chips. |

## Components

### Buttons

Two things vary independently, and confusing them is the main way this design
gets misimplemented:

- **Colour says what the action touches.** `--accent` green acts on the
  **weekly plan** (Generate week). `--ground-inverse` dark acts on the
  **catalogue, accounts, or session** (Add dish, Save dish, Sign in, Add
  member). This holds across every artboard in the chosen direction.
- **Shape says where the button sits.** A single action floating in a screen
  header is a **pill**. An action inside a form, a sheet, a toolbar group, or
  spanning a width is `--radius-control`.

| Variant | Ground | Ink | Border | Radius | Padding | Type |
| --- | --- | --- | --- | --- | --- | --- |
| **Primary — plan** | `--accent` | `--ink-on-accent` | none | pill (header) · control (toolbar group) | `12px 16px` | `button` |
| **Primary — catalogue** | `--ground-inverse` | `--ink-on-inverse` | none | pill (header) · control (form) | `12px 16px` · `16px 0` full-width | `button` · `button-lg` full-width |
| **Secondary** | `--ground-surface` | `--ink` | `1px --rule-control` | control | `12px 16px` | `button` at weight `500` |
| **Small outline** | transparent | `--ink` | `1px --rule-control` | control | `6px 12px` | `button-sm` |
| **Icon** | transparent | `--ink` | `1px --rule-control` | control | `32×32`, glyph `14px` | — |
| **Destructive** | transparent | `--danger` | `1px --danger-rule` | control | `16px` | `button-lg` |
| **Text action** | none | `--accent` | none | — | none | `link-inline` |

The `↻` glyph prefixes a reroll label with a normal space; it is text, not an
icon asset.

### Cards

| Card | Ground | Border | Radius | Padding |
| --- | --- | --- | --- | --- |
| **Day card** | `--ground-surface` | `1px --rule` | card | `12px 16px` |
| **Today card** | `--ground-surface` | **`1px --rule-strong`** | card | `16px` |
| **History card** | `--ground-surface` | `1px --rule` | card | `12px 16px` |
| **Notice** | `--notice-ground` | `1px --notice-rule` | card | `12px 16px` |
| **Placeholder** | none | `1px dashed --rule-dashed` | card | `12px 16px` |
| **Sunken note** | `--ground-sunken` | none | card | `12px 16px` |
| **List block** | `--ground-surface` | top `1px --rule`; rows separated by `1px --rule-inset` | none — full bleed to the screen edges | rows `12px 16px` |

The **list block** is the one surface that ignores the gutter: the catalogue
and the accounts list run edge to edge, and only their *contents* are inset by
`16px`. Everything else on those screens respects the gutter. This is what
makes a long list read as a continuous sheet rather than a stack of cards.

A **day card** is a three-part row: a fixed `44px` mono day gutter
(`day-label`, day name over day number), the content column, and an optional
trailing affordance. The gutter width is fixed so that day labels align down
the whole week, and it is safe to fix because day labels are the same width in
both languages.

Inside the content column, the **desktop** day card lays the three courses out
as `grid-template-columns: max-content 1fr` — a `course-label` column and a
dish-name column. `max-content` rather than a fixed width: every day card grids
the same three labels, so the column resolves to the same width on every card
and alignment is preserved for free, while the column re-measures itself when
the locale toggles. See [Bilingual fit](#bilingual-fit).

On the **phone**, the compact rows carry no course labels at all — the dish
names alone, `main` with `soup · side` beneath it — so the column does not
exist there. The today card stacks its label above each dish and is therefore
unconstrained in either language.

### Chips

A horizontal filter row. `--radius-pill`, padding `6px 12px`, `chip` type.

- **Selected:** `--ground-inverse` / `--ink-on-inverse`, weight `600`.
- **Idle:** `--ground-chip` / `--ink-secondary`, weight `500`.

The count is part of the label (`SOUPS 7`), not a separate element.

Chips carry the **plural** course names, which are the widest strings in the
system (`GUARNICIONES 12`). They size to content and the row scrolls
horizontally on a phone rather than truncating or wrapping — see
[Bilingual fit](#bilingual-fit).

### Badges and tags

- **Badge** (filled): `--ground-inverse` / `--ink-on-inverse`, `--radius-tag`,
  padding `2px 6px`, `badge` type. Used for `TODAY` and `ADMIN`.
- **Tag** (outlined): transparent, `1px --rule-control`, `--radius-tag`,
  padding `2px 6px`, `tag` type in `--ink-muted`. Used for `READ ONLY`.

Filled means *this one, now*. Outlined means *a state this thing is in*.

### Fields

| Part | Spec |
| --- | --- |
| Label | `eyebrow`, `--ink-muted`, `6px` below. |
| Input | `--ground-surface`, `1px --rule-control`, `--radius-control`, padding `12px`, `body` in `--ink`. |
| Focused | Border becomes `1px --rule-strong`. Nothing else changes — no ring, no shadow. |
| Caret | `--accent`. |
| Help text | `meta`, `--ink-muted`, `6px` above. |

A password field uses **Mono** for its value; every other field uses Sans. This
follows the split rule: a masked password is not the household's words.

### Segmented control

Used once, for course selection. Equal-width cells, `6px` between them,
padding `12px 0`, centred.

- **Idle:** `1px --rule-control`, `--radius-control`, Sans `500 12px`, `--ink-secondary`.
- **Selected:** `1px solid --accent`, `--ground-accent-soft`, Sans `600 12px`, `--accent`.

This is the only place the accent appears as a border and a soft fill together.

### Notice

The short-catalogue notice, in [notice colours](#notice-amber), sits between
the screen header and the week. Three parts stacked with `6px` gaps: a headline
(`meta-sans` at weight `600`, `--notice-ink`), an explanation (`body-sm`,
`--notice-ink-secondary`), and a call to action (`chip` type, `--notice-ink-action`).

Its compact form — inside the live week screen — is one row: an `!` glyph and a
single sentence with an underlined action, `12px 16px`, `--radius-control`.

When a specific dish is the repeat, its name is wrapped inline in
`--notice-ground` at `--radius-tag`, padding `1px 4px`. This is the only place
the notice colour appears outside a notice.

### Sheet

`--scrim` over the dimmed screen; the sheet itself is `--ground-surface` at
`--radius-sheet`, padding `20px 16px 24px`, `16px` between sections. Its header
is `title-sheet` on the left and a dismiss text action on the right, in `meta`
mono, `--ink-muted`.

The dismiss word depends on what the sheet holds: **`Cancel`** where work would
be abandoned (the add/edit dish sheet), **`Close`** where nothing is at stake
(the `More` navigation sheet). Both go through `src/i18n.ts`.

The **`More` sheet** is this same component used for navigation, rising from
the bottom edge like any other. Its title is `More`; its contents, in order:
`Accounts` (only when the signed-in member is an admin), a `1px --rule`, then
the session block — username with role, the `EN / ES` toggle, and `Sign out`.
For a non-admin the sheet holds the session block alone.

### Tab bar (phone)

`--ground-surface`, top `1px --rule`, **four** equal cells, padding `12px 0`,
centred `tab` type. Full width; on a wide phone or a tablet below the
breakpoint the cells simply grow rather than capping and centring.

- **Active:** weight `600`, `--ink`, plus a `2px solid --accent` **top** border.
- **Idle:** weight `400`, `--ink-muted`.

The accent underline is on the top edge, not the bottom.

The cells are `Plan · Dishes · History · More`. The mockup draws three in `1b`;
the fourth exists because the sidebar carries destinations and a session block
that three cells cannot hold. `More` opens the [Sheet](#sheet).

The active marker is `--accent` on **every** cell, including `Dishes`,
`History` and `More`. This is the one place the green/dark rule below does not
apply: that rule governs what an action *acts on*, and a navigation indicator
acts on nothing.

The active cell follows the **URL**, not the route taken to it: any `/plan/*`
lights `Plan` — including a past week opened from History — and `/accounts`
lights `More`. Provenance-based highlighting would show the same URL with two
different bars.

The bar sits **under** `--scrim` whenever a sheet is open, so an edit in
progress cannot be navigated away from by a stray tap.

### Sidebar (desktop)

Width `184px`, `--ground-inverse`, padding `24px 16px`, `24px` between groups.
Its items are `This week · Dishes · History · Accounts` — four, not the five
`1d` draws. `Next week` is not a navigation destination at either width; see
[Navigation across the breakpoint](#navigation-across-the-breakpoint).

- Brand: Sans `600 13px` in `--ink-on-inverse`, with the instance name below in
  `meta` mono, `--ink-on-inverse-faint`.
- Item: padding `8px 12px`, `--radius-control`, Sans `400 12px`,
  `--ink-on-inverse-muted`.
- Active item: `rgba(255,254,251,.12)` ground, Sans `600 12px`,
  `--ink-on-inverse`.
- Footer: pinned to the bottom, `note` mono, `--ink-on-inverse-faint`, with the
  member's name lifted to `rgba(255,254,251,.75)`.

Counts ride in the label (`Dishes · 21`), never in a separate badge.

### Navigation across the breakpoint

There is **one breakpoint, at `900px`**, and one navigation component with two
forms. Below it: the four-cell [tab bar](#tab-bar-phone) plus the `More` sheet.
At or above it: the [sidebar](#sidebar-desktop). The same threshold also
expands a week-plan day row from the compact `main + soup · side` subtitle into
`1d`'s labelled `SOUP / SIDE / MAIN` rows — one threshold, both consequences.

A tablet in portrait (`768px`) is therefore on the **phone** side: `1d`'s
two-column week grid needs the width, leaving roughly `716px` of content beside
the `184px` sidebar at the threshold itself.

Both forms carry the **same destination set**, so nothing is reachable at one
width and not the other. `Accounts` remains admin-only in both.

**`Next week` is not a destination.** The app writes to exactly two weeks, so
stepping between them lives on the week screen as a single affordance in the
header that flips by which week is shown: `Next week →` on this week,
`← This week` on next week. Past weeks are reached only through History and
stay read-only. This applies at **both** widths, which is why the sidebar
carries four items rather than `1d`'s five.

No navigation chrome appears on sign-in, first-run setup, or forced password
change: there is either no session, or a session deliberately pinned to one
screen.

## Motion

The mockup carries one motion cue, in the live artboard `1e`: generating or
rerolling cycles the dish names through random values on a `55ms` interval for
ten ticks — about **550ms** — before settling on the real draw. It reads as a
slot machine coming to rest.

The canvas chrome also defines a `spin-blur` keyframe (a 3px rise from 25%
opacity) that no artboard applies. It describes the intended feel of a single
value landing.

Both are recorded here as observations. **Whether the draw animates, and for
how long, is a behaviour decision, not a visual-system one** — it belongs with
whichever ticket settles the generate and regenerate interaction.

## Where the mockup contradicts itself

Each of these is a case where two artboards disagree. The decision is made here
so it is not remade per screen. Each row says what the mockup does, what this
spec settles on, and why.

| # | Conflict | Mockup | Decided | Why |
| --- | --- | --- | --- | --- |
| 1 | Text on dark grounds | `#fff` (4×) and `#fffefb` (37×) | **`#fffefb`** | `#fff` is a slip. The warm off-white is the system's white. |
| 2 | The page ground | Notes call `#eae7e0` the canvas ground; no artboard uses it | **`#f6f4ef`** | `#eae7e0` is the design viewer's backdrop, not a product surface. Dropped entirely. |
| 3 | `1c`'s paper | `#fdfbf4` in the printed-ticket artboard only | **Dropped** | A one-artboard value with no role. If `1c` wins, it uses `--ground-page`. |
| 4 | Primary button colour | Dark in `1a`, `1f`, `1g`, `1j`, `1k`; green in `1b`, `1d`, `1e`, `1h` | **Green acts on the plan; dark acts on the catalogue, accounts, or session** | This is what the artboards already do once `1a` (the pre-system baseline) is set aside. It gives the accent a meaning instead of a mood. |
| 5 | Button radius | `4px`, `6px`, `7px`, `8px`, `999px` | **`8px`, or `999px` for a header action** | 6 vs 7 vs 8 is invisible; `4px` is `1c`-only. |
| 6 | Card radius | `9px` on desktop, `10px` on phone | **`10px`** | Nothing justifies the device split. |
| 7 | Page title | `700 26px`, `700 22px`, `700 20px`, `600 20px` | **`700 22px` phone, `700 26px` desktop** | Three phone sizes for one role. `600 20px` is from the baseline artboard. |
| 8 | Day-card dish name | `600 15px`, `600 14.5px` | **`600 15px`** | Half-pixels are drift, not intent. |
| 9 | Secondary summary line | `400 12.5px`, `400 12px` | **`400 12.5px`** | Majority, and it holds a long line of two dish names better. |
| 10 | List item name | `500 14.5px` | **`500 15px`** | Removes the last half-pixel. |
| 11 | Course label | `600 8.5px/.14em`, `400 10.5px`, `400 11px` | **`600 9px/.14em` uppercase, `--ink-muted`** | Three treatments for the app's most repeated label. The `600` weight is what makes it read as a label rather than as content. |
| 12 | Day label | `600 10px/.1em`, `600 10px/.14em`, `600 11px/.1em`, `700 11px/.1em` | **`600 10px/.12em` uppercase** | One value, splitting the difference in tracking. |
| 13 | Mono weight 700 | Used once (`1d`'s today label) but never loaded | **`600`** | `700` would render as synthetic bold. |
| 14 | Metadata size | `400 10.5px` (27×) and `400 11px` (20×) | **`400 11px`** | One size. The larger also helps a palette already thin on contrast. |
| 15 | Badge size | `600 8.5px` | **`600 9px`** | Half-pixel. |
| 16 | Hairline opacity | `.1`, `.12`, `.08` for the same job | **`.1`** | `.12` and `.08` appear once each. `.07` survives as `--rule-inset`, a genuinely different role. |
| 17 | Control border opacity | `.15`, `.18`, `.2`, `.25` | **`.18`** | Four values for one edge. Indistinguishable in use. |
| 18 | Line height | Unset on roughly two thirds of type styles | **Every role states one** | An unset line-height is a browser default, not a design. |
| 19 | Letter-spacing | `.08`, `.1`, `.12`, `.14`, `.16`, `.18`, `.3em` | **`.14em` at 9px, `.12em` at 10px** (`.3em` stays `1c`-only) | Tracking should follow size, not screen. |
| 20 | Card padding | `11px 14px`, `12px 15px`, `13px 16px`, `14px 15px`, `14px 16px` | **`12px 16px`** | Five paddings for one component. |
| 21 | Dark ground shade | `#191817` as ink and as ground | **One value, two tokens** (`--ink`, `--ground-inverse`) | Same colour, different jobs; naming both keeps a future adjustment from moving the other. |

## Contrast audit

Measured against WCAG 2.1 AA (`4.5:1` for body text, `3:1` for text at 18.66px
bold or 24px regular, and for interactive graphics).

| Foreground | Ground | Ratio | Verdict |
| --- | --- | --- | --- |
| `--ink` `#191817` | `--ground-page` `#f6f4ef` | 15.8:1 | Pass |
| `--ink-secondary` `#6d6862` | `--ground-surface` `#fffefb` | 5.5:1 | Pass |
| `--ink-muted` `#8b857d` | `--ground-surface` `#fffefb` | 3.2:1 | **Fails** — used at 9–11px |
| `--ink-muted` `#8b857d` | `--ground-page` `#f6f4ef` | 2.97:1 | **Fails** — the thinnest pairing in the system, and short of even the 3:1 large-text floor |
| `--ink-faint` `rgba(25,24,23,.3)` | `--ground-surface` `#fffefb` | 1.9:1 | **Fails** — and it is used on `↻` and `→`, which are controls |
| `--accent` `#2d6a4d` | `--ground-surface` `#fffefb` | 6.3:1 | Pass |
| `--ink-on-accent` `#fffefb` | `--accent` `#2d6a4d` | 6.4:1 | Pass |
| `--ink-on-inverse` `#fffefb` | `--ground-inverse` `#191817` | 17.6:1 | Pass |
| `--ink-on-inverse-muted` `rgba(255,254,251,.62)` | `--ground-inverse` | 7.4:1 | Pass |
| `--ink-on-inverse-faint` `rgba(255,254,251,.4)` | `--ground-inverse` | 3.8:1 | **Fails** — used at 11px |
| `--notice-ink` `#6b4c1c` | `--notice-ground` `#faf3e2` | 7.1:1 | Pass |
| `--notice-ink-secondary` `#7a5a26` | `--notice-ground` | 5.7:1 | Pass |
| `--notice-ink-action` `#8a6023` | `--notice-ground` | 5.0:1 | Pass |

Four failures, and they are not equivalent:

- **`--ink-muted` at 2.97–3.2:1** is the systemic one. It carries every mono
  label, date, count and eyebrow — a large share of the text on every screen —
  at 9–11px, the sizes with the least tolerance for low contrast.
- **`--ink-faint` at 1.9:1** is the sharp one. The `↻` reroll glyph and the `→`
  chevron are *controls*, and at that ratio they are close to invisible as
  affordances.
- **`--ink-on-inverse-faint` at 3.8:1** affects only the sidebar footer.

**This spec does not fix them**, because darkening `--ink-muted` shifts the
whole feel of the design and that is a decision for the household, not a
mechanical correction. The numbers are recorded so the choice is made with them
in hand.

## Open questions this spec deliberately leaves

- **The contrast failures above.** They need a decision, not a default.
- **Which week-screen variant is the direction.** `1b` is the designer's own
  pick; nothing in this document depends on the answer.
- **What the week-stepper affordance looks like.** `Next week →` / `← This
  week` in the week header is settled as the *behaviour*, but no artboard draws
  it, so its type, weight and placement within the header are unspecified.
- **Two screens have no artboard:** first-run setup, and forced password
  change. They must be composed from the components above.
- **Hover, active, disabled, and focus-visible states.** The mockup is static
  and shows none of them, except the link hover in the canvas chrome
  (`--accent-hover`). Every interactive component above needs these filled in.
