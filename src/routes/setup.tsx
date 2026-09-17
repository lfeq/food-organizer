import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { doSetup } from "#/auth-fns"
import { Button } from "#/components/button"
import { Field, SelectField } from "#/components/field"
import { InlineError } from "#/components/inline-error"
import { MessageRegion } from "#/components/message-region"
import { SessionFrame } from "#/components/session-frame"
import {
  LocaleContext,
  t,
  interpolate,
  INTL_LOCALE,
  type StringKey,
} from "#/i18n"
import type { ResultCode } from "#/result-codes"
import { weekdayName } from "#/week-range"

export const Route = createFileRoute("/setup")({
  component: SetupPage,
})

/**
 * How many steps setup asks, and therefore what the counter counts.
 *
 * Two, not three: a step where the household reviews the seed catalogue was
 * ruled out of scope (SPEC.md §14). The 27 seed dishes are still inserted —
 * silently, inside the same transaction as everything else.
 */
const STEP_COUNT = 2

/** Sunday and Monday are the only two week starts the app admits (§6.1). */
const WEEK_STARTS = [0, 1] as const

/** §7.4: the settings row's timezone default. */
const DEFAULT_TIMEZONE = "America/Mexico_City"

const ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  USERNAME_INVALID: "setupErrUsernameInvalid",
  USERNAME_TAKEN: "setupErrUsernameTaken",
  AUTH_PASSWORD_TOO_SHORT: "setupErrPasswordTooShort",
  DB_UNREACHABLE: "setupErrDb",
}

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/
const PASSWORD_MIN = 8

/**
 * First-run setup: one question per screen, two steps.
 *
 * The steps are a **client-side progression over a single server call**, not
 * two routes and not two writes. `doSetup` already does all four things — the
 * settings row, the first admin, the 27 seed dishes and the session — in one
 * transaction, and splitting it would make a half-configured instance
 * representable (SPEC.md §7.4, §11.7).
 */
function SetupPage() {
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const intlLocale = INTL_LOCALE[locale]
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [weekStart, setWeekStart] = useState(0)
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /**
   * Step one's own refusals, said where the field is.
   *
   * The server checks the same two things and is the authority; saying them
   * here as well is what keeps a step-one mistake from surfacing on step two,
   * where the field that caused it is no longer on screen.
   */
  function accountRefusal(): StringKey | null {
    if (!USERNAME_RE.test(username.trim())) return "setupErrUsernameInvalid"
    if (password.length < PASSWORD_MIN) return "setupErrPasswordTooShort"
    return null
  }

  function goToWeekStep() {
    const refusal = accountRefusal()
    if (refusal) {
      setError(t(locale, refusal))
      return
    }
    setError(null)
    setStep(2)
  }

  async function finish() {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await doSetup({
        data: { username, password, weekStartDow: weekStart, timezone },
      })
      if (result.ok) {
        await router.navigate({ to: "/" })
      } else {
        setError(t(locale, ERROR_KEY[result.code] ?? "errGeneric"))
      }
    } finally {
      setLoading(false)
    }
  }

  function advance(e?: React.SyntheticEvent) {
    e?.preventDefault()
    if (step === 1) goToWeekStep()
    else void finish()
  }

  const counter = interpolate(t(locale, "setupStepCounter"), {
    step: String(step),
    total: String(STEP_COUNT),
  })

  return (
    <SessionFrame>
      {/*
        One `<form>` across both steps, because it is one submission: the step
        decides which fields are on screen, not which call is made.
      */}
      <form
        className="setup-step"
        onSubmit={advance}
        onKeyDown={(e) => {
          if (e.key === "Enter") advance(e)
        }}
      >
        <header className="setup-head">
          {/* `meta` mono. The only progress indicator: no bar, no dots. */}
          <p className="setup-counter type-meta">{counter}</p>
          <h1 className="setup-title type-title-page">
            {t(locale, step === 1 ? "setupAccountTitle" : "setupWeekTitle")}
          </h1>
          <p className="setup-blurb type-body-sm">
            {t(locale, step === 1 ? "setupAccountBlurb" : "setupWeekBlurb")}
          </p>
        </header>

        <div className="setup-fields">
          {step === 1 ? (
            <>
              <Field
                label={t(locale, "usernameLabel")}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
              <Field
                label={t(locale, "passwordLabel")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                help={t(locale, "passwordMinHelp")}
                minLength={PASSWORD_MIN}
                required
              />
            </>
          ) : (
            <>
              <SelectField
                label={t(locale, "setupWeekStartsOn")}
                value={String(weekStart)}
                onChange={(e) => setWeekStart(Number(e.target.value))}
                options={WEEK_STARTS.map((dow) => ({
                  value: String(dow),
                  label: weekdayName(intlLocale, dow),
                }))}
              />
              <Field
                label={t(locale, "setupTimezone")}
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
            </>
          )}
        </div>

        <MessageRegion>
          {error ? <InlineError>{error}</InlineError> : null}
        </MessageRegion>

        {/* Dark: setting the instance up acts on accounts, not on the plan. */}
        <Button
          variant="primary-catalogue"
          fullWidth
          onClick={() => advance()}
          disabled={loading}
        >
          {step === 1
            ? t(locale, "setupContinue")
            : loading
              ? t(locale, "setupSettingUp")
              : t(locale, "setupFinishBtn")}
        </Button>
      </form>
    </SessionFrame>
  )
}
