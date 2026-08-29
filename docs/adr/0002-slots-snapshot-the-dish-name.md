# Slots snapshot the dish name

A `slot` stores `dish_name` as a copied, `NOT NULL` value, with `dish_id` kept
only as a nullable, `ON DELETE SET NULL` back-reference that nothing depends on.
A reader will expect the opposite — a foreign key to `dish`, with deletion
handled by a `deleted_at` tombstone — so this records why not.

The requirement is that a weekly plan is history: deleting a dish must never
alter a week that already used it. A soft-deleted `dish` row satisfies deletion
but not **renaming**: correcting a typo in a dish would silently rewrite what a
plan from three months ago says the household ate. A copy is the only shape
where a stored week means the same thing forever.

It also decides identity. "Does this week repeat a dish in a course?" — the
banner predicate from #10 — compares `dish_name`, not `dish_id`. Comparing ids
would break exactly when a dish is deleted: both slots would hold `NULL`, and
`NULL = NULL` is not true in SQL, so a repeating week would silently stop
reporting itself with nothing about the plan having changed.

## Consequences

- Renaming a dish changes the catalogue and every **future** plan, and no past
  one. That asymmetry is deliberate and needs to be said out loud in the UI.
- `dish.name` is `UNIQUE (course, name)` partly to keep this honest: if two
  catalogue rows could share a name, name-based comparison would conflate them.
- Every catalogue and generator query stays free of `WHERE deleted_at IS NULL`,
  the clause that is forgotten exactly once and then wrong forever.
