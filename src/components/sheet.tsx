import { useContext, useEffect, type ReactNode } from "react"
import { LocaleContext, t } from "#/i18n"

/**
 * The dismiss word, which the visual system makes a property of *what the
 * sheet holds* rather than a free string: `Cancel` where work would be
 * abandoned (the add/edit dish sheet, the action sheet), `Close` where nothing
 * is at stake (the `More` navigation sheet). A typed union is what stops the
 * third caller from inventing a fourth word.
 */
export type SheetDismiss = "cancel" | "close"

export type SheetProps = {
  /**
   * The header title. For an action sheet this is the **row's own subject** —
   * the dish's name, the member's username — because the sheet has to say
   * which row was tapped and that row is behind the scrim.
   */
  title: string
  dismiss: SheetDismiss
  onDismiss: () => void
  children: ReactNode
}

const DISMISS_KEY = {
  cancel: "cancel",
  close: "closeBtn",
} as const

/**
 * Sheet below `900px`, Panel at or above it — **one component, two forms**.
 *
 * This is the first of the only two components two-formed across the
 * breakpoint (the other is the list block's row actions). Which form is drawn
 * is decided in `sheet.css` by the one permitted media query, exactly as the
 * navigation decides between its tab bar and its sidebar: this file renders
 * one markup and lets the stylesheet choose, so there is no JS-measured
 * breakpoint and no hydration mismatch.
 *
 * A rising sheet at both widths was considered and declined — a form is not a
 * step, and a full-width band pinned to the bottom edge of a wide monitor puts
 * the fields far from the row that opened them. visual-system.md → "Sheet",
 * "Panel (desktop)".
 *
 * The list stays visible behind the scrim in both forms: the sheet dims the
 * screen, it does not replace it.
 */
export function Sheet({ title, dismiss, onDismiss, children }: SheetProps) {
  const locale = useContext(LocaleContext)

  // Dismissible from the keyboard as well as from the dismiss word and the
  // scrim. Nothing here animates; the listener only exists while it is open.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onDismiss])

  return (
    <>
      <div className="sheet-scrim" aria-hidden="true" onClick={onDismiss} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-header">
          <span className="sheet-title type-title-sheet">{title}</span>
          <button type="button" className="sheet-dismiss type-meta" onClick={onDismiss}>
            {t(locale, DISMISS_KEY[dismiss])}
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

/** What an action row acts like: an ordinary action, or the destructive one. */
export type SheetActionTone = "default" | "destructive"

/**
 * The action sheet's body: one action per row, the destructive one last.
 *
 * The third use of the Sheet — what a catalogue row's `···` opens, and what a
 * member row's `···` opens below `900px`. No icons.
 */
export function SheetActions({ children }: { children: ReactNode }) {
  return <div className="sheet-actions">{children}</div>
}

export type SheetActionProps = {
  tone?: SheetActionTone
  onClick: () => void
  /**
   * An unavailable action is disabled rather than missing, and it keeps its
   * own label — the reason goes in `note`, beside it and never in place of it
   * (visual-system.md → "A disabled control keeps its own label").
   */
  disabled?: boolean
  /** `meta` mono, after the label. Why the action is unavailable. */
  note?: string
  children: ReactNode
}

/**
 * One row of an action sheet. Unlike a catalogue row, an action row **is** the
 * control, so it takes the list-row treatment — visual-system.md →
 * "Interactive states".
 */
export function SheetAction({
  tone = "default",
  onClick,
  disabled = false,
  note,
  children,
}: SheetActionProps) {
  return (
    <button
      type="button"
      className={`sheet-action sheet-action--${tone} type-body`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {note ? <span className="sheet-action-note type-meta">{note}</span> : null}
    </button>
  )
}
