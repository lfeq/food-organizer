import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doChangePassword, doLogout } from "#/auth-fns"
import { Button } from "#/components/button"
import { Field } from "#/components/field"
import { InlineError } from "#/components/inline-error"
import { MessageRegion } from "#/components/message-region"
import { SessionFrame, SessionHead } from "#/components/session-frame"
import { LocaleContext, t, interpolate, type StringKey } from "#/i18n"
import type { ResultCode } from "#/result-codes"

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
})

const ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  AUTH_PASSWORD_TOO_SHORT: "changePwErrTooShort",
}

/**
 * Forced password change — the sign-in screen's twin.
 *
 * The same `1j` frame, with `Signed in as <name>` in `note` mono where sign-in
 * puts its host line. A member in this state reaches exactly two things
 * (SPEC.md §8), so `Sign out` is present — but as a **text action**, not the
 * second full-width button the route used to give it: two equal buttons would
 * read as an equal choice, and it is the way back out rather than the thing
 * they came to do.
 */
function ChangePasswordPage() {
  const router = useRouter()
  const { authState } = Route.useRouteContext()
  const locale = useContext(LocaleContext)
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const username = authState.member?.username ?? ""

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  async function handleSubmit(e?: React.SyntheticEvent) {
    e?.preventDefault()
    if (busy || !newPassword || !confirm) return
    if (newPassword !== confirm) {
      setError(t(locale, "changePwErrMismatch"))
      return
    }
    setBusy(true)
    setError(null)
    const res = await doChangePassword({ data: { newPassword } })
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, ERROR_KEY[res.code] ?? "errGeneric"))
      return
    }
    await router.navigate({ to: "/" })
  }

  return (
    <SessionFrame>
      <SessionHead
        eyebrow={t(locale, "sessionSelfHosted")}
        title={t(locale, "brand")}
        note={interpolate(t(locale, "changePwSignedInAs"), { name: username })}
      />

      <div className="change-password-question">
        <h2 className="change-password-title type-title-page">
          {t(locale, "changePwTitle")}
        </h2>
        <p className="change-password-blurb type-meta-sans">
          {t(locale, "changePwSubtitle")}
        </p>
      </div>

      <form
        className="change-password-form"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleSubmit(e)
        }}
      >
        <div className="change-password-fields">
          <Field
            label={t(locale, "changePwNewPw")}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            required
          />
          <Field
            label={t(locale, "changePwConfirm")}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            help={t(locale, "passwordMinHelp")}
            required
          />
        </div>

        <MessageRegion>
          {error ? <InlineError>{error}</InlineError> : null}
        </MessageRegion>

        {/* Dark: a password acts on the session, never on the weekly plan. */}
        <Button
          variant="primary-catalogue"
          fullWidth
          onClick={() => void handleSubmit()}
          disabled={busy || !newPassword || !confirm}
        >
          {t(locale, "changePwSetBtn")}
        </Button>
      </form>

      <p className="change-password-note type-note">
        {t(locale, "changePwNoEmailNote")}
      </p>

      <div className="change-password-exit">
        <Button variant="text-action" onClick={() => void handleLogout()} disabled={busy}>
          {t(locale, "signOut")}
        </Button>
      </div>
    </SessionFrame>
  )
}
