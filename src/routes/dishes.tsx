import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t, interpolate, type StringKey } from "#/i18n"
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
type Course = typeof COURSES[number]

const COURSE_PLURAL_KEY: Record<Course, StringKey> = {
  soup: "courseSoupPlural",
  side: "courseSidePlural",
  main: "courseMainPlural",
}

const COURSE_LABEL_KEY: Record<Course, StringKey> = {
  soup: "courseSoup",
  side: "courseSide",
  main: "courseMain",
}

function DishesPage() {
  const { authState, displayName } = Route.useRouteContext()
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

  async function handleAdd(name: string, course: Course) {
    setBusy(true)
    setError(null)
    const res = await addDish({ data: { name, course, authorId: member.id } })
    setBusy(false)
    if (!res.ok) {
      setError(res.code === "DISH_NAME_TAKEN" ? t(locale, "dishErrNameTaken") : t(locale, "errGeneric"))
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
      setError(res.code === "DISH_NAME_TAKEN" ? t(locale, "dishErrNameTaken") : t(locale, "errGeneric"))
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
      setError(t(locale, "errGeneric"))
      return
    }
    closeModal()
    await router.invalidate()
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">{displayName ?? "Food Organizer"}</span>
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
        <h1>{t(locale, "dishesH1")}</h1>
        <div className="catalogue-grid">
          {COURSES.map((course) => {
            const col = dishes.filter((d) => d.course === course)
            return (
              <section key={course} className="catalogue-col">
                <header className="catalogue-col-header">
                  <span className="catalogue-col-title">{t(locale, COURSE_PLURAL_KEY[course])}</span>
                  <span className="catalogue-col-count">{col.length}</span>
                </header>
                <ul className="dish-list">
                  {col.map((dish) => (
                    <li key={dish.id} className="dish-item">
                      <div className="dish-item-main">
                        <span className="dish-name">{dish.name}</span>
                        <span className="dish-author">
                          {dish.author_username ?? t(locale, "dishRemovedMember")}
                        </span>
                      </div>
                      <div className="dish-actions">
                        <button
                          className="dish-btn"
                          onClick={() => openModal({ kind: "edit", dish })}
                        >
                          {t(locale, "editBtn")}
                        </button>
                        <button
                          className="dish-btn dish-btn--danger"
                          onClick={() => openModal({ kind: "delete", dish })}
                        >
                          {t(locale, "deleteBtn")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  className="dish-add-btn"
                  onClick={() => openModal({ kind: "add", course })}
                >
                  {t(locale, "dishesAddBtn")}
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
  course: Course
  busy: boolean
  error: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">
        {interpolate(t(locale, "dishAddTitle"), { course: t(locale, COURSE_LABEL_KEY[course]) })}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(name)
        }}
      >
        <label className="modal-label">
          {t(locale, "nameLabel")}
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
            {t(locale, "cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            {t(locale, "add")}
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
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">{t(locale, "dishEditTitle")}</h2>
      <p className="modal-notice">{t(locale, "dishEditNotice")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(name)
        }}
      >
        <label className="modal-label">
          {t(locale, "nameLabel")}
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
            {t(locale, "cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            {t(locale, "save")}
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
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">
        {interpolate(t(locale, "dishDeleteTitle"), { name: dish.name })}
      </h2>
      <p className="modal-notice">{t(locale, "dishDeleteNotice")}</p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {t(locale, "cancel")}
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          {t(locale, "deleteBtn")}
        </button>
      </div>
    </>
  )
}
