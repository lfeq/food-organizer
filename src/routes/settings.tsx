import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import {
  getInstanceSettings,
  updateInstanceSettings,
  exportData,
} from "#/accounts-fns"
import { Button } from "#/components/button"
import { Field, SelectField } from "#/components/field"
import { InlineError } from "#/components/inline-error"
import { MessageRegion } from "#/components/message-region"
import { Navigation } from "#/components/navigation"
import { LocaleContext, t, INTL_LOCALE, type StringKey } from "#/i18n"
import type { ResultCode } from "#/result-codes"
import { weekdayName } from "#/week-range"

/**
 * Settings — the fifth destination, admin-only.
 *
 * `Instance settings` and `Export data` left the accounts screen rather than
 * folding into a segmented control on it: a member list and an instance's week
 * start are not two views of one thing (SPEC.md §11.5, visual-system.md →
 * "The settings screen"). Two sections down one column at both widths.
 *
 * The guard is the accounts screen's, verbatim: the admin check runs in
 * `beforeLoad` against the session resolved on the server in `__root`, so a
 * non-admin never reaches the screen. It is a convenience, not the
 * enforcement — every server function here resolves the caller itself and
 * refuses a non-admin with `AUTH_INVALID_CREDENTIALS`.
 */
export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => {
    if (context.authState.member?.role !== "admin") {
      throw redirect({ to: "/" })
    }
  },
  loader: () => getInstanceSettings(),
  component: SettingsPage,
})

/** §6.1: `week_start_dow` holds `0..6` on Postgres's `dow` convention. */
const WEEK_START_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

/**
 * Every refusal `updateInstanceSettings` can return, said in the household's
 * own language. A code with no entry here falls back to `errGeneric` — which
 * is what `DB_UNREACHABLE` wants, and nothing else should reach.
 */
const SAVE_ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  WEEK_START_FROZEN: "settingsErrFrozen",
  TIMEZONE_INVALID: "settingsErrTimezone",
}

function SettingsPage() {
  const instance = Route.useLoaderData()
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const intlLocale = INTL_LOCALE[locale]

  const [weekStartDow, setWeekStartDow] = useState(instance.week_start_dow)
  const [timezone, setTimezone] = useState(instance.timezone)
  const [displayName, setDisplayName] = useState(instance.display_name ?? "")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const locked = instance.has_plans

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError(null)
    /*
      A locked week start is not sent at all. The server refuses it either way
      (§6.1) — the point of omitting it is that a save of the *other* two
      fields must not be refused for a field this screen never offered.
    */
    const res = await updateInstanceSettings({
      data: {
        ...(locked ? {} : { week_start_dow: weekStartDow }),
        timezone: timezone.trim(),
        display_name: displayName.trim() || null,
      },
    })
    setSaving(false)
    if (!res.ok) {
      setSaveError(t(locale, SAVE_ERROR_KEY[res.code] ?? "errGeneric"))
      return
    }
    await router.invalidate()
  }

  /**
   * The export is built in the browser from what the server function returns.
   * `exportData` resolves the caller itself and answers `null` to anyone who
   * is not an admin, which is the same refusal as an unreachable database from
   * here — both are `Export failed`.
   */
  async function handleExport() {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    const data = await exportData()
    setExporting(false)
    if (!data) {
      setExportError(t(locale, "exportErrFailed"))
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `food-organizer-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="screen-shell">
      <Navigation />

      <main className="screen-shell-main">
        <h1 className="settings-title type-title-page">{t(locale, "settings")}</h1>

        {/* ── Instance settings ───────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title type-eyebrow">
            {t(locale, "instanceSettingsTitle")}
          </h2>

          <form className="settings-form" onSubmit={(e) => void handleSave(e)}>
            {locked ? (
              /*
                Once a plan exists the week start is frozen (§6.1), and a
                frozen value is **not** a disabled `select`: it is the weekday
                in plain text with the reason after it in `meta` mono. The
                value a household cannot change is still a value it needs to
                read — the disabled-control rule, applied to a field.
              */
              <div className="settings-frozen">
                <span className="settings-frozen-label type-eyebrow">
                  {t(locale, "settingsWeekStart")}
                </span>
                <p className="settings-frozen-value type-body">
                  {weekdayName(intlLocale, instance.week_start_dow)}{" "}
                  <span className="settings-frozen-reason type-meta">
                    {t(locale, "settingsLockedReason")}
                  </span>
                </p>
              </div>
            ) : (
              /*
                A `SelectField`, not the segmented control: that component is
                spoken for — "used once, for course selection" — and this is
                the same choice `/setup` makes for the same question.
              */
              <SelectField
                label={t(locale, "settingsWeekStart")}
                value={String(weekStartDow)}
                onChange={(e) => setWeekStartDow(Number(e.target.value))}
                options={WEEK_START_DAYS.map((dow) => ({
                  value: String(dow),
                  label: weekdayName(intlLocale, dow),
                }))}
              />
            )}

            <Field
              label={t(locale, "settingsTimezone")}
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              help={t(locale, "settingsTimezoneHelp")}
              required
            />

            <Field
              label={t(locale, "settingsDisplayName")}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t(locale, "settingsDisplayNamePlaceholder")}
            />

            <MessageRegion>
              {saveError ? <InlineError>{saveError}</InlineError> : null}
            </MessageRegion>

            {/* Dark: an instance's settings are neither the plan nor the
                catalogue. Nothing on this screen is green. */}
            <div className="settings-actions">
              <Button
                variant="primary-catalogue"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {t(locale, "settingsSave")}
              </Button>
            </div>
          </form>
        </section>

        {/* ── Export data ─────────────────────────────────────────────── */}
        <section className="settings-section">
          <h2 className="settings-section-title type-eyebrow">
            {t(locale, "exportTitle")}
          </h2>

          <p className="settings-export-desc type-body-sm">
            {t(locale, "exportDesc")}
          </p>

          <MessageRegion>
            {exportError ? <InlineError>{exportError}</InlineError> : null}
          </MessageRegion>

          {/*
            Secondary, not dark: downloading a backup acts on neither the plan
            nor the catalogue, and it is not this screen's primary action.
          */}
          <div className="settings-actions">
            <Button
              variant="secondary"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              {t(locale, "exportBtn")}
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
