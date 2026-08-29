import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doSetup } from "#/auth-fns"
import { LocaleContext, t, INTL_LOCALE } from "#/i18n"

export const Route = createFileRoute("/setup")({
  component: SetupPage,
})

function getWeekdayName(intlLocale: string, dow: number): string {
  const d = new Date(2000, 0, 2 + dow)
  return new Intl.DateTimeFormat(intlLocale, { weekday: "long" }).format(d)
}

function SetupPage() {
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const intlLocale = INTL_LOCALE[locale]
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [weekStart, setWeekStart] = useState(0)
  const [timezone, setTimezone] = useState("America/Mexico_City")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await doSetup({
        data: {
          username,
          password,
          weekStartDow: weekStart,
          timezone,
        },
      })
      if (result.ok) {
        await router.navigate({ to: "/" })
      } else {
        const messages: Record<string, string> = {
          USERNAME_INVALID: t(locale, "setupErrUsernameInvalid"),
          USERNAME_TAKEN: t(locale, "setupErrUsernameTaken"),
          AUTH_PASSWORD_TOO_SHORT: t(locale, "setupErrPasswordTooShort"),
          DB_UNREACHABLE: t(locale, "setupErrDb"),
        }
        setError(messages[result.code] ?? result.code)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1>{t(locale, "setupTitle")}</h1>
        <p className="setup-subtitle">{t(locale, "setupSubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <label>
            {t(locale, "usernameLabel")}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, digits, - and _ only"
            />
          </label>
          <label>
            {t(locale, "passwordLabel")}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            {t(locale, "setupWeekStartsOn")}
            <select
              value={weekStart}
              onChange={(e) => setWeekStart(Number(e.target.value))}
            >
              <option value={0}>{getWeekdayName(intlLocale, 0)}</option>
              <option value={1}>{getWeekdayName(intlLocale, 1)}</option>
            </select>
          </label>
          <label>
            {t(locale, "setupTimezone")}
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? t(locale, "setupSettingUp") : t(locale, "setupCreateAccount")}
          </button>
        </form>
      </div>
    </div>
  )
}
