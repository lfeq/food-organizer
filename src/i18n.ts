import { createContext } from "react"

export type Locale = "en" | "es"

type Entry = { en: string; es: string }

export const strings = {
  // --- Sidebar nav ---
  thisWeek:    { en: "This week",    es: "Esta semana" },
  nextWeek:    { en: "Next week",    es: "La semana que viene" },
  dishes:      { en: "Dishes",       es: "Platillos" },
  history:     { en: "History",      es: "Historial" },
  accounts:    { en: "Accounts",     es: "Integrantes" },
  signOut:     { en: "Sign out",     es: "Cerrar sesión" },

  // --- Common UI ---
  cancel:      { en: "Cancel",       es: "Cancelar" },
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
  courseSide:  { en: "Side",         es: "Acompañamiento" },
  courseMain:  { en: "Main",         es: "Fuerte" },

  // --- Course names plural (for catalogue headers & banners) ---
  courseSoupPlural: { en: "Soups",   es: "Sopas" },
  courseSidePlural: { en: "Sides",   es: "Acompañamientos" },
  courseMainPlural: { en: "Mains",   es: "Fuertes" },

  // --- Plan screen ---
  planGenerate:     { en: "Generate",                    es: "Generar" },
  planRegenerate:   { en: "Regenerate",                  es: "Regenerar" },
  planPastReadOnly: { en: "Past week — read only",       es: "Semana pasada — solo lectura" },
  planRerollDay:    { en: "↻ Reroll day",                es: "↻ Cambiar día" },
  planRerollIcon:   { en: "↻",                           es: "↻" },
  planToday:        { en: "today",                       es: "hoy" },
  planNoWeek:       { en: "No plan for this week yet.",  es: "Sin plan para esta semana todavía." },
  planRepeatBanner: { en: "{course} repeat this week — add more dishes to avoid duplicates.", es: "{course} se repiten esta semana — agrega más platillos para evitar duplicados." },
  planRerollToast:  { en: "A dish now repeats this week — add more dishes to avoid it.", es: "Un platillo se repite esta semana — agrega más platillos para evitarlo." },
  planRegenTitle:   { en: "Regenerate this week?",       es: "¿Regenerar esta semana?" },
  planRegenNotice:  { en: "The current plan will be replaced with a new one drawn from the catalogue. This cannot be undone.", es: "El plan actual será reemplazado con uno nuevo sacado del catálogo. Esta acción no se puede deshacer." },
  planErrEmptyCourse:  { en: "Add at least one dish before generating: {courses}", es: "Agrega al menos un platillo antes de generar: {courses}" },
  planErrNotWritable:  { en: "Only the current and next week can be generated.", es: "Solo se puede generar el plan de la semana actual y la siguiente." },
  planErrRerollFailed: { en: "Reroll failed. Try again.", es: "No se pudo cambiar el día. Inténtalo de nuevo." },

  // --- Dishes screen ---
  dishesH1:        { en: "Dishes",                       es: "Platillos" },
  dishesAddBtn:    { en: "+ Add dish",                   es: "+ Agregar platillo" },
  dishRemovedMember: { en: "removed member",             es: "miembro eliminado" },
  dishAddTitle:    { en: "Add dish — {course}",          es: "Agregar platillo — {course}" },
  dishEditTitle:   { en: "Edit dish",                    es: "Editar platillo" },
  dishEditNotice:  { en: "Renaming a dish updates the catalogue and every future plan, but leaves past weeks unchanged.", es: "Renombrar un platillo actualiza el catálogo y los planes futuros, pero no modifica las semanas pasadas." },
  dishDeleteTitle: { en: "Delete \"{name}\"?",           es: "¿Eliminar \"{name}\"?" },
  dishDeleteNotice: { en: "Past weeks keep this dish — only future plans are affected.", es: "Las semanas pasadas conservan este platillo — solo los planes futuros se ven afectados." },
  dishErrNameTaken: { en: "A dish with that name already exists in this course.", es: "Ya existe un platillo con ese nombre en este curso." },

  // --- History screen ---
  historyH1:   { en: "History",              es: "Historial" },
  historyNone: { en: "No past weeks yet.",   es: "Aún no hay semanas anteriores." },
  historyWeekOf: { en: "Week of {date}",     es: "Semana del {date}" },

  // --- Accounts screen ---
  accountsH1:          { en: "Accounts",         es: "Integrantes" },
  accountsAddMember:   { en: "Add member",        es: "Agregar miembro" },
  accountsColUsername: { en: "Username",          es: "Nombre de usuario" },
  accountsColRole:     { en: "Role",              es: "Rol" },
  accountsColStatus:   { en: "Status",            es: "Estado" },
  accountsColActions:  { en: "Actions",           es: "Acciones" },
  accountsYou:         { en: "(you)",             es: "(tú)" },
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
  accountsErrUsernameTaken:   { en: "That username is already taken.", es: "Ese nombre de usuario ya está en uso." },
  accountsErrUsernameInvalid: { en: "Username may only contain letters, digits, - and _.", es: "El nombre de usuario solo puede contener letras, dígitos, - y _." },
  settingsErrFrozen: { en: "Week start cannot change once a plan exists.", es: "El inicio de semana no puede cambiar una vez que existe un plan." },
  exportTitle:       { en: "Export data",         es: "Exportar datos" },
  exportDesc:        { en: "Download a machine-readable backup of the catalogue, all weekly plans, members, and settings. Password hashes are never included.", es: "Descarga una copia de seguridad legible por máquina del catálogo, todos los planes semanales, integrantes y configuración. Las contraseñas nunca se incluyen." },
  exportBtn:         { en: "Download my data",     es: "Descargar mis datos" },
  exportErrFailed:   { en: "Export failed. Try again.", es: "No se pudo exportar. Inténtalo de nuevo." },

  // --- Login screen ---
  loginSignIn:         { en: "Sign in",          es: "Iniciar sesión" },
  loginSigningIn:      { en: "Signing in…",      es: "Iniciando sesión…" },
  loginErrInvalidCreds: { en: "Incorrect username or password.", es: "Usuario o contraseña incorrectos." },
  loginErrThrottled:   { en: "Too many attempts. Please wait and try again.", es: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
  loginErrDb:          { en: "Database error. Please try again.", es: "Error de base de datos. Inténtalo de nuevo." },

  // --- Setup screen ---
  setupTitle:          { en: "Welcome to Food Organizer", es: "Bienvenido a Food Organizer" },
  setupSubtitle:       { en: "Create the household account to get started.", es: "Crea la cuenta del hogar para empezar." },
  setupWeekStartsOn:   { en: "Week starts on",   es: "La semana empieza el" },
  setupTimezone:       { en: "Timezone",          es: "Zona horaria" },
  setupCreateAccount:  { en: "Create account",    es: "Crear cuenta" },
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
