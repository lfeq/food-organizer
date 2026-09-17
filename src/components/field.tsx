import { useId } from "react"
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react"

/**
 * A labelled form field — visual-system.md → "Fields".
 *
 * Label in `eyebrow` mono, input on `--ground-surface` behind a
 * `--rule-control` hairline, help text in `meta` mono beneath it. Focus
 * promotes the border to `--rule-strong` and changes **nothing else**: no
 * ring, no shadow. The caret is `--accent`.
 *
 * The password rule — a password field's value is Mono, every other field's is
 * Sans — is carried by `field.css`'s `[type="password"]` selector rather than
 * by a prop, because `type` already says it and a second way of saying it
 * could disagree with the first.
 *
 * `className` is deliberately not accepted: a screen may position a field, it
 * may never repaint one.
 */
export type FieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "id"
> & {
  label: string
  /** `meta` mono beneath the input. Said before the fact, not after it. */
  help?: string
}

export function Field({ label, help, ...rest }: FieldProps) {
  const id = useId()
  const helpId = `${id}-help`

  return (
    <div className="field">
      <label className="field-label type-eyebrow" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field-input type-body"
        aria-describedby={help ? helpId : undefined}
        {...rest}
      />
      {help ? (
        <p className="field-help type-meta" id={helpId}>
          {help}
        </p>
      ) : null}
    </div>
  )
}

export type SelectFieldOption = { value: string; label: string }

/**
 * The same field, choosing from a closed set instead of typing.
 *
 * It is not the segmented control: that one is spoken for — "used once, for
 * course selection" — and choosing a week start is not choosing a course.
 */
export type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "id" | "children"
> & {
  label: string
  help?: string
  options: readonly SelectFieldOption[]
}

export function SelectField({
  label,
  help,
  options,
  ...rest
}: SelectFieldProps) {
  const id = useId()
  const helpId = `${id}-help`

  return (
    <div className="field">
      <label className="field-label type-eyebrow" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="field-select type-body"
        aria-describedby={help ? helpId : undefined}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? (
        <p className="field-help type-meta" id={helpId}>
          {help}
        </p>
      ) : null}
    </div>
  )
}
