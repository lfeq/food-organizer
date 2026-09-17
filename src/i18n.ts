import { createContext } from "react"

export type Locale = "en" | "es"

type Entry = { en: string; es: string }

export const strings = {
  // --- Navigation ---
  // The product's own name. It is a proper noun and is not translated, but it
  // still lives here: the invariant worth keeping is that no visible string is
  // written into JSX, not that every string differs between locales.
  brand:       { en: "Food Organizer", es: "Food Organizer" },
  thisWeek:    { en: "This week",    es: "Esta semana" },
  // `Next week` is no longer a destination (SPEC.md §11.1). The key stays for
  // the week stepper's forward affordance on the plan screen.
  nextWeek:    { en: "Next week",    es: "La semana que viene" },
  dishes:      { en: "Dishes",       es: "Platillos" },
  history:     { en: "History",      es: "Historial" },
  accounts:    { en: "Accounts",     es: "Integrantes" },
  settings:    { en: "Settings",     es: "Configuración" },
  signOut:     { en: "Sign out",     es: "Cerrar sesión" },
  // The tab bar's two labels that are not a sidebar item's: the week screen is
  // `Plan` on a four-cell bar, and `More` is the drawer, not a destination.
  navPlan:     { en: "Plan",         es: "Plan" },
  navMore:     { en: "More",         es: "Más" },
  // Locale tags, deliberately identical in both locales: the switcher names
  // the languages it switches to, so it must read the same whichever one is on.
  localeEn:    { en: "EN",           es: "EN" },
  localeEs:    { en: "ES",           es: "ES" },

  // --- Common UI ---
  cancel:      { en: "Cancel",       es: "Cancelar" },
  // A sheet's dismiss word depends on what it holds: `Cancel` where work would
  // be abandoned, `Close` where nothing is at stake (the `More` sheet).
  closeBtn:    { en: "Close",        es: "Cerrar" },
  save:        { en: "Save",         es: "Guardar" },
  add:         { en: "Add",          es: "Agregar" },
  editBtn:     { en: "Edit",         es: "Editar" },
  deleteBtn:   { en: "Delete",       es: "Eliminar" },
  nameLabel:   { en: "Name",         es: "Nombre" },
  passwordLabel: { en: "Password",   es: "Contraseña" },
  usernameLabel: { en: "Username",   es: "Nombre de usuario" },
  createBtn:   { en: "Create",       es: "Crear" },
  errGeneric:  { en: "Something went wrong. Try again.", es: "Algo salió mal. Inténtalo de nuevo." },

  // --- Course names singular ---
  courseSoup:  { en: "Soup",         es: "Sopa" },
  courseSide:  { en: "Side",         es: "Guarnición" },
  courseMain:  { en: "Main",         es: "Fuerte" },

  // --- Course names plural (for catalogue headers & banners) ---
  courseSoupPlural: { en: "Soups",   es: "Sopas" },
  courseSidePlural: { en: "Sides",   es: "Guarniciones" },
  courseMainPlural: { en: "Mains",   es: "Fuertes" },

  // --- Plan screen ---
  planGenerate:     { en: "Generate week",               es: "Generar semana" },
  planRegenerate:   { en: "Regenerate week",             es: "Regenerar semana" },
  planPastReadOnly: { en: "Read only",                   es: "Solo lectura" },
  planRerollDay:    { en: "↻ Reroll day",                es: "↻ Cambiar día" },
  planRerollIcon:   { en: "↻",                           es: "↻" },
  planToday:        { en: "today",                       es: "hoy" },
  planNoWeek:       { en: "No plan for this week yet.",  es: "Sin plan para esta semana todavía." },
  // The week stepper. The arrow is text riding the word and trailing the
  // direction of travel — never an icon asset, and never the whole control:
  // a bare `→` would have to carry "next *week*" on its own.
  planStepNext:     { en: "Next week →",                 es: "La semana que viene →" },
  planStepThis:     { en: "← This week",                 es: "← Esta semana" },
  // The Notice's two messages. Each sentence states only what is true; the
  // call to action is `planNoticeAction`, rendered as the Notice's own
  // underlined link, so no sentence spells the fix out in prose as well.
  planRepeatDish:    { en: "{dish} repeats this week.",    es: "{dish} se repite esta semana." },
  planRepeatCourses: { en: "{courses} repeat this week.",  es: "{courses} se repiten esta semana." },
  planNoticeRepeatTitle: { en: "This week repeats a dish", es: "Esta semana repite un platillo" },
  planNoticeShortTitle:  { en: "Not enough dishes",        es: "Faltan platillos" },
  planNoticeShort:       { en: "{courses} hold too few dishes to fill a week without repeating one.", es: "{courses} tienen muy pocos platillos para llenar una semana sin repetir alguno." },
  planNoticeEmptyTitle:  { en: "This week cannot be generated", es: "No se puede generar esta semana" },
  planNoticeEmpty:       { en: "{courses} hold no dishes, so no week can be drawn.", es: "{courses} no tienen platillos, así que no se puede generar la semana." },
  planNoticeAction:      { en: "Add dishes",               es: "Agregar platillos" },
  planRegenTitle:   { en: "Regenerate this week?",       es: "¿Regenerar esta semana?" },
  planRegenNotice:  { en: "The days still ahead will be redrawn from the catalogue. This cannot be undone.", es: "Los días que faltan se volverán a sacar del catálogo. Esta acción no se puede deshacer." },
  planErrEmptyCourse:  { en: "Add at least one dish before generating: {courses}", es: "Agrega al menos un platillo antes de generar: {courses}" },
  planErrNotWritable:  { en: "Only the current and next week can be generated.", es: "Solo se puede generar el plan de la semana actual y la siguiente." },
  planErrDayElapsed:   { en: "That day has already passed and can no longer be changed.", es: "Ese día ya pasó y no se puede cambiar." },
  planErrRerollFailed: { en: "Reroll failed. Try again.", es: "No se pudo cambiar el día. Inténtalo de nuevo." },

  // --- Dishes screen ---
  dishesH1:        { en: "Dishes",                       es: "Platillos" },
  dishesAddBtn:    { en: "+ Add dish",                   es: "+ Agregar platillo" },
  dishRemovedMember: { en: "removed member",             es: "miembro eliminado" },
  // Adding is course-neutral: the course is chosen inside the form, in the one
  // segmented control, so this title carries no `{course}` interpolation
  // (SPEC.md §11.3, visual-system.md → "The dish catalogue").
  dishAddTitle:    { en: "Add dish",                     es: "Agregar platillo" },
  dishEditTitle:   { en: "Edit dish",                    es: "Editar platillo" },
  dishEditNotice:  { en: "Renaming a dish updates the catalogue and every future plan, but leaves past weeks unchanged.", es: "Renombrar un platillo actualiza el catálogo y los planes futuros, pero no modifica las semanas pasadas." },
  dishDeleteTitle: { en: "Delete \"{name}\"?",           es: "¿Eliminar \"{name}\"?" },
  dishDeleteNotice: { en: "Past weeks keep this dish — only future plans are affected.", es: "Las semanas pasadas conservan este platillo — solo los planes futuros se ven afectados." },
  dishErrNameTaken: { en: "A dish with that name already exists in this course.", es: "Ya existe un platillo con ese nombre en este curso." },
  // The row's `···` is an unlabelled control, so it needs an accessible name,
  // and the name has to say which row it belongs to.
  dishRowActions:  { en: "Actions for {name}",           es: "Acciones para {name}" },
  dishAddedBy:     { en: "added by {name}",              es: "agregado por {name}" },
  // The field label above the form's segmented control — the only place in the
  // app a course is set.
  dishCourseLabel: { en: "Course",                       es: "Curso" },
  // The chips. `All` comes first and is selected by default, so the catalogue
  // opens whole and the courses narrow it. The count is part of the label.
  dishesChipAll:   { en: "All",                          es: "Todos" },
  dishesChipLabel: { en: "{label} {count}",              es: "{label} {count}" },
  // The two empty lines. Which one shows depends on the selected chip: with
  // `All` the catalogue is empty, with a course chip only that course is.
  dishesEmptyAll:    { en: "The catalogue has no dishes yet.", es: "El catálogo aún no tiene platillos." },
  dishesEmptyCourse: { en: "No dishes in {course} yet.",  es: "Aún no hay platillos en {course}." },

  // --- History screen ---
  historyH1:   { en: "History",              es: "Historial" },
  // The empty line says that no week has been lived yet — the absence itself,
  // not the reason for it (visual-system.md → "The empty line").
  historyNone: { en: "No week has been lived yet.", es: "Aún no se ha vivido ninguna semana." },

  // --- Accounts screen ---
  accountsH1:          { en: "Accounts",         es: "Integrantes" },
  accountsAddMember:   { en: "Add member",        es: "Agregar miembro" },
  accountsColUsername: { en: "Username",          es: "Nombre de usuario" },
  accountsColRole:     { en: "Role",              es: "Rol" },
  accountsColStatus:   { en: "Status",            es: "Estado" },
  accountsColActions:  { en: "Actions",           es: "Acciones" },
  accountsYou:         { en: "(you)",             es: "(tú)" },
  accountsRoleAdmin:   { en: "admin",             es: "administrador" },
  accountsRoleMember:  { en: "member",            es: "miembro" },
  accountsMustChange:  { en: "must change password", es: "debe cambiar contraseña" },
  accountsLastAdmin:   { en: "Last admin",        es: "Último administrador" },
  accountsMakeMember:  { en: "Make member",       es: "Hacer miembro" },
  accountsMakeAdmin:   { en: "Make admin",        es: "Hacer administrador" },
  accountsResetPw:     { en: "Reset password",    es: "Restablecer contraseña" },
  accountsRemoveBtn:   { en: "Remove",            es: "Eliminar" },
  instanceSettingsTitle: { en: "Instance settings", es: "Configuración" },
  settingsWeekStart:   { en: "Week start",        es: "Inicio de semana" },
  settingsTimezone:    { en: "Timezone",          es: "Zona horaria" },
  settingsDisplayName: { en: "Display name",      es: "Nombre del hogar" },
  settingsDisplayNamePlaceholder: { en: "e.g. Casa Hernández", es: "ej. Casa Hernández" },
  settingsSave:        { en: "Save settings",     es: "Guardar configuración" },
  settingsLockedReason: { en: "(locked — a plan already exists)", es: "(bloqueado — ya existe un plan)" },
  accountsCreateTitle:  { en: "Add member",       es: "Agregar miembro" },
  accountsCreateNotice: { en: "A temporary password will be generated for you to share with them. They must change it on first login.", es: "Se generará una contraseña temporal para compartirla. El nuevo miembro deberá cambiarla en su primer inicio de sesión." },
  accountsCreatedTitle: { en: "Member \"{username}\" created", es: "Miembro \"{username}\" creado" },
  accountsResetDoneTitle: { en: "Password reset for \"{username}\"", es: "Contraseña restablecida para \"{username}\"" },
  accountsPasswordNotice: { en: "Share this temporary password with them. It will not be shown again. They must change it on first login.", es: "Comparte esta contraseña temporal. No se mostrará de nuevo. Deberán cambiarla en su primer inicio de sesión." },
  accountsDoneBtn:     { en: "Done — I have noted the password", es: "Listo — ya tomé nota de la contraseña" },
  accountsResetTitle:  { en: "Reset password for \"{username}\"?", es: "¿Restablecer contraseña de \"{username}\"?" },
  accountsResetNotice: { en: "A new temporary password will be generated. Their current sessions will be signed out, and they must change the password on next login.", es: "Se generará una nueva contraseña temporal. Sus sesiones actuales se cerrarán y deberán cambiar la contraseña en el próximo inicio de sesión." },
  accountsRemoveTitle: { en: "Remove \"{username}\"?", es: "¿Eliminar a \"{username}\"?" },
  accountsRemoveNotice: { en: "Their sessions will be signed out. Their dishes stay in the catalogue, and the weeks they generated remain in history.", es: "Sus sesiones se cerrarán. Sus platillos permanecen en el catálogo y las semanas que generó quedan en el historial." },
  accountsRemoveMemberBtn: { en: "Remove member",   es: "Eliminar miembro" },
  accountsErrLastAdmin:       { en: "The instance must keep at least one admin.", es: "La instancia debe conservar al menos un administrador." },
  accountsErrUsernameTaken:   { en: "That username is already taken.", es: "Ese nombre de usuario ya está en uso." },
  accountsErrUsernameInvalid: { en: "Username may only contain letters, digits, - and _.", es: "El nombre de usuario solo puede contener letras, dígitos, - y _." },
  settingsErrFrozen: { en: "Week start cannot change once a plan exists.", es: "El inicio de semana no puede cambiar una vez que existe un plan." },
  exportTitle:       { en: "Export data",         es: "Exportar datos" },
  exportDesc:        { en: "Download a machine-readable backup of the catalogue, all weekly plans, members, and settings. Password hashes are never included.", es: "Descarga una copia de seguridad legible por máquina del catálogo, todos los planes semanales, integrantes y configuración. Las contraseñas nunca se incluyen." },
  exportBtn:         { en: "Download my data",     es: "Descargar mis datos" },
  exportErrFailed:   { en: "Export failed. Try again.", es: "No se pudo exportar. Inténtalo de nuevo." },

  // --- The session screens (sign in, first-run setup, forced password change) ---
  // The three screens carry no navigation chrome, so what little they say has
  // to carry the whole explanation. SPEC.md §11.7.
  sessionSelfHosted:   { en: "Self-hosted instance", es: "Instancia propia" },
  // Said beside both password fields that accept a new password. §7.4 puts the
  // floor at 8 characters; `AUTH_PASSWORD_TOO_SHORT` says the same thing after
  // the fact, and this says it before.
  passwordMinHelp:     { en: "at least 8 characters", es: "al menos 8 caracteres" },

  // --- Login screen ---
  // The host line under the wordmark: what this instance is, and why there is
  // no way in other than an account somebody in the household made.
  loginHostLine:       { en: "Your household runs this instance itself. There is no sign-up and no reset link — ask whoever set it up for an account.", es: "Tu hogar administra esta instancia. No hay registro ni enlace para restablecer la contraseña — pídele una cuenta a quien la configuró." },
  loginSignIn:         { en: "Sign in",          es: "Iniciar sesión" },
  loginSigningIn:      { en: "Signing in…",      es: "Iniciando sesión…" },
  loginErrInvalidCreds: { en: "Incorrect username or password.", es: "Usuario o contraseña incorrectos." },
  loginErrThrottled:   { en: "Too many attempts. Please wait and try again.", es: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
  loginErrDb:          { en: "Database error. Please try again.", es: "Error de base de datos. Inténtalo de nuevo." },

  // --- Setup screen ---
  // Stepped, one question per screen, two steps (SPEC.md §7.4, §11.7). The
  // counter is written upper-case here rather than uppercased in CSS: `meta`
  // mono carries no text-transform, and the words are the indicator.
  setupStepCounter:    { en: "STEP {step} OF {total}", es: "PASO {step} DE {total}" },
  setupAccountTitle:   { en: "Make the admin account", es: "Crea la cuenta de administrador" },
  setupAccountBlurb:   { en: "This one can add everybody else. Pick something you will remember — there is no email on this instance, so there is no reset link.", es: "Esta cuenta puede agregar a todas las demás. Elige algo que vayas a recordar: esta instancia no tiene correo, así que no hay enlace para restablecer la contraseña." },
  setupWeekTitle:      { en: "When does your week start?", es: "¿Cuándo empieza tu semana?" },
  setupWeekBlurb:      { en: "Every plan, every history entry and every “today” is measured from this.", es: "Cada plan, cada entrada del historial y cada “hoy” se miden a partir de esto." },
  setupWeekStartsOn:   { en: "Week starts on",   es: "La semana empieza el" },
  setupTimezone:       { en: "Timezone",          es: "Zona horaria" },
  setupContinue:       { en: "Continue",          es: "Continuar" },
  setupFinishBtn:      { en: "Finish setup",      es: "Terminar configuración" },
  setupSettingUp:      { en: "Setting up…",       es: "Configurando…" },
  setupErrUsernameInvalid: { en: "Username may only contain letters, digits, - and _.", es: "El nombre de usuario solo puede contener letras, dígitos, - y _." },
  setupErrUsernameTaken: { en: "Setup has already been completed.", es: "La configuración ya ha sido completada." },
  setupErrPasswordTooShort: { en: "Password must be at least 8 characters.", es: "La contraseña debe tener al menos 8 caracteres." },
  setupErrDb:          { en: "Database error. Please try again.", es: "Error de base de datos. Inténtalo de nuevo." },

  // --- Change-password screen ---
  changePwTitle:       { en: "Set your password", es: "Elige tu contraseña" },
  changePwSubtitle:    { en: "You must choose a new password before continuing.", es: "Debes elegir una contraseña nueva antes de continuar." },
  changePwNewPw:       { en: "New password",      es: "Nueva contraseña" },
  changePwConfirm:     { en: "Confirm password",  es: "Confirmar contraseña" },
  changePwSetBtn:      { en: "Set password",       es: "Establecer contraseña" },
  changePwErrMismatch: { en: "Passwords do not match.", es: "Las contraseñas no coinciden." },
  changePwErrTooShort: { en: "Password must be at least 8 characters.", es: "La contraseña debe tener al menos 8 caracteres." },
  // Where sign-in puts its host line, this screen says whose session is pinned.
  changePwSignedInAs:  { en: "Signed in as {name}", es: "Sesión iniciada como {name}" },
  changePwNoEmailNote: { en: "There is no email on this instance, so nobody can send you a reset link. If you forget this one, ask an admin to reset it again.", es: "Esta instancia no tiene correo, así que nadie puede enviarte un enlace para restablecer la contraseña. Si la olvidas, pídele a un administrador que la restablezca otra vez." },
} as const satisfies Record<string, Entry>

export type StringKey = keyof typeof strings

export function t(locale: Locale, key: StringKey): string {
  return strings[key][locale]
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  es: "es-MX",
}

export const LocaleContext = createContext<Locale>("es")
