import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { Button } from "#/components/button"
import { EmptyLine } from "#/components/empty-line"
import { Field } from "#/components/field"
import { InlineError } from "#/components/inline-error"
import { Navigation } from "#/components/navigation"
import { Sheet, SheetAction, SheetActions } from "#/components/sheet"
import { LocaleContext, t, interpolate, type Locale, type StringKey } from "#/i18n"
import { COURSE_ORDER, COURSE_LABEL_KEY, COURSE_PLURAL_KEY } from "#/courses"
import { listDishes, addDish, editDish, deleteDish, type Dish } from "#/dishes-fns"
import type { Course } from "#/plan-fns"
import type { ErrResult, ResultCode } from "#/result-codes"

export const Route = createFileRoute("/dishes")({
  component: DishesPage,
  loader: () => listDishes(),
})

/** `All` first and selected by default; the three courses narrow it. */
type Filter = "all" | Course

/**
 * Every sheet this screen can open, and nothing else. The list stays mounted
 * behind all of them — a sheet dims the screen, it does not replace it.
 *
 * `actions` is what a row's `···` opens; `add` and `edit` are the form;
 * `delete` is reachable from both the action sheet and the edit form, which is
 * the "twice over" the visual system describes.
 */
type SheetState =
  | { kind: "none" }
  | { kind: "actions"; dish: Dish }
  | { kind: "add" }
  | { kind: "edit"; dish: Dish }
  | { kind: "delete"; dish: Dish }

/**
 * Every refusal this screen can be handed, said in the household's own
 * language. The same shape every route uses: a `Partial<Record<…>>` map read
 * by code, with `errGeneric` for a code that has no sentence of its own.
 */
const DISH_ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  DISH_NAME_TAKEN: "dishErrNameTaken",
}

/** A chip's label: the count is part of it, never a separate element. */
function chipLabel(locale: Locale, label: string, count: number): string {
  return interpolate(t(locale, "dishesChipLabel"), { label, count: String(count) })
}

function DishesPage() {
  const { authState } = Route.useRouteContext()
  const dishes = Route.useLoaderData()
  const member = authState.member!
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const [filter, setFilter] = useState<Filter>("all")
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = filter === "all" ? dishes : dishes.filter((d) => d.course === filter)

  function open(next: SheetState) {
    setSheet(next)
    setError(null)
  }

  function close() {
    setSheet({ kind: "none" })
    setError(null)
  }

  async function run(action: () => Promise<{ ok: true } | ErrResult>) {
    setBusy(true)
    setError(null)
    const res = await action()
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, DISH_ERROR_KEY[res.code] ?? "errGeneric"))
      return
    }
    close()
    await router.invalidate()
  }

  const handleAdd = (name: string, course: Course) =>
    run(() => addDish({ data: { name, course, authorId: member.id } }))

  const handleEdit = (id: string, name: string) =>
    run(() => editDish({ data: { id, name } }))

  const handleDelete = (id: string) => run(() => deleteDish({ data: { id } }))

  return (
    <div className="screen-shell">
      <Navigation />

      <main className="screen-shell-main">
        <div className="dishes-header">
          <h1 className="dishes-title type-title-page">{t(locale, "dishesH1")}</h1>
          {/*
            One course-neutral action, dark rather than green: adding a dish
            acts on the catalogue, not on the weekly plan. The per-course add
            buttons died with the three columns; the course is chosen in the
            form's segmented control instead.
          */}
          <Button
            variant="primary-catalogue"
            shape="pill"
            onClick={() => open({ kind: "add" })}
          >
            {t(locale, "dishesAddBtn")}
          </Button>
        </div>

        <div className="dishes-chips chip-row" role="group" aria-label={t(locale, "dishesH1")}>
          <button
            type="button"
            className={`chip type-chip${filter === "all" ? " chip--selected" : ""}`}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {chipLabel(locale, t(locale, "dishesChipAll"), dishes.length)}
          </button>
          {COURSE_ORDER.map((course) => (
            <button
              key={course}
              type="button"
              className={`chip type-chip${filter === course ? " chip--selected" : ""}`}
              aria-pressed={filter === course}
              onClick={() => setFilter(course)}
            >
              {chipLabel(
                locale,
                t(locale, COURSE_PLURAL_KEY[course]),
                dishes.filter((d) => d.course === course).length,
              )}
            </button>
          ))}
        </div>

        {/*
          With no rows the list block is not drawn at all: its top rule and its
          full bleed go with its rows, so an empty list has no visible edge.
          Which line shows depends on the chip — `All` blames the catalogue, a
          course chip names that course, because `All` would still show rows.
        */}
        {rows.length === 0 ? (
          <EmptyLine>
            {filter === "all"
              ? t(locale, "dishesEmptyAll")
              : interpolate(t(locale, "dishesEmptyCourse"), {
                  course: t(locale, COURSE_PLURAL_KEY[filter]),
                })}
          </EmptyLine>
        ) : (
          <div className="screen-shell-list">
            <ul className="list-block">
              {rows.map((dish) => (
                <li key={dish.id} className="list-block-row">
                  <div className="list-block-row-main">
                    <span className="list-block-row-name type-item-name">{dish.name}</span>
                    <span className="list-block-row-meta type-meta">
                      {interpolate(t(locale, "dishAddedBy"), {
                        name: dish.author_username ?? t(locale, "dishRemovedMember"),
                      })}
                    </span>
                  </div>
                  {/*
                    One action, behind a `···`, at both widths. The row itself
                    is not a control and takes no state; this glyph carries the
                    whole affordance, and being unlabelled it needs a name that
                    says which row it belongs to.
                  */}
                  <button
                    type="button"
                    className="list-block-action type-body"
                    aria-label={interpolate(t(locale, "dishRowActions"), { name: dish.name })}
                    onClick={() => open({ kind: "actions", dish })}
                  >
                    ···
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {sheet.kind === "actions" && (
        <Sheet title={sheet.dish.name} dismiss="cancel" onDismiss={close}>
          <SheetActions>
            <SheetAction onClick={() => open({ kind: "edit", dish: sheet.dish })}>
              {t(locale, "editBtn")}
            </SheetAction>
            <SheetAction
              tone="destructive"
              onClick={() => open({ kind: "delete", dish: sheet.dish })}
            >
              {t(locale, "deleteBtn")}
            </SheetAction>
          </SheetActions>
        </Sheet>
      )}

      {sheet.kind === "add" && (
        <Sheet title={t(locale, "dishAddTitle")} dismiss="cancel" onDismiss={close}>
          <AddForm busy={busy} error={error} onSubmit={handleAdd} />
        </Sheet>
      )}

      {sheet.kind === "edit" && (
        <Sheet title={t(locale, "dishEditTitle")} dismiss="cancel" onDismiss={close}>
          <EditForm
            dish={sheet.dish}
            busy={busy}
            error={error}
            onSubmit={(name) => void handleEdit(sheet.dish.id, name)}
            onDelete={() => open({ kind: "delete", dish: sheet.dish })}
          />
        </Sheet>
      )}

      {sheet.kind === "delete" && (
        <Sheet
          title={interpolate(t(locale, "dishDeleteTitle"), { name: sheet.dish.name })}
          dismiss="cancel"
          onDismiss={close}
        >
          {/*
            Deletion is unguarded — the catalogue has no minimum — so this
            sheet does not refuse. What it must do is say plainly that past
            weeks keep the dish (ADR-0002).
          */}
          <p className="sunken-note type-body-sm">{t(locale, "dishDeleteNotice")}</p>
          {error && <InlineError>{error}</InlineError>}
          <Button
            variant="destructive"
            fullWidth
            disabled={busy}
            onClick={() => void handleDelete(sheet.dish.id)}
          >
            {t(locale, "deleteBtn")}
          </Button>
        </Sheet>
      )}
    </div>
  )
}

/**
 * Adding a dish: a name and a course.
 *
 * The segmented control here is the only place in the app a course is set, and
 * its selected segment is **dark, not green** — choosing a course acts on the
 * catalogue.
 */
function AddForm({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean
  error: string | null
  onSubmit: (name: string, course: Course) => void
}) {
  const locale = useContext(LocaleContext)
  const [name, setName] = useState("")
  const [course, setCourse] = useState<Course>("soup")

  return (
    <div className="dishes-form">
      <Field
        label={t(locale, "nameLabel")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <div className="segmented-control-group">
        <span className="segmented-control-label type-eyebrow">
          {t(locale, "dishCourseLabel")}
        </span>
        <div className="segmented-control" role="group" aria-label={t(locale, "dishCourseLabel")}>
          {COURSE_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              className={`segmented-control-cell type-button${c === course ? " segmented-control-cell--selected" : ""}`}
              aria-pressed={c === course}
              onClick={() => setCourse(c)}
            >
              {t(locale, COURSE_LABEL_KEY[c])}
            </button>
          ))}
        </div>
      </div>

      {error && <InlineError>{error}</InlineError>}

      <Button
        variant="primary-catalogue"
        fullWidth
        disabled={busy || !name.trim()}
        onClick={() => onSubmit(name, course)}
      >
        {t(locale, "add")}
      </Button>
    </div>
  )
}

/**
 * Editing a dish is renaming it: a dish's course is fixed once it is set, and
 * the rename has to say out loud that it changes the catalogue and every
 * future plan but no past one (ADR-0002).
 */
function EditForm({
  dish,
  busy,
  error,
  onSubmit,
  onDelete,
}: {
  dish: Dish
  busy: boolean
  error: string | null
  onSubmit: (name: string) => void
  onDelete: () => void
}) {
  const locale = useContext(LocaleContext)
  const [name, setName] = useState(dish.name)

  return (
    <div className="dishes-form">
      <Field
        label={t(locale, "nameLabel")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <p className="sunken-note type-body-sm">{t(locale, "dishEditNotice")}</p>

      {error && <InlineError>{error}</InlineError>}

      <Button
        variant="primary-catalogue"
        fullWidth
        disabled={busy || !name.trim()}
        onClick={() => onSubmit(name)}
      >
        {t(locale, "save")}
      </Button>

      <div className="dishes-form-danger">
        <Button variant="destructive" fullWidth disabled={busy} onClick={onDelete}>
          {t(locale, "deleteBtn")}
        </Button>
      </div>
    </div>
  )
}
