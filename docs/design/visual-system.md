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
(buttons, cards, chips, badges, fields, list rows, notice, sheet, panel, tab
bar, sidebar), and the interactive states every one of them takes.

**Does not cover:**

- **Per-screen layout.** How the desktop grid reflows within a screen is a
  separate decision on the redesign map. Five are now settled and written up
  above: the week-screen variant (`1b`), what the sidebar becomes on a phone,
  [the dish catalogue](#the-dish-catalogue),
  [accounts](#the-accounts-screen) — which split off
  [a settings screen](#the-settings-screen) in the process — and
  [history](#the-history-screen), which carries
  [what a past week opens into](#what-a-past-week-opens-into) with it.
- **How this gets implemented.** Settled separately, in
  [CSS structure](./css-structure.md): the tokens named here *are* CSS custom
  properties on `:root` under these exact names, `styles.css` splits into
  `src/styles/`, and there is one literal `@media (min-width: 900px)`. That
  document decides the shape of the code; this one decides the design.
- **Copy.** Every visible string goes through `src/i18n.ts` (ADR-0001). The
  English words in the mockup are placeholders for keys, not content.
- **Accessibility.** **WCAG 2.1 AA is the floor**, and this document clears it:
  `4.5:1` for every text pairing, `3:1` for any glyph that is the only
  indication of a control. The [contrast audit](#contrast-audit) below is the
  record — every pairing measured, and the three that once failed decided.

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
| `--inverse-hover` | `#2c2a28` | An inverse fill under the cursor. See [Interactive states](#interactive-states). |
| `--inverse-pressed` | `#0f0e0e` | An inverse fill being pressed. |
| `--ground-notice` | `#faf3e2` | The amber notice, and the inline highlight on a repeated dish name. **Reserved for the short-catalogue notice and nothing else.** |
| `--ground-sunken` | `rgba(25,24,23,.05)` | An explanatory block recessed into the page (the admin-rights note in `1k`). No border. |
| `--ground-chip` | `rgba(25,24,23,.07)` | An unselected chip in a filter row. |
| `--ground-inverse-soft` | `rgba(25,24,23,.06)` | The selected cell of a segmented control. Replaces `--ground-accent-soft`, which is dropped: the segment is [dark, not green](#segmented-control), and that token had no other user. |
| `--scrim` | `rgba(25,24,23,.45)` | Behind a sheet or a panel. |

### Ink

| Token | Value | What it is for |
| --- | --- | --- |
| `--ink` | `#191817` | Everything that must be read: dish names, headings, button labels, the day a card is for. |
| `--ink-secondary` | `#6d6862` | Sans prose that supports the primary line — the "soup · side" summary under a main, an explanatory sentence. |
| `--ink-muted` | `#6d6862` | **Mono only.** Labels, dates, counts, authorship, and every eyebrow. If text is muted and not mono, it is `--ink-secondary`, not this. Same value as `--ink-secondary`, two tokens because they are two jobs: a label reads as a label through family, case, size and weight, never through colour. See the [contrast audit](#contrast-audit). |
| `--ink-faint` | `rgba(25,24,23,.3)` | **Decoration only**, and the one token in this document that does not clear `4.5:1`. Its single use is the `→` on a history row, which sits beside a high-contrast date on a row that is *itself* the control: the arrow repeats what the card already says. Never put it on a glyph that carries a job of its own. |
| `--ink-on-inverse` | `#fffefb` | Text and glyphs on `--ground-inverse`. |
| `--ink-on-inverse-muted` | `rgba(255,254,251,.62)` | Idle sidebar navigation items. |
| `--ink-on-inverse-faint` | `rgba(255,254,251,.55)` | Sidebar footer metadata, and the instance name under the brand. A step dimmer than the idle nav items, and still past `4.5:1`. |

**Standing rule — a glyph that is the whole control is not decoration.** If a
mark carries an action on its own, with no text label beside it, it is a
control and takes real ink (`--ink` or `--ink-secondary`), never
`--ink-faint`. The `⋯` on a catalogue row is the one such mark in this design.
Where a glyph merely accompanies a label — the `↻` in `↻ Reroll day`, the `→`
in `Next week →` — it is *text inside* that control and takes the control's own
colour; it is not a glyph question at all.

### Accent

One green, used sparingly.

| Token | Value | What it is for |
| --- | --- | --- |
| `--accent` | `#2d6a4d` | The primary plan action, links, inline text actions, the active tab's underline, the text caret. **Not** the selected segmented cell — see [rule 22](#where-the-mockup-contradicts-itself). |
| `--accent-hover` | `#1f4d38` | Hover on a link, an accent-coloured text action, or an accent fill. |
| `--accent-pressed` | `#184029` | An accent fill being pressed. See [Interactive states](#interactive-states). |
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
`'IBM Plex Mono', ui-monospace, monospace`. Both are used **plain**, with no
metric tuning. Note that `src/styles.css` today writes bare `monospace`, which
resolves to a slab serif on some platforms; the value above is the binding one.

How they are served is settled in [Loading the fonts](#loading-the-fonts)
below, and does not affect the scales.

### Loading the fonts

Self-hosted from Fontsource's pre-built subsets, **vendored** into
`public/fonts/` under stable filenames with a hand-written `@font-face` block.
Fontsource is the source of the bytes, not a runtime import: nothing resolves
its CSS at build time, so no hashed filename ever has to be recovered from
Vite's manifest.

Because the `@font-face` blocks are hand-written, the app **chooses the family
names**, and names them `IBM Plex Sans` and `IBM Plex Mono` — matching the
stacks above. Importing Fontsource's own CSS would have registered the variable
Sans as `IBM Plex Sans Variable` and forced that name into every stack.

Four files, latin subset, 89 KB total:

| File | Bytes | Weights | Preloaded |
| --- | --- | --- | --- |
| `ibm-plex-sans-latin-wght-normal.woff2` | 45,712 | variable, 400–700 | **yes** |
| `ibm-plex-mono-latin-600-normal.woff2` | 15,620 | 600 | **yes** |
| `ibm-plex-mono-latin-400-normal.woff2` | 14,708 | 400 | no |
| `ibm-plex-mono-latin-500-normal.woff2` | 14,888 | 500 | no |

Mono has no variable build on Fontsource, which is why it is three files where
Sans is one.

**`font-display: optional` on all four.** A cold visit that misses the ~100 ms
window renders entirely in the fallback for that page load, and picks up Plex
from cache on the next one. The alternative, `swap`, was declined: it reflows
dish names — the densest and most-read text on the phone — and Plex Sans is
appreciably wider than the `system-ui` faces it would replace.

**Preload the two weights the design cannot do without**: the variable Sans,
which carries every dish name, and Mono 600, which is the structural weight
behind every eyebrow, day label, course label, badge, chip and tab. Without a
preload a font is discovered a round-trip late, after `styles.css` parses, and
under `optional` that reliably loses the window. Preloading only Sans would
have shipped a first visit with Plex dish names beside system-mono labels —
the Sans/Mono split rule half-applied, which reads worse than not applied.
Mono 400 and 500 are left to arrive on their own; they carry metadata and the
outlined tag, where the substitution barely reads.

**Cache the directory as immutable.** `optional` only pays off if the second
visit finds the fonts already in cache and inside the window, so a
revalidation round-trip would quietly defeat it. Stable filenames carry no
content hash, so the policy must be declared — in **Nitro `routeRules`**, not
`vercel.json`, whose `headers` key is ignored under the Build Output API that
Nitro emits:

```
'/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
```

The price of `immutable` on unhashed names: **upgrading IBM Plex means renaming
the files by hand.**

Those weight sets are **closed**, and stay closed even though Sans is a
variable font whose axis makes extra weights free. See [Weight](#weight).

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

### Weight

Both scales draw from a **closed set** of weights, and the two families are
closed for different reasons:

```
IBM Plex Sans  400 500 600 700   closed by discipline
IBM Plex Mono  400 500 600       closed by file cost
```

Sans is a **variable** font — one 45,712 B file carrying the continuous
100–700 axis — so four weights and forty weights cost exactly the same. The set
stays four anyway, because the four were never a budget. They are a ladder of
four jobs:

| Weight | Job | Roles that use it |
| --- | --- | --- |
| `700` | Titles | `title-page-desktop`, `title-page`, `title-sheet`. Sans only. |
| `600` | Emphasis and controls | `dish-hero`, `dish-card`, the `button*` roles; and on the mono side `eyebrow`, `course-label`, `day-label`, `badge`, and the active state of `chip` and `tab`. |
| `500` | Rows and inline actions | `dish-today`, `item-name`, `link-inline`, the Secondary button's label (the one component that steps `button` down a rung), mono `tag`, idle `chip`. |
| `400` | Prose and metadata | `body`, `body-sm`, `meta-sans`, mono `meta` and `note`, idle `tab`. |

**A fifth weight would need a fifth job, not a fifth number.** The axis being
free is not a reason to spend it: a discrete set keeps seven screens
consistent and keeps `font-weight` a token rather than a number anyone can
invent. That discipline got *more* load-bearing, not less, when the palette's
accessibility floor collapsed `--ink-muted` onto `--ink-secondary` — a label
now reads as a label through family, case, size and weight, and weight is the
only one of the four that a careless component can change by accident.

**No in-between values, and no optical compensation by size.** The tempting
use of a free axis is to render small text a little heavier — Sans `600` at
`button-sm`'s 11px is thinner on the page than the same `600` at
`dish-hero`'s 21px. Declined: making weight a function of size means `600`
stops meaning one thing, and every component that changes size across the
900px breakpoint would silently change weight with it. If a small control
reads thin, move it up the ladder in the scale table, where the change is
visible, rather than bending the value underneath it.

The `600`/`700` gap, subtle on IBM Plex Sans at small sizes, needs no
in-between value either: `700` runs only at 16–26px and only on titles, `600`
at 11–21px, so the two never meet at the same size and the gap is never put to
a side-by-side test.

**The asymmetry is a constraint, not an oversight.** No variable IBM Plex Mono
exists on either source, so Mono's three weights are three static files
(~89 KB together) and a fourth costs both a file and a preload decision.
Neither family may gain a weight without the other being checked: a split rule
that applies to only one half of the system reads worse than one not applied
at all — the same reasoning that preloads Mono `600` alongside the variable
Sans rather than Sans alone.

**Weight does not animate.** A variable font can interpolate `font-weight`
continuously, which would let the two state changes that move weight — `tab`
idle `400` → active `600`, `chip` idle `500` → `600` — transition rather than
snap. Both are **Mono**, the family that cannot interpolate, so the one place
this would apply is the one place the font forbids it. Weight changes are
instant everywhere.

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

### The measurement that killed the accounts table

The [accounts screen](#the-accounts-screen) was going to be a four-column table
at desktop width. Measured in Spanish at the threshold, it overflows — and the
overflow is the reason this section exists, so it is recorded rather than
quietly designed around.

At `900px` the content column is `716px` beside the `184px` sidebar, and the
list block insets its contents by `16px` each side: **`684px` of usable width.**
Against that, in Spanish:

| Column | Contents | Width |
| --- | --- | --- |
| Member | `mariana` + `(tú)` | `120px` |
| Role | `ADMIN` badge | `78px` |
| Status | `DEBE CAMBIAR CONTRASEÑA` tag | `195px` |
| Actions | `Restablecer contraseña` `151px` · `Hacer administrador` `134px` · `Eliminar` `69px`, `6px` apart | `398px` |
| | | **`801px`** |

Every lever this document would normally reach for is already forbidden: the
labels cannot be abbreviated, the tag cannot be given a fixed width, and the
layout cannot branch on locale. So the fix is structural — role and status fold
back under the username, where the phone already draws them, and the columns
go with them:

| | Width |
| --- | --- |
| Member (username, `(tú)`, badge and tag on a second line) | `246px` |
| Actions | `398px` |
| | **`644px`**, inside `684px` |

Two consequences worth stating. **The action group is capped at three**: a
fourth Spanish label of any plausible length crosses the line. And **a column
is the expensive way to show a tag** — a `Status` column is as wide as its
widest tag on *every* row, while the same tag under a username costs the rows
without one nothing at all.

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
| **Notice** | `--notice-ground` | `1px --notice-rule` | card | `12px 16px` |
| **Placeholder** | none | `1px dashed --rule-dashed` | card | `12px 16px` |
| **Sunken note** | `--ground-sunken` | none | card | `12px 16px` |
| **List block** | `--ground-surface` | top `1px --rule`; rows separated by `1px --rule-inset` | none — full bleed to the screen edges | rows `12px 16px` |

The **list block** is the one surface that ignores the gutter: the catalogue,
accounts and history lists run edge to edge, and only their *contents* are
inset by `16px`. Everything else on those screens respects the gutter. This is what
makes a long list read as a continuous sheet rather than a stack of cards.

**The Placeholder card has no user left.** `--rule-dashed`'s only documented
use is the "past days" placeholder tile, and both readings of that tile have
since been decided away: if it drew elapsed days,
[#32](https://github.com/lfeq/food-organizer/issues/32) made those visible and
dimmed rather than dashed; if it drew never-planned dates,
[#72](https://github.com/lfeq/food-organizer/issues/72) made them absent from
the screen entirely. Both rows are left standing rather than deleted, because
[#88](https://github.com/lfeq/food-organizer/issues/88) may still claim them
for the week screen's own empty state. Same shape as `--ground-accent-soft`
losing its only user in
[#84](https://github.com/lfeq/food-organizer/issues/84).

A catalogue row's trailing `⋯` is `--ink-secondary`, not `--ink-faint`: it is
the row's only control and has no text beside it. A history row's trailing `→`
*is* `--ink-faint`, because the whole row is the control and the arrow only
repeats that. Being an unlabelled control, the `⋯` also needs an accessible
name when it is built.

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

### The list block at width

The [list block](#cards) is the one surface with two forms across the
breakpoint. Below `900px` a row's actions sit behind a `···` and an
[action sheet](#sheet); at or above it, a row that carries more than one action
shows them **inline at the end of the row** — [Small outline](#buttons) buttons
in a right-aligned group, `6px` apart, no wrap. Everything else about the block
is unchanged: same ground, same full bleed, same `16px` inset, same
`--rule-inset` between rows.

Used once, on [accounts](#the-accounts-screen). A catalogue row carries one
action and gains nothing from the width, so it keeps its `···` at both widths,
and a [history](#the-history-screen) row carries no action at all — the row
*is* the control — so it takes neither form.

**A row's inline action group never wraps, which caps it at three actions.**
Three is the measured limit at the threshold in Spanish — see
[Bilingual fit](#bilingual-fit). A fourth action does not get a narrower button
or a shortened label; it goes behind the `···` at both widths.

**The row still takes no state.** It is a surface that
[contains controls rather than being one](#a-surface-that-contains-a-control-is-not-itself-a-control),
and that is true of the inline group exactly as it was of the `···`.

**There is no table in this design.** A four-column table was the obvious
desktop form for accounts and it does not fit; the measurement is in
[Bilingual fit](#bilingual-fit).

### Chips

A horizontal filter row. `--radius-pill`, padding `6px 12px`, `chip` type.

- **Selected:** `--ground-inverse` / `--ink-on-inverse`, weight `600`.
- **Idle:** `--ground-chip` / `--ink-secondary`, weight `500`.

The count is part of the label (`SOUPS 7`), not a separate element.

Chips carry the **plural** course names, which are the widest strings in the
system (`GUARNICIONES 12`). They size to content and the row scrolls
horizontally on a phone rather than truncating or wrapping — see
[Bilingual fit](#bilingual-fit).

**The chips filter; they do not group.** Exactly one is selected at any time,
and the list below shows only that selection. This is a behaviour, not a
decoration, and it has one consequence that reaches past the component: **a
filter and a by-course grid are mutually exclusive.** Filtering to one course
in a three-column-by-course layout would leave one column full and two empty,
so the catalogue is a single list at *both* widths. See
[The dish catalogue](#the-dish-catalogue).

**There are four chips, not three.** `All` comes first and is **selected by
default**, so the catalogue opens whole and the courses narrow it. Without it a
filter has no way back to the full list, and the catalogue — which every other
version of this screen showed in full — could never be seen entire. `All`
carries the catalogue total, formatted like the other counts. A fresh instance
is **not** empty: `SPEC.md` §10 seeds 27 dishes at setup, nine per course, so
`All` is the useful default from the first visit rather than an empty state.

The fourth chip is what makes this row the tightest in the system. At `390px`
it fits in Spanish **only** with `Guarniciones`; the 15-character
`Acompañamientos` overflows. That makes the `courseSide` / `courseSidePlural`
rename a prerequisite of this screen, not a nicety — see
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
- **Selected:** `1px solid --rule-strong`, `--ground-inverse-soft`, Sans `600 12px`, `--ink`.

**Selected is dark, not green.** `1g` draws it in the accent, and that is a
mockup error rather than an exemption: the green/dark rule governs what an
action *acts on*, and choosing a dish's course acts on the catalogue, which is
dark territory. The two standing exemptions — the tab bar's active marker and
the week stepper — are both **navigation**, which acts on nothing; a course
segment is not navigation.

This raises the segment's stakes rather than lowering them. Because the
catalogue's `+ Add dish` is course-neutral (see
[The dish catalogue](#the-dish-catalogue)), this control is the **only** place
a course is chosen when adding a dish.

`--ground-inverse-soft` is `rgba(25,24,23,.06)`: the dark counterpart of
`--ground-accent-soft`, which now has no user and is dropped.

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

**The repeating-week notice appears where the repeat can still be undone.** It
warns a household before it lives the week, so it belongs to a *writable* week
and does not follow a plan into [history](#the-history-screen). An alert with
no action behind it teaches people to ignore alerts, and the week's own rows
say "we ate soup twice" in a form that can actually be read. Stated as one rule
rather than a past-week exception.

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
`Accounts` and `Settings` (both only when the signed-in member is an admin), a
`1px --rule`, then the session block — username with role, the `EN / ES`
toggle, and `Sign out`. For a non-admin the sheet holds the session block
alone.

The **action sheet** is the third use: what a catalogue row's `···` opens, and
what a [member row's](#the-accounts-screen) `···` opens below `900px`. Its
title is the **row's own subject** — the dish's name, the member's username —
rather than a label, because the sheet has to say which row was tapped and that
row is behind the scrim. It dismisses on `Cancel`. Its contents are one action
per row, `body` in `--ink`, `15px 4px`, separated by `1px --rule-inset`, with
the destructive action last and in `--danger`. No icons.

**A sheet is the phone's form. The desktop's is a [Panel](#panel-desktop).**

### Panel (desktop)

The same content as a Sheet, centred on the same `--scrim` instead of rising
from the bottom edge. `--ground-surface`, `1px --rule`, `--radius-card`,
padding `22px`, `max-width 420px`, `16px` between sections; the header and
dismiss are the Sheet's.

It takes a border because the system has [no elevation](#elevation) to separate
it from the scrim, and it is the only floating surface wide enough to need
one — a sheet is anchored to an edge and does not.

This is the one component that is **two-formed across the breakpoint**: a Sheet
below `900px`, a Panel above. Under [CSS structure](./css-structure.md) that
earns a React component with a typed variant prop rather than a class.

The rising sheet was considered for both widths — one component, no branch, the
answer [the week stepper](#the-week-stepper) reached. It was declined here
because a form is not a step: a full-width band of chrome pinned to the bottom
edge of a wide monitor puts the fields far from the row that opened them, and
unlike the stepper there is no locale-fit argument forcing the phone's answer
onto the desktop.

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

**Four cells hold five destinations because `More` is not one.** It is the
drawer the two admin-only destinations and the session block sit in, so adding
`Settings` beside `Accounts` lengthens that sheet and leaves the bar untouched.
The bar's width is fixed at four; the sheet's contents are not.

The active marker is `--accent` on **every** cell, including `Dishes`,
`History` and `More`. This is the one place the green/dark rule below does not
apply: that rule governs what an action *acts on*, and a navigation indicator
acts on nothing.

The active cell follows the **URL**, not the route taken to it: any `/plan/*`
lights `Plan` — including a past week opened from History — and `/accounts` and
`/settings` both light `More`. Provenance-based highlighting would show the
same URL with two different bars.

The bar sits **under** `--scrim` whenever a sheet is open, so an edit in
progress cannot be navigated away from by a stray tap.

### Sidebar (desktop)

Width `184px`, `--ground-inverse`, padding `24px 16px`, `24px` between groups.
Its items are `This week · Dishes · History · Accounts · Settings` — five, but
not `1d`'s five. `1d`'s fifth is `Next week`, which is not a navigation
destination at either width; the fifth here is `Settings`, which
[left the accounts screen](#the-settings-screen). `Accounts` and `Settings` are
both admin-only, so a non-admin sees three items. See
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

Both forms carry the **same destination set** — `This week`, `Dishes`,
`History`, `Accounts`, `Settings` — so nothing is reachable at one width and
not the other. `Accounts` and `Settings` are admin-only in both. The sets match
even though the sidebar shows five items against the bar's four cells, because
`More` is a drawer rather than a destination and holds the two admin-only
screens plus the session block.

**`Next week` is not a destination.** The app writes to exactly two weeks, so
stepping between them lives on the week screen as a single affordance in the
header that flips by which week is shown: `Next week →` on this week,
`← This week` on next week. Past weeks are reached only through History and
stay read-only. This applies at **both** widths, which is why `Next week` is
not one of the sidebar's five items.

#### The week stepper

No artboard draws it, so its treatment is specified here rather than read off
the mockup.

The stepper is the [**Text action**](#buttons) variant — `link-inline`, Sans
`500 12px`, `--accent`, no border and no ground — placed in the week header
block **beneath the week range**, left-aligned under it. The same treatment in
the same slot at both widths: one component, no breakpoint branch. Only the
range above it changes size (`title-page` on the phone, `title-page-desktop`
above `900px`).

| Showing | Label |
| --- | --- |
| This week | `Next week →` |
| Next week | `← This week` |

- **The arrow rides the word and trails the direction of travel**: forward, it
  follows the label; back, it leads. It is text with a normal space, like the
  `↻` reroll glyph — never an icon asset, and never the whole control. A bare
  `→` would have to carry "next *week*" alone, beside a `←` meaning "this week"
  rather than "previous week", which [the accessibility floor](#contrast-audit)
  forbids: *a glyph that is the whole control is not decoration*.
- **Green, not ink.** Stepping between two weeks moves the view without
  touching a plan, so it falls under the same navigation exemption as the
  [tab bar](#tab-bar-phone)'s active marker: the green/dark rule governs what an
  action *acts on*, and navigation acts on nothing. This puts two greens on the
  week screen, only one of which is a plan action — accepted, and the reason the
  stepper is a text action rather than a second button: a link does not compete
  with `Generate week` for "the thing to press".
- **The text action takes a `44px` hit area** from vertical padding, pulled back
  with an equal negative margin so the header's rhythm is unchanged. This is a
  standing rule, not a local fix: **a text action on a touch surface pads to a
  thumb target; the padding never becomes visible spacing.**
- **It is never a button.** The header's action group holds exactly one control
  — `Generate week` — at both widths. The stepper is not admitted to it, even on
  the desktop where `Print` being out of scope leaves the room: the phone
  header cannot afford a second button in Spanish (`Semana siguiente` beside
  `Generar semana` overruns `390px` and the group wraps), and
  [Bilingual fit](#bilingual-fit) forbids a layout that branches on locale.

No navigation chrome appears on sign-in, first-run setup, or forced password
change: there is either no session, or a session deliberately pinned to one
screen.

### The dish catalogue

One list at **both** widths, filtered by [chips](#chips). Today's three-column
`catalogue-grid` is retired: a filter and a by-course grid cannot coexist, and
the filter is what survives a `390px` screen. The desktop is the same list in
the wider content column, not a different composition — the phone decides this
screen and the desktop only has to not fight it.

**The row** is the dish name (`list-item`) over `added by <member>` in `meta`
mono, with a `···` on the right that opens the
[action sheet](#sheet). The row itself is **not** a control: it is a surface
that contains one, so it takes no state and the `···` carries the affordance —
the same rule the day card follows, in
[A surface that contains a control](#a-surface-that-contains-a-control-is-not-itself-a-control).

Tapping the row instead, with no glyph at all, was the alternative. It is the
larger touch target and the quieter screen, but it would make the row the
control and so require amending that rule for one screen. The `···` keeps one
rule for the whole system.

**Adding a dish** is one course-neutral action in the screen header, dark, at
both widths. Per-course add buttons die with the columns; the course is chosen
in the form's [segmented control](#segmented-control) instead, which is why
that control is the only place a course is set. `dishAddTitle` loses its
`{course}` interpolation.

**Deleting** happens twice over: as the destructive row of the action sheet,
and inside the form. Both are `--danger`; neither is a bare glyph.

### The accounts screen

**One list block at both widths.** The only thing that changes across `900px`
is where a member's three actions sit: behind a `···` below the threshold,
[inline at the end of the row](#the-list-block-at-width) above it. This is the
**second two-formed component** on this map, after the
[Sheet and Panel](#panel-desktop) pair, and under
[CSS structure](./css-structure.md) it earns a React component with a typed
variant prop rather than a class.

**The branch is earned by the row's contents, not by its width.** A member row
carries three *different verbs* on one person — reset a password, change a
role, remove the account — where a catalogue row carries one, `Edit`. A list
that grows wider can promote one default action into view; it cannot promote
three, and a row with three inline actions is the loudest thing in this design
(it wraps to three lines in Spanish at `390px`). So the phone hides all three
behind a `···` and the desktop, which has the room, shows all three at once.
The catalogue stayed one form because widening it had nothing to reveal.

**The phone row** is the username (`item-name`) with `(you)` after it in `meta`
mono, a second line carrying the member's badge and tag, and a `···` on the
right that opens the [action sheet](#sheet) titled with that username. The row
is not a control; the `···` is, and needs an accessible name — the same rule
the catalogue row follows.

**The desktop row** is that same row with the `···` replaced by the three
actions as [Small outline](#buttons) buttons, right-aligned. It stays at three:
a fourth overflows in Spanish at the threshold. See
[Bilingual fit](#bilingual-fit).

**A four-column table was the intended desktop form and it does not fit.**
`Member · Role · Status ·` actions measures **≈801px** in Spanish against the
**684px** the content column offers at the threshold. Folding role and status
back under the username — where the phone already puts them — is what recovers
the width, and it leaves the two forms differing in exactly one thing, which is
the smallest branch a two-formed component can have. The measurement is in
[Bilingual fit](#bilingual-fit).

**Role and status are a badge and a tag, and the difference is the point.**
An admin carries the filled `ADMIN` [badge](#badges-and-tags); everyone else
carries nothing, because with two roles a `MEMBER` tag on most rows is noise
and absence already says it. `must change password` is the **outlined tag** —
*a state this thing is in*, which is exactly what the outlined variant is for.
Both ride the row's second line at both widths, which is the other half of why
the four-column table failed: a `Status` column has to be as wide as its widest
tag on every row, while a tag under a username costs nothing on the rows that
do not carry one.

**The screen is dark territory.** `1k` draws `Reset password` in `--accent`;
that is a mockup error, not a third exemption — see
[rule 24](#where-the-mockup-contradicts-itself). Nothing on this screen is
green but the active tab's marker.

**`Remove` is `--danger` in both forms and is never a row's default.** On the
phone it is the action sheet's last row; on the desktop it is the last button
in the group. It confirms in a Sheet below the breakpoint and a Panel above,
like any other form.

#### A disabled control keeps its own label

An instance never has fewer than one admin (`CONTEXT.md`), so on the last
remaining admin **both** the role control and `Remove` are unavailable, and
both take the [Disabled](#disabled) treatment with a real `disabled` attribute.

Today the role button's *text* is replaced by `Last admin` when it is
disabled, so the control stops saying what it does and the row offers a button
whose label is a fact about the member. That inverts the relationship. Standing
rule, and it generalises past this screen:

> **A disabled control keeps its own label. The reason it is unavailable sits
> beside it, never in place of it.**

`Last admin` therefore reads as a `meta` mono note in the row, and the two
controls keep saying `Make member` and `Remove` while refusing to do either.
The locked week start on [the settings screen](#the-settings-screen) already
works this way — the value stays legible and `(locked — a plan already exists)`
sits after it.

### The settings screen

`Instance settings` and `Export data` **leave accounts** and become their own
admin-only destination. Accounts keeps the members list and the admin-rights
note in a [sunken block](#cards) — one screen, one subject.

They left rather than folding into a segmented control on accounts because the
two are not two views of one thing: a member list and an instance's week start
share only the fact that an admin edits both. A segmented control would also
have given that component a second job on the very screen where
[it became the only place a course is set](#segmented-control).

The screen is two sections down one column at both widths, each titled with an
`eyebrow`:

- **Instance settings** — the three [fields](#fields) (week start, timezone,
  display name) and a dark `Save settings`. Week start, once a plan exists, is
  not a disabled `select`: it is the weekday as plain text with
  `(locked — a plan already exists)` after it in `meta` mono. The value a
  household cannot change is still a value it needs to read.
- **Export data** — its explanatory sentence in `body-sm`, then
  `Download my data` as a [Secondary](#buttons) button. Downloading a backup
  acts on neither the plan nor the catalogue, and it is not the screen's
  primary action.

This is a **fifth destination**, which changes
[#35](https://github.com/lfeq/food-organizer/issues/35)'s arithmetic but not
its rule: the four became four by dropping `Next week`, not by aiming at four,
and the destination sets still match across the breakpoint because `More`
absorbs both admin-only screens.

### The history screen

A [list block](#cards) of past weeks, most recent first, and nothing else.
`1i` draws two row forms at once — the newest week expanded over three of its
days, every older week a single line — and **one form wins**.

The three-day peek did not lose on taste. A weekly plan generated once its week
is already underway holds only the days still ahead, so it may hold **fewer
than seven** plan days
([#72](https://github.com/lfeq/food-organizer/issues/72)). `See all 7 days →`
is then simply false, and `MON / TUE / WED` are exactly the days such a week
does not have. A row form that lies about some of the weeks it draws is not a
row form.

**A row is the week's range and a trailing `→`.** The range is the week's
**full seven days** — `Aug 25 – 31` — never the span of the plan days actually
stored. A weekly plan is identified by the date its week start falls on, so the
label names a week, not a row count, and deriving it from the rows would give
two weeks of identical identity different labels. That a week was partial is
something the household learns by opening it, which is what
[#72](https://github.com/lfeq/food-organizer/issues/72) decided.

The year rides in **every row** rather than in a section heading. A year
`eyebrow` would be a new [list block](#cards) variant, and the catalogue and
accounts would then either want one or conspicuously lack it — one shared
component growing a branch to serve one screen. If the list ever gets long
enough to need grouping, that belongs with the retention question in `SPEC.md`
§15, not here.

**History is a list block, not a stack of cards.** The catalogue and accounts
both landed there, and three long lists on one system should not read as two
kinds of list. The `History card` this document used to carry in the
[Cards](#cards) table retires with the distinction.

A history row is the one place in this design where **the whole row is the
control** — see
[A surface that contains a control](#a-surface-that-contains-a-control-is-not-itself-a-control).
It carries no actions of its own, so it has nothing to put behind a `···` and
no inline group to grow at width: history looks the **same at both widths**,
its rows constrained to the content column. There is no grid of weeks. A grid
of near-identical rows is harder to scan than a column, and dates are already a
vertical sequence.

`1i`'s `21 dishes · 0 repeats` summary is **not shown**. The screen does not
compute it — `listPastWeeks` returns week starts and nothing else — `21` is
wrong for any partial week, and `SPEC.md` §11.6 already ruled the canvas's
other two derived numbers out of scope. History exists to answer "what did we
eat" (§11.4), and the rows answer it.

The empty state is a plain line in `--ink-secondary`, no container.

#### What a past week opens into

The same week screen in `1e`'s no-today state, plainly.

- **No featured day.** `1e` is the no-today state
  ([#32](https://github.com/lfeq/food-organizer/issues/32)). Featuring the
  week's first day for want of a today would give one arbitrary day the
  emphasis this design reserves for the day being lived.
- **No elapsed dimming.** Dimming marks a day that can no longer be changed
  *beside* days that can. On a wholly past week it marks every row, which
  distinguishes nothing and only makes the screen quieter than the live one for
  no reason. Elapsed dimming is a within-the-current-week signal.
- **`READ ONLY` in the header's action slot**, where `Generate week` sits on a
  writable week — an [outlined tag](#badges-and-tags), not a disabled button.
  Every write control is *absent* rather than disabled (`SPEC.md` §11.4), so
  the tag is the only thing on screen saying why. It reads `READ ONLY` /
  `SOLO LECTURA` and not "past week": the title beside it is already a past
  week's date range.
- **The title is the week range**, as `title-page` already specifies. A past
  week has no `This week` / `Next week` name to fall back on.
- **No repeating-week notice** — see [Notice](#notice).
- **No stepper, and no back action.** Past weeks are reached only through
  History ([Navigation across the breakpoint](#navigation-across-the-breakpoint)),
  and the slot beneath the range that carries the stepper on a writable week
  stays **empty**. `History` is one tap away in the tab bar and one click away
  in the sidebar; a vacant slot is not a reason to fill one. The tab bar lights
  `Plan`, by URL, as [the tab bar](#tab-bar-phone) already settles.

## Interactive states

The mockup is eleven static artboards: it draws a focused field, a selected
segmented cell, an active tab and a selected chip, and **no other state at
all**. This section fills that gap for every component above, decided once for
the system rather than seven times for seven buttons.

Two constraints shape all of it. The design has **no elevation**, so the usual
lift-on-hover is unavailable — state has to live in ground, border, or ink.
And the phone is a primary device, so **hover is never the only signal** that
something is a control.

### The rule: the ground holds still; the border and the ink move

Touching a control **promotes its border**. An outlined or ghost control takes
its `--rule-control` edge to `--rule-strong`, and any supporting ink darkens to
`--ink`. Nothing else changes: the ground stays exactly where it was.

This is not a new mechanism. `--rule-strong` already means *emphasis, not
decoration* in this system — it is what marks the today card and what a focused
field becomes. Hover generalises that one rule to every control instead of
introducing a second language beside it.

A **filled** control has no border to promote, so it moves its own fill
instead, using values the palette already names where it has them:

| | Hover | Pressed |
| --- | --- | --- |
| **Accent fill** | `--accent-hover` `#1f4d38` | `--accent-pressed` `#184029` |
| **Inverse fill** | `--inverse-hover` `#2c2a28` | `--inverse-pressed` `#0f0e0e` |
| **Outlined / ghost** | border → `--rule-strong` | border → `--rule-strong`, ground → `--ground-sunken` |

`--ink-on-accent` and `--ink-on-inverse` stay put on both; every pairing above
clears `9.5:1`.

**Pressed is not optional.** On a phone it is the *only* feedback a control
ever gives, so every interactive component defines one — including those whose
hover is the more visible half on the desktop. A control that has a hover and
no pressed state is a bug.

### A surface that contains a control is not itself a control

The **day card takes no state at all**: no hover, no pressed, no focus ring,
and `cursor: default`. What is interactive inside it is the reroll button, and
that button carries the whole affordance. The card is the largest surface on
the week screen, so giving it a hover would make the desktop look as though the
whole week were clickable when only seven small buttons are.

This generalises. Where a row or card merely *holds* controls, the surface is
inert and only the controls inside it take state — the catalogue row, whose
control is the `⋯`, works the same way. Where the whole row **is** the control
— the history row, which opens its week — it takes the row treatment below.

### Per component

| Component | Hover | Pressed | Notes |
| --- | --- | --- | --- |
| **Primary — plan** | `--accent-hover` | `--accent-pressed` | |
| **Primary — catalogue** | `--inverse-hover` | `--inverse-pressed` | Same for the full-width form button. |
| **Secondary** | border → `--rule-strong` | + `--ground-sunken` | |
| **Small outline** | border → `--rule-strong` | + `--ground-sunken` | |
| **Icon** | border → `--rule-strong` | + `--ground-sunken` | |
| **Destructive** | border → `--danger` (from `--danger-rule`) | + `rgba(138,35,35,.08)` | The one control whose border promotes to its *own* colour rather than to ink: a destructive action must not look like an ordinary one at the moment of pressing it. |
| **Text action** | `--accent-hover`, underlined | — | The mockup's own link hover, and the only place an underline appears on hover. |
| **Field** | no hover | — | Focus is its state; the spec's existing rule (border → `--rule-strong`) is unchanged. |
| **List row** *(when the row is the control)* | `inset 2px 0 0 --rule-strong` on the leading edge | + `--ground-sunken` | Drawn as an inset border, not a shadow: it is a rule, and rules are how this design marks emphasis. A ground wash would fight the list block's own surface. |
| **Day card** | none | none | See above — the card is not a control. |
| **List row with inline actions** | none | none | Same reason as the `···` row: it holds controls, so the buttons take the state and the row takes none. |
| **Segmented cell, idle** | border → `--rule-strong`, ink → `--ink` | + `--ground-sunken` | |
| **Segmented cell, selected** | none | none | It already sits at `--rule-strong`; there is nowhere for the border to promote to, and moving its ground would contradict the rule above. The selected cell is a state, not an invitation. |
| **Action-sheet row** | `inset 2px 0 0 --rule-strong` | + `--ground-sunken` | It is a list row that *is* the control, so it takes the list-row treatment. The destructive row promotes to `--danger` instead, like any destructive control. |
| **Chip, idle** | border → `--rule-strong`, ink → `--ink` | + `--ground-sunken` | |
| **Chip, selected** | `--inverse-hover` | `--inverse-pressed` | It is an inverse fill; it behaves like one. |
| **Tab (phone)** | ink → `--ink` | ink → `--ink` | No ground change: the bar is a fixed surface and a washed cell reads as a modal state. The active cell's `2px --accent` top border is unaffected by hover. |
| **Sidebar item** | ink → `--ink-on-inverse` | ink → `--ink-on-inverse` | The item's own `rgba(255,254,251,.12)` ground stays reserved for *active*, so hover and active never look alike. |

### Focus ring

`2px solid --accent`, `outline-offset: 2px`, on **`:focus-visible` only** —
never on `:focus`, so a mouse click never leaves a ring behind.

`--accent` measures `5.82:1` on `--ground-page` and `6.35:1` on
`--ground-surface`, both clear of the `3:1` floor for a non-text indicator.
Using the accent rather than ink also keeps focus **distinct from hover**,
which in this system is an ink border: the two states never render as the same
mark on the same control.

**One exception, forced by contrast.** On `--ground-inverse` the accent ring
measures `2.77:1` and misses the floor, so every control on the dark sidebar
takes an `--ink-on-inverse` ring instead (`17.58:1`).

The ring is drawn with `outline`, not `box-shadow` — [Elevation](#elevation)
holds even here, and an outline follows the border radius without a second
element.

### Disabled

Filled buttons drop to **`opacity: .55`**. Outlined and ghost controls keep
full opacity and instead take `--ink-muted` ink over a `--rule-inset` border,
so their edge thins rather than going mushy.

Two treatments rather than one because the levers differ: fading an outlined
control attacks a `1px` hairline that is close to invisible already, while
fading a fill leaves a shape that is still clearly a button. At `.55` the
accent fill measures `2.37:1` and the inverse fill `3.85:1` against the page —
below the text floor, which is [permitted for disabled
controls](#contrast-audit) and is the point: a disabled control should read as
unavailable at a glance.

A disabled control takes **no** hover, pressed, or focus-visible state, and
`cursor: not-allowed`. It must carry the real `disabled` attribute (or
`aria-disabled` where focusability is wanted), never colour alone.

Where this actually appears: **Generate week** with an empty catalogue, and
**Save dish** with an empty name.

### Transition

`120ms` on `background-color`, `border-color`, `color` and `box-shadow` only.
**Nothing moves** — no transform, no translate, no scale — which follows from
having no elevation: there is no third dimension in this design to move
through. Pressed states apply instantly enough at `120ms` to feel attached to
the finger.

This is unrelated to the draw animation discussed under [Motion](#motion),
which is a behaviour decision rather than a visual-system one.

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
| 22 | Selected course segment | Green border and accent-soft fill in `1g`, on a screen whose every other control is dark | **Dark** (`--rule-strong` on `--ground-inverse-soft`) | Rule 4 again. Choosing a course acts on the catalogue, and the two green exemptions on the books — the tab bar's active cell and the week stepper — are both navigation, which acts on nothing. A course segment is not navigation. |
| 23 | Catalogue filter chips | `1f` draws three chips, one always selected, so three of twenty-one dishes are on screen and the whole catalogue can never be seen | **Four chips, `All` first and selected by default** | A filter with no way back is a filter that hides the catalogue. The fourth chip is what keeps the screen's own subject reachable. |
| 24 | `1k`'s green `Reset password` | Green, on a screen whose `Add member` button is dark | **Dark** | Rule 4 for the second time, and the same shape as rule 22. Resetting a password acts on an account, not on the plan, and it is not navigation — the only thing the two standing green exemptions have in common. |
| 25 | `1k`'s member subtitle | `member · last seen today` | **Role badge and status tag** | Not a design disagreement: there is no last-seen data. `Member` is `{id, username, role, must_change_password}` and the `member` table carries `created_at` and nothing else, so the line cannot be built. The `meta` type role's `"last seen 3 d ago"` example is drawn from this artboard and is likewise hypothetical. |
| 26 | `1i`'s green `See all 7 days →` | A green text action inside a card that is itself a link | **No such control** | Rule 4 for the third time. It is also two controls in one row: the history row *is* the control, so a second action inside it competes with the row for the tap. The peek it opened is gone regardless — see [the history screen](#the-history-screen). |
| 27 | `1i`'s two row forms | The newest week expanded over three days; every older week one line | **One form, the one line** | Two forms need "newest" to mean something that survives the week rolling over, and it buys nothing: the newest past week is the one the household just stopped looking at on the plan screen. The expanded form also cannot be drawn for a week holding fewer than seven days. |
| 28 | `1i`'s `21 dishes · 0 repeats` | A per-week summary line | **Not shown** | Not a design disagreement: `listPastWeeks` returns week starts only, and `21` assumes seven days a partial week does not have. `SPEC.md` §11.6 already ruled the canvas's `14 weeks stored` and `used 3× in the last 8 weeks` out of scope; this is the same class. |

## Contrast audit

Measured against WCAG 2.1 AA. **The floor this system holds itself to:**
`4.5:1` for every text pairing, and `3:1` for any glyph that is the only
indication of a control. The large-text exemption (`3:1` at 18.66px bold or
24px regular) is **not claimed anywhere**: the mono labels this palette was
thinnest on run at 9–11px, so no realistic size or weight change could reach
that threshold. Contrast here is a colour question and was settled as one.

| Foreground | Ground | Ratio | Verdict |
| --- | --- | --- | --- |
| `--ink` `#191817` | `--ground-page` `#f6f4ef` | 15.8:1 | Pass |
| `--ink-secondary` `#6d6862` | `--ground-page` | 5.0:1 | Pass |
| `--ink-secondary` `#6d6862` | `--ground-surface` `#fffefb` | 5.5:1 | Pass |
| `--ink-muted` `#6d6862` | `--ground-page` | 5.0:1 | Pass |
| `--ink-muted` `#6d6862` | `--ground-surface` | 5.5:1 | Pass |
| `--ink-faint` `rgba(25,24,23,.3)` | `--ground-surface` | 1.9:1 | **Decorative only** — see below |
| `--accent` `#2d6a4d` | `--ground-surface` | 6.3:1 | Pass |
| `--ink-on-accent` `#fffefb` | `--accent` `#2d6a4d` | 6.4:1 | Pass |
| `--ink-on-inverse` `#fffefb` | `--ground-inverse` `#191817` | 17.6:1 | Pass |
| `--ink-on-inverse-muted` `rgba(255,254,251,.62)` | `--ground-inverse` | 7.4:1 | Pass |
| `--ink-on-inverse-faint` `rgba(255,254,251,.55)` | `--ground-inverse` | 6.0:1 | Pass |
| `--notice-ink` `#6b4c1c` | `--notice-ground` `#faf3e2` | 7.1:1 | Pass |
| `--notice-ink-secondary` `#7a5a26` | `--notice-ground` | 5.7:1 | Pass |
| `--notice-ink-action` `#8a6023` | `--notice-ground` | 5.0:1 | Pass |

### What was decided, and why

An earlier draft of this table reported three failing text pairings. Each was
resolved by moving a value, not by claiming an exemption.

**`--ink-muted` was `#8b857d`** — 3.3:1 on the page ground, 3.6:1 on a
surface — and it carries every mono label, date, count and eyebrow, a large
share of the text on every screen. It is now `#6d6862`, the same value as
`--ink-secondary`.

That collapse is the interesting part. The warm-grey ramp between "clears
`4.5:1` on the page ground" (`#756f67`) and `--ink-secondary` (`#6d6862`) is
**eight levels wide**, and at 9–11px those two greys are indistinguishable. So
the muted-versus-secondary *colour* step cannot survive an AA floor: there is
no room left below secondary in which to be muted. Rather than keep a
nominally lighter grey that nobody can see, the two tokens now share a value
and keep their separate names, exactly as `--ink` and `--ground-inverse` do
(contradiction 21). The design loses nothing it was using: at `600 9px`
uppercase with `.14em` tracking, an eyebrow is unmistakably a label. The
muted-paper feel lives in the grounds and the hairline rules, not in one grey
being eight levels lighter than another.

**`--ink-on-inverse-faint` was `rgba(255,254,251,.4)`** — 3.8:1, on the desktop
sidebar's footer and instance name at 11px. It is now `.55`, which clears
`4.5:1` while staying a perceptible step below the idle nav items at `.62`.
Unlike the grey above, this range had room to keep the step.

**`--ink-faint` stays at `rgba(25,24,23,.3)` and stops being a control
colour.** Its brief once read "the `⋯` overflow dot, the `→` chevron, an
inactive `↻`", and at 1.9:1 that was the sharpest failure in the system. Two
of those three uses turned out not to exist: the `↻` is text inside a labelled
button, and the week stepper's `→` is text inside `Next week →`. What remained
was one genuine control — the unlabelled `⋯` on a catalogue row, which now
takes `--ink-secondary` — and one genuine decoration: the `→` on a history
row, beside a high-contrast date, on a card that is itself the control. WCAG
1.4.11 asks for `3:1` on graphics *required to understand the content*; that
arrow is required for nothing. It is the only mark in the system below the
floor, and it is below it on purpose. The [standing rule](#ink) above keeps it
that way.

## Open questions this spec deliberately leaves

Both questions this section used to hold have since been answered, and the
entries were left standing — the same drift
[#72](https://github.com/lfeq/food-organizer/issues/72) found between `SPEC.md`
and the glossary. Corrected here:

- ~~**Which week-screen variant is the direction.**~~ Settled in
  [#32](https://github.com/lfeq/food-organizer/issues/32): `1b`, with `1d` its
  desktop counterpart and `1e` its no-today state — one responsive component,
  not three designs.
- ~~**Two screens have no artboard:** first-run setup, and forced password
  change.~~ Settled in
  [#37](https://github.com/lfeq/food-organizer/issues/37): setup is stepped,
  two steps with a `STEP 1 OF 2` counter; forced password change reuses the
  `1j` frame and demotes `Sign out` to a text action.

What genuinely remains open sits on the map, not here: what a transient message
becomes ([#87](https://github.com/lfeq/food-organizer/issues/87)), and what
the week screen shows with an empty catalogue
([#88](https://github.com/lfeq/food-organizer/issues/88)).

**One thing this document can no longer verify.** Its stated source of truth,
`docs/planificador-semanal-de-comidas/project/Meal Planner Mockups.dc.html`, is
**not in this repository** — not on `main`, not on any branch, and in no
commit. It was read when this spec was written and every value here was taken
from it, but no later reader can check a claim about an artboard against the
artboard. Where a per-screen decision has since turned on what `1k` or `1f`
draws, the record of what it drew is the ticket that decided it, not the file.
Found while resolving [#85](https://github.com/lfeq/food-organizer/issues/85).
