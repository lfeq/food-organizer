import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

/**
 * Which form the Notice takes. It branches on **content, not on width**: is
 * there a week on screen for it to annotate?
 *
 * - `full` — no plan is drawn, so the Notice is the screen's subject:
 *   headline, explanation and call to action stacked.
 * - `compact` — a week is drawn and the Notice annotates it: one row, an `!`
 *   and a sentence.
 *
 * Both forms are the same at both widths. A breakpoint branch here would get
 * the density backwards — three lines on a phone, one on a desktop.
 */
export type NoticeForm = "full" | "compact"

export type NoticeProps = {
  form: NoticeForm
  /** The full form's first line. Ignored by the compact form, which has no room for it. */
  headline: string
  /**
   * The sentence. May contain the placeholder `{dish}`, which is replaced by
   * `dishName` wrapped in the inline pill — the component owns that paint so
   * that a screen never assembles it.
   */
  sentence: string
  /** Names the one dish that repeats. Several repeats name the courses instead, in `sentence`. */
  dishName?: string
  /** The underlined action's words. It always goes to the catalogue, with no course preselected. */
  actionLabel: string
}

/**
 * The amber Notice, in the message region below the screen header.
 *
 * It carries two messages in one component — *this course is short* (a
 * predicate about the catalogue, knowable before a week is drawn) and *this
 * week repeats a dish* (a predicate about the week, knowable only after).
 * They are not the same statement, but they share a colour, a meaning and one
 * call to action.
 *
 * Zero is the far end of short, not a third message: the sentence changes, the
 * component does not. What changes with it is the `Generate week` button
 * beside it, which the caller disables — a Notice and a disabled control are
 * not redundant, the Notice being the reason sitting beside a control that
 * keeps its own label.
 *
 * `aria-live` belongs to the `MessageRegion` that holds this, not here: one
 * region, announced once.
 */
export function Notice({ form, headline, sentence, dishName, actionLabel }: NoticeProps) {
  const body = fillDish(sentence, dishName)

  const action = (
    <Link to="/dishes" className="notice-action type-chip">
      {actionLabel}
    </Link>
  )

  if (form === "compact") {
    return (
      <div className="notice notice--compact">
        <span className="notice-glyph" aria-hidden="true">
          !
        </span>
        <p className="notice-sentence type-body-sm">
          {body} {action}
        </p>
      </div>
    )
  }

  return (
    <div className="notice notice--full">
      <p className="notice-headline type-meta-sans">{headline}</p>
      <p className="notice-sentence type-body-sm">{body}</p>
      {action}
    </div>
  )
}

/**
 * Splits a sentence around its `{dish}` placeholder and wraps the name in the
 * inline pill. A dish name has no maximum length, so nothing here fixes a
 * width or truncates: the sentence and the pill wrap.
 */
function fillDish(sentence: string, dishName?: string): ReactNode {
  const parts = sentence.split("{dish}")
  if (parts.length === 1 || !dishName) return sentence
  return parts.flatMap((part, index) =>
    index === 0
      ? [part]
      : [
          <span key={index} className="notice-dish">
            {dishName}
          </span>,
          part,
        ],
  )
}
