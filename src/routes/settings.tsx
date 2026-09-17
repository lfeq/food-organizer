import { createFileRoute, redirect } from "@tanstack/react-router"
import { useContext } from "react"
import { Navigation } from "#/components/navigation"
import { LocaleContext, t } from "#/i18n"

/**
 * Settings — the fifth destination, admin-only.
 *
 * `Instance settings` and `Export data` leave the accounts screen and become
 * their own destination (visual-system.md → "The settings screen"). This is
 * the frame only: ticket #112 moves the two sections here. It exists now so
 * that the navigation's fifth item is a real typed link rather than a promise.
 *
 * The guard is the accounts screen's, verbatim: the admin check runs in
 * `beforeLoad` against the session resolved on the server in `__root`, so a
 * non-admin never reaches the screen and never receives its data.
 */
export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => {
    if (context.authState.member?.role !== "admin") {
      throw redirect({ to: "/" })
    }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const locale = useContext(LocaleContext)

  return (
    <div className="app-layout">
      <Navigation />

      <main className="main-content">
        <div className="plan-header">
          <h1 className="plan-title">{t(locale, "settings")}</h1>
        </div>
      </main>
    </div>
  )
}
