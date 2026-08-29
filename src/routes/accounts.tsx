import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t } from "#/i18n"
import {
  listMembers,
  createMember,
  resetMemberPassword,
  removeMember,
  setMemberRole,
  type Member,
} from "#/accounts-fns"

export const Route = createFileRoute("/accounts")({
  beforeLoad: ({ context }) => {
    if (context.authState.member?.role !== "admin") {
      throw redirect({ to: "/" })
    }
  },
  loader: () => listMembers(),
  component: AccountsPage,
})

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "created"; username: string; tempPassword: string }
  | { kind: "reset"; member: Member }
  | { kind: "reset-done"; username: string; tempPassword: string }
  | { kind: "remove"; member: Member }

function AccountsPage() {
  const { authState } = Route.useRouteContext()
  const members = Route.useLoaderData()
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const [modal, setModal] = useState<ModalState>({ kind: "none" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const adminCount = members.filter((m) => m.role === "admin").length
  const me = authState.member!

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

  async function handleCreate(username: string) {
    setBusy(true)
    setError(null)
    const res = await createMember({ data: { username } })
    setBusy(false)
    if (!res.ok) {
      setError(
        res.code === "USERNAME_TAKEN"
          ? "That username is already taken."
          : res.code === "USERNAME_INVALID"
            ? "Username may only contain letters, digits, - and _."
            : "Something went wrong."
      )
      return
    }
    setModal({ kind: "created", username: res.data.username, tempPassword: res.data.tempPassword })
    await router.invalidate()
  }

  async function handleReset(member: Member) {
    setBusy(true)
    setError(null)
    const res = await resetMemberPassword({ data: { memberId: member.id } })
    setBusy(false)
    if (!res.ok) {
      setError("Something went wrong.")
      return
    }
    setModal({ kind: "reset-done", username: member.username, tempPassword: res.data.tempPassword })
    await router.invalidate()
  }

  async function handleRemove(member: Member) {
    setBusy(true)
    setError(null)
    const res = await removeMember({ data: { memberId: member.id } })
    setBusy(false)
    if (!res.ok) {
      setError("Something went wrong.")
      return
    }
    closeModal()
    await router.invalidate()
    if (member.id === me.id) {
      await router.navigate({ to: "/login" })
    }
  }

  async function handleSetRole(member: Member, role: "admin" | "member") {
    setBusy(true)
    const res = await setMemberRole({ data: { memberId: member.id, role } })
    setBusy(false)
    if (!res.ok) return
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
          <li className="sidebar-nav-item">
            <Link to="/dishes" className="sidebar-nav-link">{t(locale, "dishes")}</Link>
          </li>
          <li className="sidebar-nav-item">
            <Link to="/history" className="sidebar-nav-link">{t(locale, "history")}</Link>
          </li>
          <li className="sidebar-nav-item sidebar-nav-item--active">{t(locale, "accounts")}</li>
        </ul>
        <div className="sidebar-bottom">
          <div className="sidebar-user-row">
            <span className="sidebar-member">{me.username}</span>
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
        <div className="accounts-header">
          <h1>Accounts</h1>
          <button className="btn-primary" onClick={() => openModal({ kind: "create" })}>
            Add member
          </button>
        </div>

        <table className="members-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isLastAdmin = m.role === "admin" && adminCount <= 1
              return (
                <tr key={m.id}>
                  <td className="member-username">
                    {m.username}
                    {m.id === me.id && <span className="member-you"> (you)</span>}
                  </td>
                  <td>
                    <span className={`role-badge role-badge--${m.role}`}>{m.role}</span>
                  </td>
                  <td>
                    {m.must_change_password && (
                      <span className="status-badge">must change password</span>
                    )}
                  </td>
                  <td className="member-actions">
                    {isLastAdmin ? (
                      <button
                        className="btn-secondary"
                        disabled
                        title="Last admin — cannot demote"
                      >
                        Last admin
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          handleSetRole(m, m.role === "admin" ? "member" : "admin")
                        }
                        disabled={busy}
                      >
                        {m.role === "admin" ? "Make member" : "Make admin"}
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => openModal({ kind: "reset", member: m })}
                      disabled={busy}
                    >
                      Reset password
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => openModal({ kind: "remove", member: m })}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </main>

      {modal.kind !== "none" && (
        <div
          className="modal-backdrop"
          onClick={modal.kind === "created" || modal.kind === "reset-done" ? undefined : closeModal}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal.kind === "create" && (
              <CreateModal
                busy={busy}
                error={error}
                onSubmit={handleCreate}
                onCancel={closeModal}
              />
            )}
            {(modal.kind === "created" || modal.kind === "reset-done") && (
              <PasswordRevealModal
                username={modal.username}
                tempPassword={modal.tempPassword}
                isNew={modal.kind === "created"}
                onDone={closeModal}
              />
            )}
            {modal.kind === "reset" && (
              <ResetModal
                member={modal.member}
                busy={busy}
                error={error}
                onConfirm={() => handleReset(modal.member)}
                onCancel={closeModal}
              />
            )}
            {modal.kind === "remove" && (
              <RemoveModal
                member={modal.member}
                busy={busy}
                error={error}
                onConfirm={() => handleRemove(modal.member)}
                onCancel={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateModal({
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  error: string | null
  onSubmit: (username: string) => void
  onCancel: () => void
}) {
  const [username, setUsername] = useState("")
  return (
    <>
      <h2 className="modal-title">Add member</h2>
      <p className="modal-notice">
        A temporary password will be generated for you to share with them. They
        must change it on first login.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(username)
        }}
      >
        <label className="modal-label">
          Username
          <input
            className="modal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            autoComplete="off"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !username.trim()}>
            Create
          </button>
        </div>
      </form>
    </>
  )
}

function PasswordRevealModal({
  username,
  tempPassword,
  isNew,
  onDone,
}: {
  username: string
  tempPassword: string
  isNew: boolean
  onDone: () => void
}) {
  return (
    <>
      <h2 className="modal-title">
        {isNew ? `Member "${username}" created` : `Password reset for "${username}"`}
      </h2>
      <p className="modal-notice">
        Share this temporary password with them. It will not be shown again.
        They must change it on first login.
      </p>
      <div className="temp-password">{tempPassword}</div>
      <div className="modal-actions">
        <button className="btn-primary" onClick={onDone}>
          Done — I have noted the password
        </button>
      </div>
    </>
  )
}

function ResetModal({
  member,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  member: Member
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <h2 className="modal-title">Reset password for "{member.username}"?</h2>
      <p className="modal-notice">
        A new temporary password will be generated. Their current sessions will
        be signed out, and they must change the password on next login.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
          Reset password
        </button>
      </div>
    </>
  )
}

function RemoveModal({
  member,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  member: Member
  busy: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <h2 className="modal-title">Remove "{member.username}"?</h2>
      <p className="modal-notice">
        Their sessions will be signed out. Their dishes stay in the catalogue,
        and the weeks they generated remain in history.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          Remove member
        </button>
      </div>
    </>
  )
}
