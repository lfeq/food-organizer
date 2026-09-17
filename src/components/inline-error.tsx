import type { ReactNode } from "react"

/**
 * An action just failed and the person is standing there.
 *
 * Plain text, no container, no border — there is no danger ground in this
 * system, so an error is a sentence rather than a card. It lives in the
 * `MessageRegion` below the screen header, above any Notice, and it is
 * cleared by the next action rather than by a clock.
 *
 * It is the only thing that speaks for a failure: no colour-only signal, no
 * shaking field, no badge (visual-system.md → "Inline error").
 */
export function InlineError({ children }: { children: ReactNode }) {
  return <p className="inline-error type-body-sm">{children}</p>
}
