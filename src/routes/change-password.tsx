import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doChangePassword, doLogout } from "#/auth-fns"
import { LocaleContext, t } from "#/i18n"

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) {
      setError(t(locale, "changePwErrMismatch"))
      return
    }
    setBusy(true)
    setError(null)
    const res = await doChangePassword({ data: { newPassword } })
    setBusy(false)
    if (!res.ok) {
      setError(
        res.code === "AUTH_PASSWORD_TOO_SHORT"
          ? t(locale, "changePwErrTooShort")
          : t(locale, "errGeneric")
      )
      return
    }
    await router.navigate({ to: "/" })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{t(locale, "changePwTitle")}</h1>
        <p className="auth-subtitle">{t(locale, "changePwSubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <label className="modal-label">
            {t(locale, "changePwNewPw")}
            <input
              className="modal-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="modal-label">
            {t(locale, "changePwConfirm")}
            <input
              className="modal-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="auth-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleLogout}
              disabled={busy}
            >
              {t(locale, "signOut")}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !newPassword || !confirm}
            >
              {t(locale, "changePwSetBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
