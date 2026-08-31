# CSS structure

How the [visual system](./visual-system.md) lands in the codebase: the token
layer, what becomes a React component, where a stylesheet lives, and where a
breakpoint may be written.

**Status:** decided. Resolves
[#64](https://github.com/lfeq/food-organizer/issues/64) on the redesign map
[#31](https://github.com/lfeq/food-organizer/issues/31).

**This is a structure decision, not the migration.** Nothing here says when
`src/styles.css` is replaced or in what order the seven screens move. It says
what they move *into*.

**What it is answering.** Today all styling is one 899-line `src/styles.css` of
literal hex values with zero media queries, loaded once as a static asset
(`import appCss from "../styles.css?url"` in `src/routes/__root.tsx`). There is
no `src/components/` directory: every screen is one route file of inline JSX,
and the sidebar block is copy-pasted into four of them. The visual system spec
names roughly forty tokens and a dozen components, so the shape of the CSS is
now decidable.

## Tokens

**Every token the visual system names becomes a CSS custom property on
`:root`, under the spec's name, spelled exactly as the spec spells it.**

The spec's value is that its names carry rules — *green acts on the plan, dark
acts on the catalogue*; *`--ink-muted` is mono only*; *there is no elevation*.
As custom properties those rules are greppable and reviewable. As literal hex
values they are twenty-one settled contradictions waiting to be re-decided by
whoever writes the next screen.

Three constraints, all of which exist to keep the vocabulary single:

- **No aliasing layer.** Never `--button-ground: var(--accent)`. The spec's
  names are already roles; a second naming layer splits the vocabulary in two
  and makes "what colour is this?" a two-hop question.
- **No component-local redefinition.** A token is not re-bound inside a
  component or a media query. `--accent` means one thing everywhere.
- **`tokens.css` is the only file allowed to contain a literal colour, radius,
  spacing value, or font weight.** Everything else uses `var()`. Weight is on
  that list for the same reason as colour: the spec closes each family's weight
  set deliberately (*[Weight](./visual-system.md#weight)*), and a variable Sans
  makes `font-weight: 550` cost nothing to write and everything to unpick. The
  four weight tokens are named by **job**, matching how colour is named by
  role: `--weight-body`, `--weight-row`, `--weight-emphasis`, `--weight-title`
  for `400 / 500 / 600 / 700`. Naming them by number would make the token a
  synonym for its value and leave nothing to grep for when the ladder moves.

The one value that cannot be a token is the breakpoint: CSS custom properties
are not usable in a media query condition. See [Media queries](#media-queries).

## Components

There is no `src/components/` directory today. There is one now, and a rule for
what earns a place in it.

**A React component when the markup is repeated across route files, or carries
state or behaviour, or has two forms across the breakpoint. A class alone when
it is one shape used inside a single route.**

By that rule the navigation is unambiguously a component — it is all three at
once: duplicated across four route files today, stateful in its `More` sheet,
and drawn as a tab bar below the breakpoint and a sidebar above it. A badge is
unambiguously not: wrapping `<span class="badge">TODAY</span>` in a component
buys nothing and costs a file.

Wrapping every named component in the spec would produce roughly a dozen
near-empty files; wrapping none of them means writing the new navigation four
times and letting the four copies drift, which is the state the redesign
inherits.

### Variants are typed props

Where the spec lists variants and the thing is a React component, **variance
travels as a typed union prop, not as a class the caller assembles.**

```tsx
<Button variant="primary-plan">…</Button>   // not className="btn btn--primary-plan"
```

The system's most misimplementable rule is the green/dark split: green acts on
the weekly plan, dark acts on the catalogue, accounts, or session. A union type
makes a wrong variant a `tsc` error; a free-form `className` makes it a code
review. This is the same reasoning as
[ADR-0001](../adr/0001-hand-rolled-bilingual-ui.md), which chose a hand-rolled
`as const` record over an i18n library so that a missing key fails the
typecheck.

Semantic props that name the rule instead of the look (`acts="plan"`) were
considered and declined: `Secondary`, `Icon` and `Text action` are not about
what the action touches, so half the variants would not fit the vocabulary.

## Files

One global namespace of plain CSS classes, split across files and reassembled
by an `@import` manifest.

```
src/styles/
  index.css          ← the manifest: @import lines and nothing else
  tokens.css         ← :root. The only file with a literal colour/radius/space/weight
  base.css           ← reset, body, font faces, the type classes
  components/*.css   ← one file per component the spec names
  screens/*.css      ← one file per route, layout only
```

`src/routes/__root.tsx` loads `index.css` exactly as it loads `styles.css`
today. Vite inlines `@import` into a single built stylesheet — verified against
this project's own build: a probe rule in an imported file landed inside the
one emitted `assets/styles-*.css` with no second CSS asset and no extra
request. **Splitting costs nothing at runtime.**

Two rules make "which file does this go in?" mechanical rather than a
judgement call:

1. **`tokens.css` is the only file with literal values** — colour, radius,
   space, or font weight (restated from [Tokens](#tokens), because this is
   where it is enforced).
2. **If the spec names it, it is a component file. A screen file may position
   components; it may never repaint them.** `screens/plan.css` decides where
   the short-catalogue notice sits. It does not decide what the notice looks
   like.

Rule 2 is the whole point of the split. Seven screens each free to restyle a
card is how `styles.css` reached 899 lines, and it is the failure the redesign
is most exposed to, because the map expects screens to be built in parallel
sessions.

### Naming

The existing convention survives: **`block-element--modifier`**, single hyphens
between words, `--` before a modifier (`sidebar-nav-item--active`). Strict BEM
`__` separators would churn 97 class names to gain a separator.

One rule ties naming to the file layout: **a class's block segment must equal
its file name.** `.day-card`, `.day-card-gutter` and `.day-card--today` all
live in `components/day-card.css`, and nothing else does. This is what makes
rule 2 above checkable by reading a filename instead of exercising judgement.

Modifier classes are also what the typed `variant` prop renders down to:
`variant="primary-plan"` emits `class="btn btn--primary-plan"`, one variant to
one modifier.

## Media queries

There is one breakpoint, at `900px`, fixed by
[#35](https://github.com/lfeq/food-organizer/issues/35) and doing two jobs at
once: the navigation changes form, and a week-plan day row expands from the
compact `main + soup · side` subtitle into labelled `SOUP / SIDE / MAIN` rows.

**Mobile-first. `min-width` only. Never `max-width`.**

The phone is a first-class device for this redesign, and the current CSS is
being replaced wholesale, so there is no desktop base worth preserving.
Mobile-first also keeps the direction honest: the sidebar is *added* at width,
rather than the tab bar being *undone*.

**The literal `@media (min-width: 900px)` is the only media query permitted in
the codebase.** Not a preprocessor variable, not a Lightning CSS
`@custom-media` alias. The value is repeated, deliberately: one grep lists every
media query in the repository, and any line that is not `min-width: 900px` is
visibly a bug rather than a plausible local decision. That is the enforcement
this rule is for — stopping seven screens from each inventing their own
threshold. `@custom-media` is reachable (Lightning CSS already ships inside
Vite 8; it needs a `css.transformer` flag and a drafts option) and is a two-line
change away if a second breakpoint ever earns its place.

## Auditing it

The structure is designed so that compliance is greppable rather than
reviewable. Four checks cover it:

| Check | What a hit means |
| --- | --- |
| A literal `#` colour outside `src/styles/tokens.css` | A token was bypassed. |
| A `font-weight:` whose value is not a `var()` outside `tokens.css` | The closed weight set was bypassed — most likely a value invented off the free variable axis. |
| A `@media` line that is not `min-width: 900px` | A screen invented a breakpoint. |
| A `--` custom property declared outside `tokens.css` | A token was redefined locally, or an alias crept in. |
| A class whose block segment does not match its file name | A component's styles are leaking into a screen file. |

## Why not the alternatives

- **CSS Modules, co-located with components.** The component rule above means
  some shapes never get a component file — a badge, a chip — so they would have
  no module to live in. The result is a system split between component-owned
  styles and orphan styles: the same two-namespace split rejected for tokens.
  The visual system is also written globally, one table per component, and a
  global namespace mirrors it one-to-one. The honest cost of going global: no
  dead-code detection and nothing *forcing* a class to live near its component.
  At this size that is a naming problem, and naming is decided above.
- **One `styles.css`, sectioned by comments.** One file is one merge-conflict
  surface for every parallel build session, and offers no mechanical answer to
  where a style belongs.
- **`@custom-media` for the breakpoint.** Deduplicates a single value at the
  price of a draft-spec feature and a CSS-transformer swap in the build.
