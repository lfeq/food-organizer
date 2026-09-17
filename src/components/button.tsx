import type { ButtonHTMLAttributes, ReactNode } from "react"

/**
 * What a button *acts on*, and where it *sits* — the two things the visual
 * system says vary independently (visual-system.md → "Buttons").
 *
 * The union is the enforcement. The system's most misimplementable rule is the
 * green/dark split — green acts on the weekly plan, dark acts on the
 * catalogue, accounts or session — and there is no `variant="primary"` to
 * reach for: a caller must say which. A wrong variant is a `tsc` error rather
 * than a code review, the same reasoning ADR-0001 applies to a missing
 * i18n key.
 *
 * One variant renders to exactly one modifier class
 * (docs/design/css-structure.md → "Variants are typed props"), so
 * `variant="primary-plan"` and `class="button button--primary-plan"` are the
 * same statement written twice and never drift.
 */
export type ButtonVariant =
  /** Green. Acts on the weekly plan: `Generate week`. */
  | "primary-plan"
  /** Dark. Acts on the catalogue, accounts or session: `Add dish`, `Sign in`. */
  | "primary-catalogue"
  | "secondary"
  | "small-outline"
  /** A glyph alone. `aria-label` is required — see `ButtonProps`. */
  | "icon"
  | "destructive"
  /**
   * The destructive action *inside a row's inline action group*: Small
   * outline's size, `--danger`'s ink and rule. `Remove` on the accounts row
   * is `--danger` in both forms and is a Small outline button in the inline
   * one (visual-system.md → "The accounts screen"), and the full-width
   * `destructive` is the wrong size to say so in a row.
   */
  | "small-destructive"
  /** A bare text action: the week stepper, `Reset password`. */
  | "text-action"

/**
 * Shape says where the button sits: a single action floating in a screen
 * header is a pill; an action inside a form, a sheet or a toolbar group takes
 * `--radius-control`. It applies to the two filled primaries only — every
 * other variant has one shape.
 */
export type ButtonShape = "pill" | "control"

/**
 * The type role each variant carries. Declared here rather than in the
 * stylesheet so that the scale row a variant uses is readable beside the
 * variant itself; `base.css` owns what each role *is*.
 */
const TYPE_CLASS: Record<ButtonVariant, string> = {
  "primary-plan": "type-button",
  "primary-catalogue": "type-button",
  secondary: "type-button",
  "small-outline": "type-button-sm",
  icon: "",
  destructive: "type-button-lg",
  "small-destructive": "type-button-sm",
  "text-action": "type-link-inline",
}

type NativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type">

export type ButtonProps = NativeProps & {
  variant: ButtonVariant
  /** Pill or control. Filled primaries only; ignored elsewhere. Default `control`. */
  shape?: ButtonShape
  /** A width-spanning form button (`Save dish`, `Sign in`): steps up to `button-lg`. */
  fullWidth?: boolean
  children: ReactNode
}

/**
 * Every control in the system that is a `<button>`.
 *
 * It is always `type="button"`: nothing in this app submits a form the
 * browser's way, and a stray default submit inside a sheet is the one bug
 * this removes for free.
 */
export function Button({
  variant,
  shape = "control",
  fullWidth = false,
  children,
  ...rest
}: ButtonProps) {
  const isFilledPrimary =
    variant === "primary-plan" || variant === "primary-catalogue"
  const typeClass = fullWidth ? "type-button-lg" : TYPE_CLASS[variant]

  const className = [
    "button",
    `button--${variant}`,
    isFilledPrimary && shape === "pill" ? "button--pill" : "",
    fullWidth ? "button--full" : "",
    typeClass,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  )
}
