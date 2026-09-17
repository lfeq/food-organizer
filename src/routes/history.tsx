import { createFileRoute, Link } from "@tanstack/react-router"
import { useContext } from "react"
import { EmptyLine } from "#/components/empty-line"
import { Navigation } from "#/components/navigation"
import { LocaleContext, t } from "#/i18n"
import { listPastWeeks } from "#/plan-fns"
import { weekRange } from "#/week-range"

export const Route = createFileRoute("/history")({
  // Past weeks and nothing else. The loader once also derived this week and
  // next week for a stepper the navigation no longer carries; with nothing
  // reading them, the settings round-trip that computed them goes too.
  loader: async () => ({ pastWeeks: await listPastWeeks() }),
  component: HistoryPage,
})

function HistoryPage() {
  const { pastWeeks } = Route.useLoaderData()
  const locale = useContext(LocaleContext)

  return (
    <div className="screen-shell">
      <Navigation />

      <main className="screen-shell-main">
        <div className="history-header">
          <h1 className="history-title type-title-page">{t(locale, "historyH1")}</h1>
        </div>

        {/*
          With no rows the list block is not drawn at all: its top rule and its
          full bleed go with its rows, so an empty list has no visible edge.
        */}
        {pastWeeks.length === 0 ? (
          <EmptyLine>{t(locale, "historyNone")}</EmptyLine>
        ) : (
          <div className="screen-shell-list">
            {/*
              The one place in this design where the whole row *is* the
              control, so the row is the link — not a list item holding one.
              The rows are therefore siblings, which is what lets the list
              block's own rule between rows apply.

              A row carries no action of its own: no `···`, nothing to grow at
              width. Its label is the week's full seven days, and the trailing
              `→` only repeats what the row already says, so it is decoration
              and hidden from the accessible name.
            */}
            <div className="list-block">
              {pastWeeks.map((w) => (
                <Link
                  key={w.week_start}
                  to="/plan/$weekStart"
                  params={{ weekStart: w.week_start }}
                  className="list-block-row list-block-row--linked"
                >
                  <span className="list-block-row-main">
                    <span className="list-block-row-name type-dish-card">
                      {weekRange(w.week_start, locale)}
                    </span>
                  </span>
                  <span className="history-arrow type-body" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
