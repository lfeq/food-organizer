import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState, useContext } from "react"
import { Badge } from "#/components/badge"
import { Button } from "#/components/button"
import { Field } from "#/components/field"
import { InlineError } from "#/components/inline-error"
import { MessageRegion } from "#/components/message-region"
import { Navigation } from "#/components/navigation"
import { RowActions, type RowAction } from "#/components/row-actions"
import { Sheet, SheetAction, SheetActions } from "#/components/sheet"
import { Tag } from "#/components/tag"
import { LocaleContext, t, interpolate, type StringKey } from "#/i18n"
import {
  listMembers,
  createMember,
  resetMemberPassword,
  removeMember,
  setMemberRole,
  type Member,
} from "#/accounts-fns"
import type { ResultCode } from "#/result-codes"

/**
 * Accounts — the member list, and nothing else.
 *
 * `Instance settings` and `Export data` left for `/settings` (SPEC.md §11.5):
 * a member list and an instance's week start are not two views of one thing.
 * One screen, one subject — so this loader asks for members alone.
 */
/**
 * Every refusal this screen can be handed, said in the household's own
 * language. The same shape every route uses: a `Partial<Record<…>>` map read
 * by code, with `errGeneric` for a code that has no sentence of its own —
 * which is what `DB_UNREACHABLE` wants, and nothing else should reach.
 */
const CREATE_ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  USERNAME_TAKEN: "accountsErrUsernameTaken",
  USERNAME_INVALID: "accountsErrUsernameInvalid",
}

/**
 * `Remove` and the role control share a map because they share a refusal: the
 * last admin. It is the database floor answering a race rather than the
 * everyday path — both controls are disabled before it can happen — and it is
 * still translated, because a refusal the household cannot read is not one.
 */
const MEMBER_ERROR_KEY: Partial<Record<ResultCode, StringKey>> = {
  LAST_ADMIN: "accountsErrLastAdmin",
}

export const Route = createFileRoute("/accounts")({
  beforeLoad: ({ context }) => {
    if (context.authState.member?.role !== "admin") {
      throw redirect({ to: "/" })
    }
  },
  loader: () => listMembers(),
  component: AccountsPage,
})

/**
 * Every sheet this screen can open, and nothing else. The list stays mounted
 * behind all of them — a sheet dims the screen, it does not replace it.
 *
 * `actions` is what a member row's `···` opens below `900px`; above it the
 * same three actions are inline and this state is never reached.
 */
type SheetState =
  | { kind: "none" }
  | { kind: "actions"; member: Member }
  | { kind: "create" }
  | { kind: "created"; username: string; tempPassword: string }
  | { kind: "reset"; member: Member }
  | { kind: "reset-done"; username: string; tempPassword: string }
  | { kind: "remove"; member: Member }

function AccountsPage() {
  const { authState } = Route.useRouteContext()
  const members = Route.useLoaderData()
  const router = useRouter()
  const locale = useContext(LocaleContext)
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const adminCount = members.filter((m) => m.role === "admin").length
  const me = authState.member!

  function open(next: SheetState) {
    setSheet(next)
    setError(null)
  }

  function close() {
    setSheet({ kind: "none" })
    setError(null)
  }

  async function handleCreate(username: string) {
    setBusy(true)
    setError(null)
    const res = await createMember({ data: { username } })
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, CREATE_ERROR_KEY[res.code] ?? "errGeneric"))
      return
    }
    // The generated password is shown **once** (SPEC.md §7.5): straight from
    // the create sheet into the reveal sheet, never back to the list first.
    setSheet({ kind: "created", username: res.data.username, tempPassword: res.data.tempPassword })
    await router.invalidate()
  }

  async function handleReset(member: Member) {
    setBusy(true)
    setError(null)
    const res = await resetMemberPassword({ data: { memberId: member.id } })
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, "errGeneric"))
      return
    }
    setSheet({ kind: "reset-done", username: member.username, tempPassword: res.data.tempPassword })
    await router.invalidate()
  }

  /**
   * The last admin's `Remove` is disabled, so `LAST_ADMIN` is the database
   * floor answering a race rather than the everyday path — it is still
   * translated, because a refusal the household cannot read is not a refusal.
   */
  async function handleRemove(member: Member) {
    setBusy(true)
    setError(null)
    const res = await removeMember({ data: { memberId: member.id } })
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, MEMBER_ERROR_KEY[res.code] ?? "errGeneric"))
      return
    }
    close()
    await router.invalidate()
    if (member.id === me.id) {
      await router.navigate({ to: "/login" })
    }
  }

  async function handleSetRole(member: Member, role: "admin" | "member") {
    setBusy(true)
    setError(null)
    const res = await setMemberRole({ data: { memberId: member.id, role } })
    setBusy(false)
    if (!res.ok) {
      setError(t(locale, MEMBER_ERROR_KEY[res.code] ?? "errGeneric"))
      return
    }
    close()
    await router.invalidate()
  }

  /**
   * The three verbs a member row carries, in the order both forms draw them:
   * reset a password, change a role, remove the account — destructive last.
   *
   * On the last remaining admin the role control and `Remove` are unavailable
   * (an instance never has fewer than one admin, CONTEXT.md), and they are
   * **disabled with their own labels intact**; `Last admin` is the reason
   * beside them, not a replacement for what they say.
   */
  function actionsFor(member: Member, isLastAdmin: boolean): readonly RowAction[] {
    return [
      {
        label: t(locale, "accountsResetPw"),
        disabled: busy,
        onClick: () => open({ kind: "reset", member }),
      },
      {
        label: t(
          locale,
          member.role === "admin" ? "accountsMakeMember" : "accountsMakeAdmin",
        ),
        disabled: busy || isLastAdmin,
        onClick: () =>
          void handleSetRole(member, member.role === "admin" ? "member" : "admin"),
      },
      {
        label: t(locale, "accountsRemoveBtn"),
        tone: "destructive",
        disabled: busy || isLastAdmin,
        onClick: () => open({ kind: "remove", member }),
      },
    ]
  }

  const openMember =
    sheet.kind === "actions" || sheet.kind === "reset" || sheet.kind === "remove"
      ? sheet.member
      : null
  const openMemberIsLastAdmin =
    openMember !== null && openMember.role === "admin" && adminCount <= 1

  return (
    <div className="screen-shell">
      <Navigation />

      <main className="screen-shell-main">
        <div className="accounts-header">
          <h1 className="accounts-title type-title-page">{t(locale, "accountsH1")}</h1>
          {/* Dark, not green: adding a member acts on accounts. */}
          <Button
            variant="primary-catalogue"
            shape="pill"
            onClick={() => open({ kind: "create" })}
          >
            {t(locale, "accountsAddMember")}
          </Button>
        </div>

        {/*
          A refusal raised by a control that opens no sheet — a role change —
          has nowhere else to go. While a sheet is open the same string is
          shown inside it instead, so it is never said twice.
        */}
        <MessageRegion>
          {error && sheet.kind === "none" ? <InlineError>{error}</InlineError> : null}
        </MessageRegion>

        {/*
          One list block at both widths. There is no table and no column of
          tags: a four-column `Member · Role · Status ·` actions table measures
          ≈801px in Spanish at the threshold against the 684px the content
          column offers, and a column is the expensive way to show a tag —
          as wide as its widest tag on every row. Role and status fold under
          the username, where the phone already puts them.
          visual-system.md → "Bilingual fit", "The accounts screen".
        */}
        <div className="screen-shell-list">
          <ul className="list-block">
            {members.map((m) => {
              const isLastAdmin = m.role === "admin" && adminCount <= 1
              const showsBadge = m.role === "admin"
              const showsTag = m.must_change_password
              return (
                <li key={m.id} className="list-block-row">
                  <div className="list-block-row-main">
                    <span className="list-block-row-name type-item-name">
                      {m.username}
                      {m.id === me.id && (
                        <span className="accounts-you type-meta">
                          {t(locale, "accountsYou")}
                        </span>
                      )}
                    </span>
                    {/*
                      Filled badge for `ADMIN`, outlined tag for a state the
                      member is in. Everyone else carries nothing: with two
                      roles a `MEMBER` tag on most rows is noise, and absence
                      already says it. No `last seen` line — there is no such
                      data (visual-system.md, rule 25).
                    */}
                    {(showsBadge || showsTag) && (
                      <span className="accounts-tags">
                        {showsBadge && <Badge>{t(locale, "accountsRoleAdmin")}</Badge>}
                        {showsTag && <Tag>{t(locale, "accountsMustChange")}</Tag>}
                      </span>
                    )}
                  </div>

                  <RowActions
                    menuLabel={interpolate(t(locale, "accountsRowActions"), {
                      username: m.username,
                    })}
                    onOpenMenu={() => open({ kind: "actions", member: m })}
                    actions={actionsFor(m, isLastAdmin)}
                    reason={isLastAdmin ? t(locale, "accountsLastAdmin") : undefined}
                  />
                </li>
              )
            })}
          </ul>
        </div>

        {/*
          The admin role's reach, said once on the screen it is about, on a
          ground rather than in the message region: it is not a message, it
          carries no amber, no `!` and no action.
        */}
        <p className="accounts-note sunken-note type-body-sm">
          {t(locale, "accountsAdminNote")}
        </p>
      </main>

      {sheet.kind === "actions" && openMember && (
        <Sheet title={openMember.username} dismiss="cancel" onDismiss={close}>
          <SheetActions>
            {actionsFor(openMember, openMemberIsLastAdmin).map((action) => (
              <SheetAction
                key={action.label}
                tone={action.tone}
                disabled={action.disabled}
                note={
                  action.disabled && openMemberIsLastAdmin
                    ? t(locale, "accountsLastAdmin")
                    : undefined
                }
                onClick={action.onClick}
              >
                {action.label}
              </SheetAction>
            ))}
          </SheetActions>
        </Sheet>
      )}

      {sheet.kind === "create" && (
        <Sheet title={t(locale, "accountsCreateTitle")} dismiss="cancel" onDismiss={close}>
          <CreateForm busy={busy} error={error} onSubmit={handleCreate} />
        </Sheet>
      )}

      {(sheet.kind === "created" || sheet.kind === "reset-done") && (
        <Sheet
          title={interpolate(
            t(locale, sheet.kind === "created" ? "accountsCreatedTitle" : "accountsResetDoneTitle"),
            { username: sheet.username },
          )}
          dismiss="close"
          onDismiss={close}
        >
          <p className="sunken-note type-body-sm">{t(locale, "accountsPasswordNotice")}</p>
          {/* The app's own generated string, so Mono — and selectable whole. */}
          <p className="accounts-password type-note">{sheet.tempPassword}</p>
          <Button variant="primary-catalogue" fullWidth onClick={close}>
            {t(locale, "accountsDoneBtn")}
          </Button>
        </Sheet>
      )}

      {sheet.kind === "reset" && (
        <Sheet
          title={interpolate(t(locale, "accountsResetTitle"), {
            username: sheet.member.username,
          })}
          dismiss="cancel"
          onDismiss={close}
        >
          <p className="sunken-note type-body-sm">{t(locale, "accountsResetNotice")}</p>
          {error && <InlineError>{error}</InlineError>}
          <Button
            variant="primary-catalogue"
            fullWidth
            disabled={busy}
            onClick={() => void handleReset(sheet.member)}
          >
            {t(locale, "accountsResetPw")}
          </Button>
        </Sheet>
      )}

      {sheet.kind === "remove" && (
        <Sheet
          title={interpolate(t(locale, "accountsRemoveTitle"), {
            username: sheet.member.username,
          })}
          dismiss="cancel"
          onDismiss={close}
        >
          <p className="sunken-note type-body-sm">{t(locale, "accountsRemoveNotice")}</p>
          {error && <InlineError>{error}</InlineError>}
          <Button
            variant="destructive"
            fullWidth
            disabled={busy}
            onClick={() => void handleRemove(sheet.member)}
          >
            {t(locale, "accountsRemoveMemberBtn")}
          </Button>
        </Sheet>
      )}
    </div>
  )
}

/**
 * Adding a member: a username, and a promise about the password.
 *
 * The notice is said **before** the fact rather than after it — the admin has
 * to know a temporary password is coming and that they will have to pass it
 * on themselves, because there is no email to fall back on.
 */
function CreateForm({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean
  error: string | null
  onSubmit: (username: string) => void
}) {
  const locale = useContext(LocaleContext)
  const [username, setUsername] = useState("")

  return (
    <div className="accounts-form">
      <Field
        label={t(locale, "usernameLabel")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="off"
        autoFocus
      />

      <p className="sunken-note type-body-sm">{t(locale, "accountsCreateNotice")}</p>

      {error && <InlineError>{error}</InlineError>}

      <Button
        variant="primary-catalogue"
        fullWidth
        disabled={busy || !username.trim()}
        onClick={() => onSubmit(username)}
      >
        {t(locale, "createBtn")}
      </Button>
    </div>
  )
}
