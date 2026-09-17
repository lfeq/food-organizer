import type { ReactNode } from "react"

/**
 * The one region where the app speaks, directly below the screen header.
 *
 * It holds the inline error above the Notice — nearest-in-time nearest the
 * top, the error being about the person's last action and the Notice about
 * the screen's standing condition.
 *
 * It is a polite live region and is **always mounted, empty or not**, so a
 * message that arrives after a tap is announced without anything moving on
 * screen. Announcement is what this system has instead of motion: there is no
 * expiring message here, and nothing appears on a timer and leaves on one
 * (visual-system.md → "Messages: the family").
 */
export function MessageRegion({ children }: { children?: ReactNode }) {
  return (
    <div className="message-region" aria-live="polite">
      {children}
    </div>
  )
}
