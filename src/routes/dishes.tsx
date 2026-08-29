import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t } from "#/i18n"
import { listDishes, addDish, editDish, deleteDish, type Dish } from "#/dishes-fns"

export const Route = createFileRoute("/dishes")({
  component: DishesPage,
  loader: () => listDishes(),
})

type ModalState =
  | { kind: "none" }
  | { kind: "add"; course: "soup" | "side" | "main" }
  | { kind: "edit"; dish: Dish }
  | { kind: "delete"; dish: Dish }

const COURSES = ["soup", "side", "main"] as const
const COURSE_LABELS: Record<string, string> = {
  soup: "Soups",
  side: "Sides",
  main: "Mains",
}

function DishesPage() {
  const { authState } = Route.useRouteContext()
  const dishes = Route.useLoaderData()
  const member = authState.member!
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const [modal, setModal] = useState<ModalState>({ kind: "none" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSetLocale(next: "en" | "es") {
    await setLocale({ data: { locale: next } })
    await router.invalidate()
  }

  function openModal(m: ModalState) {
    setModal(m)
    setError(null)
  }

  function closeModal() {
    setModal({ kind: "none" })
    setError(null)
  }

  async function handleAdd(name: string, course: "soup" | "side" | "main") {
    setBusy(true)
    setError(null)
    const res = await addDish({ data: { name, course, authorId: member.id } })
    setBusy(false)
    if (!res.ok) {
      setError(
        res.code === "DISH_NAME_TAKEN"
          ? "A dish with that name already exists in this course."
          : "Something went wrong."
      )
      return
    }
    closeModal()
    await router.invalidate()
  }

  async function handleEdit(id: string, name: string) {
    setBusy(true)
    setError(null)
    const res = await editDish({ data: { id, name } })
    setBusy(false)
    if (!res.ok) {
      setError(
        res.code === "DISH_NAME_TAKEN"
          ? "A dish with that name already exists in this course."
          : "Something went wrong."
      )
      return
    }
    closeModal()
    await router.invalidate()
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError(null)
    const res = await deleteDish({ data: { id } })
    setBusy(false)
    if (!res.ok) {
      setError("Something went wrong.")
      return
    }
    closeModal()
    await router.invalidate()
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">Food Organizer</span>
        </div>
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <Link to="/" className="sidebar-nav-link">{t(locale, "thisWeek")}</Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/plan/next" className="sidebar-nav-link">{t(locale, "nextWeek")}</Link>
          </li>
          <li className="sidebar-nav-item sidebar-nav-item--active">{t(locale, "dishes")}</li>
          <li className="sidebar-nav-item">
            <Link to="/history" className="sidebar-nav-link">{t(locale, "history")}</Link>
          </li>
          {member.role === "admin" && (
            <li className="sidebar-nav-item">
              <Link to="/accounts" className="sidebar-nav-link">{t(locale, "accounts")}</Link>
            </li>
          )}
        </ul>
        <div className="sidebar-bottom">
          <div className="sidebar-user-row">
            <span className="sidebar-member">{member.username}</span>
            <div className="sidebar-locale">
              <button
                className={`locale-btn${locale === "en" ? " locale-btn--active" : ""}`}
                onClick={() => void handleSetLocale("en")}
              >EN</button>
              <span className="locale-sep">/</span>
              <button
                className={`locale-btn${locale === "es" ? " locale-btn--active" : ""}`}
                onClick={() => void handleSetLocale("es")}
              >ES</button>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            {t(locale, "signOut")}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <h1>Dishes</h1>
        <div className="catalogue-grid">
          {COURSES.map((course) => {
            const col = dishes.filter((d) => d.course === course)
            return (
              <section key={course} className="catalogue-col">
                <header className="catalogue-col-header">
                  <span className="catalogue-col-title">{COURSE_LABELS[course]}</span>
                  <span className="catalogue-col-count">{col.length}</span>
                </header>
                <ul className="dish-list">
                  {col.map((dish) => (
                    <li key={dish.id} className="dish-item">
                      <div className="dish-item-main">
                        <span className="dish-name">{dish.name}</span>
                        <span className="dish-author">
                          {dish.author_username ?? "removed member"}
                        </span>
                      </div>
                      <div className="dish-actions">
                        <button
                          className="dish-btn"
                          onClick={() => openModal({ kind: "edit", dish })}
                        >
                          Edit
                        </button>
                        <button
                          className="dish-btn dish-btn--danger"
                          onClick={() => openModal({ kind: "delete", dish })}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  className="dish-add-btn"
                  onClick={() => openModal({ kind: "add", course })}
                >
                  + Add dish
                </button>
              </section>
            )
          })}
        </div>
      </main>

      {modal.kind !== "none" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal.kind === "add" && (
              <AddModal
                course={modal.course}
                busy={busy}
                error={error}
                onSubmit={(name) => handleAdd(name, modal.course)}
                onCancel={closeModal}
              />
            )}
            {modal.kind === "edit" && (
              <EditModal
                dish={modal.dish}
                busy={busy}
                error={error}
                onSubmit={(name) => handleEdit(modal.dish.id, name)}
                onCancel={closeModal}
              />
            )}
            {modal.kind === "delete" && (
              <DeleteModal
                dish={modal.dish}
                busy={busy}
                error={error}
                onConfirm={() => handleDelete(modal.dish.id)}
                onCancel={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AddModal({
  course,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  course: "soup" | "side" | "main"
  busy: boolean
  error: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  return (
    <>
      <h2 className="modal-title">Add dish — {COURSE_LABELS[course]}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(name)
        }}
      >
        <label className="modal-label">
          Name
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            Add
          </button>
        </div>
      </form>
    </>
  )
}

function EditModal({
  dish,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  dish: Dish
  busy: boolean
  error: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(dish.name)
  return (
    <>
      <h2 className="modal-title">Edit dish</h2>
      <p className="modal-notice">
        Renaming a dish updates the catalogue and every future plan, but leaves past weeks unchanged.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(name)
        }}
      >
        <label className="modal-label">
          Name
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            Save
          </button>
        </div>
      </form>
    </>
  )
}

function DeleteModal({
  dish,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  dish: Dish
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <h2 className="modal-title">Delete "{dish.name}"?</h2>
      <p className="modal-notice">
        Past weeks keep this dish — only future plans are affected.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          Delete
        </button>
      </div>
    </>
  )
}
