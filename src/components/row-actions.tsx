import { Button } from "#/components/button"

/**
 * What a row action acts like: an ordinary action, or the destructive one.
 *
 * This is the typed union the list block's two-formed row carries
 * (docs/design/css-structure.md → "Variants are typed props"). The *form* —
 * `···` below `900px`, the inline group above it — is not a prop, because it
 * is not the caller's to choose: `row-actions.css` decides it with the one
 * permitted media query, exactly as `sheet.css` decides between the Sheet and
 * the Panel. What the caller does choose, per action, is the tone, and one
 * tone renders to exactly one button variant in each form.
 */
export type RowActionTone = "default" | "destructive"

export type RowAction = {
  /** The control's own label. A disabled action keeps it — see `reason`. */
  label: string
  tone?: RowActionTone
  disabled?: boolean
  onClick: () => void
}

export type RowActionsProps = {
  /**
   * The accessible name of the `···`, which carries no visible label and has
   * to say which row it belongs to.
   */
  menuLabel: string
  /** Opens the action sheet. The caller owns the sheet and its state. */
  onOpenMenu: () => void
  /**
   * At most three. **The inline group never wraps, which caps it at three** —
   * a fourth Spanish label of any plausible length crosses the line at the
   * threshold (visual-system.md → "Bilingual fit"). A fourth action does not
   * get a narrower button or a shortened label; it goes behind the `···` at
   * both widths.
   */
  actions: readonly RowAction[]
  /**
   * Why the disabled actions are unavailable, as a `meta` mono note beside
   * them. **A disabled control keeps its own label and the reason sits beside
   * it, never in place of it** (visual-system.md → "A disabled control keeps
   * its own label").
   */
  reason?: string
}

/**
 * A list block row's actions — **one component, two forms**, and the second
 * and last of the only two components two-formed across the breakpoint (the
 * first is the Sheet/Panel pair).
 *
 * Below `900px` the actions sit behind a `···` that opens an action sheet; at
 * or above it the same actions sit inline at the end of the row as Small
 * outline buttons, right-aligned, `6px` apart. Everything else about the row
 * is unchanged — same ground, same full bleed, same `16px` inset, same
 * `--rule-inset` between rows — which is the smallest branch a two-formed
 * component can have.
 *
 * Both markups render and the stylesheet picks, the way the day card renders
 * both densities: no JS-measured breakpoint and no hydration mismatch. The
 * hidden form is `display: none`, so it is out of the accessibility tree too.
 *
 * **The row still takes no state.** It is a surface that contains controls
 * rather than being one, and that is as true of the inline group as it was of
 * the `···`. visual-system.md → "The list block at width".
 *
 * The `···` itself is the list block's own `.list-block-action`: this
 * component positions it, it never repaints it.
 */
export function RowActions({
  menuLabel,
  onOpenMenu,
  actions,
  reason,
}: RowActionsProps) {
  return (
    <div className="row-actions">
      {reason ? (
        <span className="row-actions-reason type-meta">{reason}</span>
      ) : null}

      <button
        type="button"
        className="list-block-action row-actions-menu type-body"
        aria-label={menuLabel}
        onClick={onOpenMenu}
      >
        ···
      </button>

      <div className="row-actions-inline">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={
              action.tone === "destructive"
                ? "small-destructive"
                : "small-outline"
            }
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
