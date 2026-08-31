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

Two dishes in the same course cannot share a name; the same name in two
different courses is allowed, since a dish can be both a side and a main. A
dish outlives its author: if that [member](#member) is removed, the dish stays
in the catalogue with no author rather than being reassigned to someone who did
not write it.

## Course

_(Spanish UI: "tiempo")_

Which part of the midday meal a [dish](#dish) belongs to. Exactly three, fixed
and not user-editable:

- `soup` — Spanish UI: "Sopa"
- `side` — Spanish UI: "Guarnición"
- `main` — Spanish UI: "Fuerte", short for the full term "plato fuerte"

Every dish has exactly one course. The catalogue is therefore three disjoint
lists, and a [plan day](#plan-day) draws one dish from each.

Only `main` has a short form: the household says "el fuerte" as readily as
"el plato fuerte", so the label the UI shows is the short one. `soup` and
`side` are already single words and are never abbreviated — a course label is
written out in full in both languages, and the layout is sized to the word
rather than the word cut to the layout.

## Member

_(Spanish UI: "integrante")_

A person in the household. A member is always an account: there is no notion of
a household member who cannot log in. Two roles:

- `admin` — creates member accounts, resets passwords, removes members, and
  grants or removes the admin role, including their own. The first admin is
  whoever deployed the instance, but the role is not theirs alone: **an instance
  may have any number of admins, and never fewer than one.**
- `member` — everyone else. Equal to each other: adds dishes, generates and
  regenerates plans.

Both roles have identical rights over the catalogue and over plans. The admin
role covers account management only.

Removing a member does not remove what they contributed: their [dishes](#dish)
stay in the catalogue and the weeks they generated stay in history.

## Household

The family using one deployed instance. **Not an entity in the data model**: an
instance _is_ a household, so there is nothing to scope data by. The term exists
so conversations about "the family's dishes" have a name for the boundary.

## Weekly plan

_(Spanish UI: "plan semanal")_

What the household intends to eat at midday for one week. Exactly one weekly
plan exists per week, identified by the date its [week start](#week-start) falls
on; past weeks are kept as history.

A week with no weekly plan is simply a week nobody has generated: there is no
such thing as an empty or half-filled plan. A weekly plan comes into existence
complete — every [plan day](#plan-day) it holds carries all three
[slots](#slot) — or not at all.

A plan generated before its week begins holds all seven days. One generated
once the week is already underway holds only the days still ahead: a plan day
for a date nobody planned does not exist, so a weekly plan may hold fewer than
seven days. What it can never hold is a day with nothing in it.

A weekly plan is a record of what was decided, not a live view of the
catalogue: once generated it holds its own copy of what came out, so deleting a
[dish](#dish) later never alters a plan that already used it.

Only the current and the next week can be changed. Earlier weeks are history: a
record of what the household ate, which nothing can rewrite.

## Week start

Which weekday a week begins on for this instance — **Sunday by default**, and
chosen once, by the admin, before the first [weekly plan](#weekly-plan) exists.
After that it is fixed, because changing it would leave every stored week
misaligned with the definition it was created under.

A week start is a property of the instance, not of a person and not of a
locale: the household plans one shared week, so everyone sees the
same seven days in the same order.

## Plan day

_(Spanish UI: "día del plan")_

One day of a [weekly plan](#weekly-plan), falling on the instance's
[week start](#week-start) or within the six days that follow it. Holds three
[slots](#slot), one per [course](#course).

A plan day whose date has passed is **elapsed**, and an elapsed plan day is
immutable: it can no longer be [regenerated](#regenerating). A weekly plan is a
record of what was decided, so redrawing a day the household has already eaten
would rewrite the past rather than change a plan. Elapsed days stay part of the
week and stay readable; they simply stop being decisions still open.

Immutability is a property of the plan day, not of the screen it is drawn on: a
request to redraw an elapsed day is refused however it arrives, and hiding the
control is a courtesy on top of that refusal rather than the rule itself.

## Slot

_(Spanish UI: "casilla")_

One (course, day) position within a [weekly plan](#weekly-plan) — for example,
Wednesday's soup. Holds the **name** of the [dish](#dish) that was drawn for it,
copied at the moment it was drawn, not a live reference to the catalogue entry.
So renaming a dish does not rewrite the weeks it already appeared in, and
deleting one does not empty them.

Two slots hold the same dish when they hold the same name. Identity here is the
name the household read on the plan, not the catalogue row it came from.

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

What it replaces is only the days still ahead. An elapsed [plan day](#plan-day)
is immutable, so generating leaves it exactly as it stands and redraws the rest
of the week around it. The dishes those days hold still count as used: the
no-repeat promise is made about the whole week the household is looking at, not
only the part that was redrawn. That leaves fewer unused dishes to draw from as
the week wears on, so a course comfortably above seven on the week start can
still produce a [repeating week](#repeating-week) later on.

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

Only a day still ahead can be regenerated: an elapsed [plan day](#plan-day) is
immutable.

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

## Locale

_(Spanish UI: "idioma")_

Which language the interface is rendered in for one viewer: Spanish (`es-MX`)
or English (`en-US`). A locale is a property of a viewing session, not of a
[member](#member) and not of anything the household owns.

Locale applies to **UI copy only** — the words the app itself supplies. It never
applies to household data: a [dish](#dish) name is typed by a member and is
shown exactly as typed in either locale, and a [weekly plan](#weekly-plan) holds
no localised text. Nothing stored is ever localised.

The distinction the term exists to make is **UI copy versus household data**. If
a string was written by whoever built the app, it has a locale; if it was typed
by a member, it does not.
