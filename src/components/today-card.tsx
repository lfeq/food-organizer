import type { ReactNode } from "react"
import { Badge } from "#/components/badge"
import type { DayCardSlot } from "#/components/day-card"

export type TodayCardProps = {
  /** The gutter's two mono lines, as on any other day: `THU` over `27`. */
  dayName: string
  dayNumber: string
  /** The `TODAY` badge's word. Filled means *this one, now*. */
  badgeLabel: string
  /** The three courses in display order: soup, side, main. */
  slots: readonly DayCardSlot[]
  /** The day's own labelled reroll control, or nothing. */
  action?: ReactNode
}

/**
 * Today, featured: all three courses at reading size with a labelled reroll
 * control, because the app's single most common use is answering "what are we
 * eating today" at a glance.
 *
 * It differs from a `DayCard` in three ways and no more — a `--rule-strong`
 * border rather than `--rule`, a label stacked above each dish rather than
 * beside it, and the main course at `dish-hero`, the largest dish name in the
 * system. Stacking is also what makes it unconstrained in either language:
 * there is no shared label column to measure.
 *
 * Like a day card it is a surface that contains a control, not a control
 * itself, and it takes no interactive state. It has **one** form: it does not
 * branch at the breakpoint, because it is already at reading size on a phone.
 */
export function TodayCard({ dayName, dayNumber, badgeLabel, slots, action }: TodayCardProps) {
  return (
    <article className="today-card">
      <header className="today-card-header">
        <span className="today-card-gutter type-day-label">
          {dayName} {dayNumber}
        </span>
        <Badge>{badgeLabel}</Badge>
        {action ? <span className="today-card-action">{action}</span> : null}
      </header>

      <dl className="today-card-slots">
        {slots.map((slot) => (
          <div key={slot.course} className="today-card-slot">
            <dt className="today-card-label type-course-label">{slot.label}</dt>
            <dd
              className={`today-card-dish ${
                slot.course === "main" ? "type-dish-hero" : "type-dish-today"
              }`}
            >
              {slot.dishName}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
