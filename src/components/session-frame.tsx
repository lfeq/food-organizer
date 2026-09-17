import type { ReactNode } from "react"

/**
 * The frame the three session screens share.
 *
 * Sign in, first-run setup and forced password change draw **no navigation
 * chrome at either width** — there is either no session, or a session
 * deliberately pinned to one screen (SPEC.md §11.7). What is left is a single
 * centred column on the page ground, which is what this component is.
 *
 * It is a component rather than three copies of the same markup because the
 * markup is repeated across three route files — the first of the three tests
 * docs/design/css-structure.md → "Components" applies.
 *
 * The root is `display: flex; min-height: 100vh` like every other screen root,
 * even though no `Navigation` is mounted inside it: the height is what lets
 * the column centre itself in the viewport.
 */
export function SessionFrame({ children }: { children: ReactNode }) {
  return (
    <div className="session-frame">
      <main className="session-frame-column">{children}</main>
    </div>
  )
}

export type SessionHeadProps = {
  /** The mono eyebrow above the wordmark. */
  eyebrow: string
  /** The wordmark, in `title-page-desktop` at both widths. */
  title: string
  /**
   * The line beneath the wordmark, in `note` mono: sign-in's explanation of
   * what this instance is, and — on the forced password change screen, its
   * twin — `Signed in as <name>` in the same place.
   */
  note: string
}

/**
 * The `1j` head: eyebrow, wordmark, host line.
 *
 * Sign in and forced password change are the same screen twice
 * (visual-system.md → "The session screens"), and this is the half they share.
 * Setup does not use it: its head is a step counter and a question, not a
 * wordmark, so it writes its own.
 */
export function SessionHead({ eyebrow, title, note }: SessionHeadProps) {
  return (
    <header className="session-frame-head">
      <p className="session-frame-eyebrow type-eyebrow">{eyebrow}</p>
      <h1 className="session-frame-title type-title-page-desktop">{title}</h1>
      <p className="session-frame-note type-note">{note}</p>
    </header>
  )
}
