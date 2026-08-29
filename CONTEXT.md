# Context

Domain glossary for the weekly meal planner. UI copy is bilingual (Spanish and
English); code, issues and documentation are English-only. Where a term differs
between the two, the Spanish UI wording is given for reference.

## Dish

_(Spanish UI: "platillo")_

An entry in the household's shared catalogue: something the family knows how to
cook. A dish has a name, a [course](#course), and an author — the
[member](#member) who added it.

A dish is a catalogue entry, never an act of eating. The word "comida" is
deliberately avoided in code because in Spanish it means both the midday meal
and an item on the list.

## Course

_(Spanish UI: "tiempo")_

Which part of the midday meal a [dish](#dish) belongs to. Exactly three, fixed
and not user-editable:

- `soup` — Spanish UI: "sopa"
- `side` — Spanish UI: "guarnición"
- `main` — Spanish UI: "plato fuerte"

Every dish has exactly one course. The catalogue is therefore three disjoint
lists, and a [plan day](#plan-day) draws one dish from each.

## Member

_(Spanish UI: "integrante")_

A person in the household. A member is always an account: there is no notion of
a household member who cannot log in. Two roles:

- `admin` — whoever deployed the instance. Creates member accounts, resets
  passwords, removes members.
- `member` — everyone else. Equal to each other: adds dishes, generates and
  regenerates plans.

Both roles have identical rights over the catalogue and over plans. The admin
role covers account management only.

## Household

The family using one deployed instance. **Not an entity in the data model**: an
instance _is_ a household, so there is nothing to scope data by. The term exists
so conversations about "the family's dishes" have a name for the boundary.

## Weekly plan

_(Spanish UI: "plan semanal")_

What the household intends to eat at midday for one calendar week. Exactly one
weekly plan exists per calendar week, identified by that week; past weeks are
kept as history.

A weekly plan is a record of what was decided, not a live view of the
catalogue: once generated it holds its own copy of what came out, so deleting a
[dish](#dish) later never alters a plan that already used it.

Only the current and the next calendar week can be changed. Earlier weeks are
history: a record of what the household ate, which nothing can rewrite.

## Plan day

_(Spanish UI: "día del plan")_

One of the seven days (Monday through Sunday) of a [weekly plan](#weekly-plan).
Holds three [slots](#slot), one per [course](#course).

## Slot

_(Spanish UI: "casilla")_

One (course, day) position within a [weekly plan](#weekly-plan) — for example,
Wednesday's soup. Holds the [dish](#dish) that was drawn for it.

## Generating

Filling a [weekly plan](#weekly-plan)'s [slots](#slot) by drawing at random
from the catalogue. Each [course](#course) is drawn independently and without
replacement, so **generating never repeats a dish within the week**, as long as
that course holds at least seven dishes — one per day. Below seven there are
not enough dishes to go round, so dishes repeat as needed.

Generating has no memory: what came out last week does not influence this week.

A course with **no** dishes at all is different from a short one: there is
nothing to draw, so generating does not happen and says which course is empty.
A slot therefore always holds a dish — an empty slot is not a state a weekly
plan can be in.

Generating a week that already has a plan replaces it, and the household is
told so before it happens. The replacement is the same plan for the same week,
not a second one: the one-plan-per-week rule holds.

## Regenerating

Redrawing a single [plan day](#plan-day) — "I don't feel like Wednesday, give
me another". Distinct from generating, which produces the whole week.

Regenerating prefers the dishes the week is **not already using**, and never
returns the dish it is replacing, so the day always visibly changes. Each
regeneration looks at the week as it currently stands, so it cannot drift into
repeats while alternatives remain. When no unused dish is left, it draws from
the whole course anyway rather than refusing: **regenerating may repeat**, and
the plan says so when it does.

Regenerating changes the day it was asked about and nothing else. It never
moves a dish between days to make room.

## Repeating week

A [weekly plan](#weekly-plan) that holds the same [dish](#dish) in two
[slots](#slot) of the same [course](#course). This is a property of the plan,
not of the catalogue: it is answered by looking at the week itself, so it holds
whatever caused the repeat — a course below seven dishes,
[generating](#generating) or [regenerating](#regenerating) alike.

A repeating week is always said out loud, once per repeating course, and the
household is pointed at the fix: add more dishes. It is stated about the course,
never about the offending slot — a repeat is an expected consequence of a small
catalogue, not a mistake in a particular day.

Because it is a property of the plan, a week can *become* repeating after it was
generated, which is what regenerating into a repeat does.

## Seed catalogue

_(Spanish UI: "catálogo inicial")_

The [dishes](#dish) a freshly deployed instance starts with, so that the
[household](#household) can generate a first [weekly plan](#weekly-plan) before
adding anything of its own: **nine per [course](#course)**, twenty-seven in all.

Seven would be enough for [generating](#generating) alone — it is exactly the
number of days in a week — but it leaves [regenerating](#regenerating) nothing
to draw, so every reroll would produce a [repeating week](#repeating-week) on a
brand-new instance. Nine is the smallest catalogue where both operations behave
the way the household expects on day one.

Seeding happens once, at setup. Afterwards a seeded dish is an ordinary
catalogue entry in every respect — editable, deletable, and not marked as
seeded. Their author is the `admin`, the only [member](#member) that exists at
setup.

Seed dish names are Spanish only. A dish name is a name the household would say
out loud, not UI wording, and it is not translated: the bilingual UI covers the
app's own chrome, never the catalogue's contents.
