import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doLogout } from "#/auth-fns"
import { setLocale } from "#/locale-fns"
import { LocaleContext, t, interpolate, INTL_LOCALE } from "#/i18n"
import {
  listMembers,
  createMember,
  resetMemberPassword,
  removeMember,
  setMemberRole,
  getInstanceSettings,
  updateInstanceSettings,
  exportData,
  type Member,
} from "#/accounts-fns"

export const Route = createFileRoute("/accounts")({
  beforeLoad: ({ context }) => {
    if (context.authState.member?.role !== "admin") {
      throw redirect({ to: "/" })
    }
  },
  loader: () => Promise.all([listMembers(), getInstanceSettings()]),
  component: AccountsPage,
})

type ModalState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "created"; username: string; tempPassword: string }
  | { kind: "reset"; member: Member }
  | { kind: "reset-done"; username: string; tempPassword: string }
  | { kind: "remove"; member: Member }

function getWeekdayName(intlLocale: string, dow: number): string {
  const d = new Date(2000, 0, 2 + dow)
  return new Intl.DateTimeFormat(intlLocale, { weekday: "long" }).format(d)
}

function AccountsPage() {
  const { authState, displayName } = Route.useRouteContext()
  const [members, instanceSettings] = Route.useLoaderData()
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const intlLocale = INTL_LOCALE[locale]
  const [modal, setModal] = useState<ModalState>({ kind: "none" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [weekStartDow, setWeekStartDow] = useState(instanceSettings.week_start_dow)
  const [timezone, setTimezone] = useState(instanceSettings.timezone)
  const [instanceDisplayName, setInstanceDisplayName] = useState(instanceSettings.display_name ?? "")

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
          ? t(locale, "accountsErrUsernameTaken")
          : res.code === "USERNAME_INVALID"
            ? t(locale, "accountsErrUsernameInvalid")
            : t(locale, "errGeneric")
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
      setError(t(locale, "errGeneric"))
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
      setError(t(locale, "errGeneric"))
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

  async function handleExport() {
    setExportBusy(true)
    setExportError(null)
    const data = await exportData()
    setExportBusy(false)
    if (!data) {
      setExportError(t(locale, "exportErrFailed"))
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const datePart = new Date().toISOString().slice(0, 10)
    a.download = `food-organizer-export-${datePart}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSettingsBusy(true)
    setSettingsError(null)
    const updates: { week_start_dow?: number; timezone?: string; display_name?: string | null } = {}
    if (!instanceSettings.has_plans) {
      updates.week_start_dow = weekStartDow
    }
    updates.timezone = timezone.trim()
    updates.display_name = instanceDisplayName.trim() || null
    const res = await updateInstanceSettings({ data: updates })
    setSettingsBusy(false)
    if (!res.ok) {
      setSettingsError(
        res.code === "WEEK_START_FROZEN"
          ? t(locale, "settingsErrFrozen")
          : res.code === "AUTH_INVALID_CREDENTIALS"
            ? t(locale, "errGeneric")
            : t(locale, "errGeneric")
      )
      return
    }
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
          <h1>{t(locale, "accountsH1")}</h1>
          <button className="btn-primary" onClick={() => openModal({ kind: "create" })}>
            {t(locale, "accountsAddMember")}
          </button>
        </div>

        <table className="members-table">
          <thead>
            <tr>
              <th>{t(locale, "accountsColUsername")}</th>
              <th>{t(locale, "accountsColRole")}</th>
              <th>{t(locale, "accountsColStatus")}</th>
              <th>{t(locale, "accountsColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isLastAdmin = m.role === "admin" && adminCount <= 1
              return (
                <tr key={m.id}>
                  <td className="member-username">
                    {m.username}
                    {m.id === me.id && <span className="member-you"> {t(locale, "accountsYou")}</span>}
                  </td>
                  <td>
                    <span className={`role-badge role-badge--${m.role}`}>{m.role}</span>
                  </td>
                  <td>
                    {m.must_change_password && (
                      <span className="status-badge">{t(locale, "accountsMustChange")}</span>
                    )}
                  </td>
                  <td className="member-actions">
                    {isLastAdmin ? (
                      <button
                        className="btn-secondary"
                        disabled
                        title={t(locale, "accountsLastAdmin")}
                      >
                        {t(locale, "accountsLastAdmin")}
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          handleSetRole(m, m.role === "admin" ? "member" : "admin")
                        }
                        disabled={busy}
                      >
                        {m.role === "admin" ? t(locale, "accountsMakeMember") : t(locale, "accountsMakeAdmin")}
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      onClick={() => openModal({ kind: "reset", member: m })}
                      disabled={busy}
                    >
                      {t(locale, "accountsResetPw")}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => openModal({ kind: "remove", member: m })}
                      disabled={busy}
                    >
                      {t(locale, "accountsRemoveBtn")}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <section className="instance-settings">
          <h2 className="instance-settings-title">{t(locale, "instanceSettingsTitle")}</h2>
          <form onSubmit={handleSaveSettings} className="instance-settings-form">
            <label className="settings-label">
              {t(locale, "settingsWeekStart")}
              {instanceSettings.has_plans ? (
                <span className="settings-locked">
                  {getWeekdayName(intlLocale, instanceSettings.week_start_dow)}
                  <span className="settings-locked-reason"> {t(locale, "settingsLockedReason")}</span>
                </span>
              ) : (
                <select
                  className="settings-select"
                  value={weekStartDow}
                  onChange={(e) => setWeekStartDow(parseInt(e.target.value, 10))}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <option key={i} value={i}>{getWeekdayName(intlLocale, i)}</option>
                  ))}
                </select>
              )}
            </label>
            <label className="settings-label">
              {t(locale, "settingsTimezone")}
              <input
                className="settings-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/Mexico_City"
                required
              />
            </label>
            <label className="settings-label">
              {t(locale, "settingsDisplayName")}
              <input
                className="settings-input"
                value={instanceDisplayName}
                onChange={(e) => setInstanceDisplayName(e.target.value)}
                placeholder="e.g. Casa Hernández"
              />
            </label>
            {settingsError && <p className="form-error">{settingsError}</p>}
            <div className="instance-settings-actions">
              <button type="submit" className="btn-primary" disabled={settingsBusy}>
                {t(locale, "settingsSave")}
              </button>
            </div>
          </form>
        </section>

        <section className="instance-settings">
          <h2 className="instance-settings-title">{t(locale, "exportTitle")}</h2>
          <p className="export-desc">{t(locale, "exportDesc")}</p>
          {exportError && <p className="form-error">{exportError}</p>}
          <div className="instance-settings-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleExport}
              disabled={exportBusy}
            >
              {t(locale, "exportBtn")}
            </button>
          </div>
        </section>
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
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">{t(locale, "accountsCreateTitle")}</h2>
      <p className="modal-notice">{t(locale, "accountsCreateNotice")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(username)
        }}
      >
        <label className="modal-label">
          {t(locale, "usernameLabel")}
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
            {t(locale, "cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !username.trim()}>
            {t(locale, "createBtn")}
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
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">
        {interpolate(
          t(locale, isNew ? "accountsCreatedTitle" : "accountsResetDoneTitle"),
          { username }
        )}
      </h2>
      <p className="modal-notice">{t(locale, "accountsPasswordNotice")}</p>
      <div className="temp-password">{tempPassword}</div>
      <div className="modal-actions">
        <button className="btn-primary" onClick={onDone}>
          {t(locale, "accountsDoneBtn")}
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
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">
        {interpolate(t(locale, "accountsResetTitle"), { username: member.username })}
      </h2>
      <p className="modal-notice">{t(locale, "accountsResetNotice")}</p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {t(locale, "cancel")}
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
          {t(locale, "accountsResetPw")}
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
  const locale = useContext(LocaleContext)
  return (
    <>
      <h2 className="modal-title">
        {interpolate(t(locale, "accountsRemoveTitle"), { username: member.username })}
      </h2>
      <p className="modal-notice">{t(locale, "accountsRemoveNotice")}</p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {t(locale, "cancel")}
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
          {t(locale, "accountsRemoveMemberBtn")}
        </button>
      </div>
    </>
  )
}
