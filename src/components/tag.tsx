import type { ReactNode } from "react"

/**
 * An outlined tag: `READ ONLY`.
 *
 * Outlined means *a state this thing is in*, as against the filled `Badge`'s
 * *this one, now* (src/components/badge.tsx).
 */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag type-tag">{children}</span>
}
