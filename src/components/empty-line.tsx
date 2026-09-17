import type { ReactNode } from "react"

/**
 * A region that draws rows or cards and has none to draw.
 *
 * One line of plain text in `--ink-secondary`, with no ground, no border and
 * no container. It is the region's own zero form, standing where the rows
 * would have been — not a fourth message: it answers *what is in here?* in
 * the place the answer would have been, while a message speaks about a
 * condition somewhere else and lives in the `MessageRegion`.
 *
 * It carries no action of its own: where something can be added, the screen
 * header already holds that control. And it never rewords itself because
 * something else on the screen changed — a Notice above it states the
 * *reason*; the line states the *absence* (visual-system.md →
 * "The empty line", "A week that cannot be generated").
 */
export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="empty-line type-body-sm">{children}</p>
}
