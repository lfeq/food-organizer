import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { doChangePassword, doLogout } from "#/auth-fns"

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const router = useRouter()
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
      setError("Passwords do not match.")
      return
    }
    setBusy(true)
    setError(null)
    const res = await doChangePassword({ data: { newPassword } })
    setBusy(false)
    if (!res.ok) {
      setError(
        res.code === "AUTH_PASSWORD_TOO_SHORT"
          ? "Password must be at least 8 characters."
          : "Something went wrong."
      )
      return
    }
    await router.navigate({ to: "/" })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Set your password</h1>
        <p className="auth-subtitle">
          You must choose a new password before continuing.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="modal-label">
            New password
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
            Confirm password
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
              Sign out
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !newPassword || !confirm}
            >
              Set password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
