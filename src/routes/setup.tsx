import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { doSetup } from "#/auth-fns"

export const Route = createFileRoute("/setup")({
  component: SetupPage,
})

function SetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [weekStart, setWeekStart] = useState(0)
  const [timezone, setTimezone] = useState("America/Mexico_City")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await doSetup({
        data: {
          username,
          password,
          weekStartDow: weekStart,
          timezone,
        },
      })
      if (result.ok) {
        await router.navigate({ to: "/" })
      } else {
        const messages: Record<string, string> = {
          USERNAME_INVALID:
            "Username may only contain letters, digits, - and _.",
          USERNAME_TAKEN: "Setup has already been completed.",
          AUTH_PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
          DB_UNREACHABLE: "Database error. Please try again.",
        }
        setError(messages[result.code] ?? result.code)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1>Welcome to Food Organizer</h1>
        <p className="setup-subtitle">
          Create the household account to get started.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, digits, - and _ only"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            Week starts on
            <select
              value={weekStart}
              onChange={(e) => setWeekStart(Number(e.target.value))}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
            </select>
          </label>
          <label>
            Timezone
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Setting up…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  )
}
