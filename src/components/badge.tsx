import type { ReactNode } from "react"

/**
 * A filled tag: `TODAY`, `ADMIN`.
 *
 * Filled means *this one, now*. A state the thing is merely in is an outlined
 * `Tag` instead (src/components/tag.tsx) — the two are one decision apart and
 * are deliberately two components so that the decision has to be made.
 */
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge type-badge">{children}</span>
}
