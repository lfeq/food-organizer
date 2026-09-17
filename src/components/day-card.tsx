import type { ReactNode } from "react"
import type { Course } from "#/plan-fns"

/** One course of one day, with the label already in the reader's language. */
export type DayCardSlot = { course: Course; label: string; dishName: string }

export type DayCardProps = {
  /** The gutter's two mono lines: `THU` over `27`. */
  dayName: string
  dayNumber: string
  /** The three courses in display order: soup, side, main. */
  slots: readonly DayCardSlot[]
  /**
   * Elapsed: dimmed and read-only. An elapsed day passes no `action` at all —
   * the control is **absent**, not disabled (SPEC.md §11.2).
   */
  elapsed?: boolean
  /** The day's reroll control, or nothing. The card itself is never a control. */
  action?: ReactNode
}

/**
 * One day of the week, below the featured today card.
 *
 * **A day card is a surface that contains a control, not a control itself.**
 * It takes no hover, no pressed state, no focus ring and `cursor: default`;
 * the reroll button inside it carries the whole affordance. The card is the
 * largest surface on the week screen, and giving it a hover would make the
 * desktop look as though the whole week were clickable when only seven small
 * buttons are.
 *
 * It renders **both** densities and lets `day-card.css` choose between them at
 * the one breakpoint — the same arrangement the navigation uses, so there is
 * no JS-measured width and no hydration mismatch. Below `900px`: the dish
 * names alone, `main` with `soup · side` beneath it, no course labels. At or
 * above it: labelled `SOUP / SIDE / MAIN` rows.
 */
export function DayCard({ dayName, dayNumber, slots, elapsed = false, action }: DayCardProps) {
  const main = slots.find((slot) => slot.course === "main")
  const beneath = slots.filter((slot) => slot.course !== "main")

  return (
    <article className={`day-card${elapsed ? " day-card--elapsed" : ""}`}>
      <div className="day-card-gutter type-day-label">
        <span className="day-card-day">{dayName}</span>
        <span className="day-card-number">{dayNumber}</span>
      </div>

      <div className="day-card-content">
        {/* Below 900px: dish names alone. */}
        <div className="day-card-compact">
          <p className="day-card-headline type-dish-card">{main?.dishName}</p>
          <p className="day-card-beneath type-meta-sans">
            {beneath.map((slot) => slot.dishName).join(" · ")}
          </p>
        </div>

        {/* At or above 900px: the same day, labelled. */}
        <dl className="day-card-grid">
          {slots.map((slot) => (
            <div key={slot.course} className="day-card-row">
              <dt className="day-card-label type-course-label">{slot.label}</dt>
              <dd className="day-card-dish type-body">{slot.dishName}</dd>
            </div>
          ))}
        </dl>
      </div>

      {action ? <div className="day-card-action">{action}</div> : null}
    </article>
  )
}
