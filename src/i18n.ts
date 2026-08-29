import { createContext } from "react"

export type Locale = "en" | "es"

type Entry = { en: string; es: string }

// String table — every key must have both languages; a missing locale is a tsc error.
// §12.3: ~150 strings, both locales ship in the bundle.
// Sidebar strings are the worked example (#22). All other screens follow in #23.
export const strings = {
  // --- Sidebar nav ---
  thisWeek:    { en: "This week",    es: "Esta semana" },
  nextWeek:    { en: "Next week",    es: "La semana que viene" },
  dishes:      { en: "Dishes",       es: "Platillos" },
  history:     { en: "History",      es: "Historial" },
  accounts:    { en: "Accounts",     es: "Integrantes" },
  signOut:     { en: "Sign out",     es: "Cerrar sesión" },
} as const satisfies Record<string, Entry>

export type StringKey = keyof typeof strings

export function t(locale: Locale, key: StringKey): string {
  return strings[key][locale]
}

// Replaces {name}-style placeholders. If interpolation + plural branching ever
// grows past ~10 lines here, revisit the decision to hand-roll (§12.3, ADR-0001).
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

export const LocaleContext = createContext<Locale>("es")
