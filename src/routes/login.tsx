import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doLogin } from "#/auth-fns"
import { Button } from "#/components/button"
import { Field } from "#/components/field"
import { InlineError } from "#/components/inline-error"
import { MessageRegion } from "#/components/message-region"
import { SessionFrame, SessionHead } from "#/components/session-frame"
import { LocaleContext, t, type StringKey } from "#/i18n"
import type { ResultCode } from "#/result-codes"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

/**
 * What each refusal says, by code.
 *
 * Keyed by `ResultCode` rather than by `string`, so a code this screen can
 * raise and has no sentence for is visible here rather than on the screen.
 * Anything unmapped falls through to `errGeneric`: a machine code is not a
 * translated string, and ADR-0001 admits no third category.
 */
const ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  AUTH_INVALID_CREDENTIALS: "loginErrInvalidCreds",
  AUTH_THROTTLED: "loginErrThrottled",
  DB_UNREACHABLE: "loginErrDb",
}

function LoginPage() {
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e?: React.SyntheticEvent) {
    e?.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await doLogin({ data: { username, password } })
      if (result.ok) {
        await router.navigate({ to: "/" })
      } else {
        setError(t(locale, ERROR_KEY[result.code] ?? "errGeneric"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SessionFrame>
      <SessionHead
        eyebrow={t(locale, "sessionSelfHosted")}
        title={t(locale, "brand")}
        note={t(locale, "loginHostLine")}
      />

      {/*
        A real `<form>`, so a password manager recognises the pair — but the
        Enter key is handled explicitly: the kit's `Button` is always
        `type="button"`, and a form with no submit button and two fields does
        not implicitly submit.
      */}
      <form
        className="login-form"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleSubmit(e)
        }}
      >
        <div className="login-fields">
          <Field
            label={t(locale, "usernameLabel")}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Field
            label={t(locale, "passwordLabel")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <MessageRegion>
          {error ? <InlineError>{error}</InlineError> : null}
        </MessageRegion>

        {/*
          Dark, not green: signing in acts on the session. The button is
          `type="button"` like every other one in the kit, so the form's
          `onSubmit` is what the Enter key reaches and this is what a tap does.
        */}
        <Button
          variant="primary-catalogue"
          fullWidth
          onClick={() => void handleSubmit()}
          disabled={loading}
        >
          {loading ? t(locale, "loginSigningIn") : t(locale, "loginSignIn")}
        </Button>
      </form>
    </SessionFrame>
  )
}
