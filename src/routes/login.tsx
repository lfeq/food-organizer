import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { doLogin } from "#/auth-fns"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await doLogin({ data: { username, password } })
      if (result.ok) {
        await router.navigate({ to: "/" })
      } else {
        const messages: Record<string, string> = {
          AUTH_INVALID_CREDENTIALS: "Incorrect username or password.",
          AUTH_THROTTLED: "Too many attempts. Please wait and try again.",
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
        <h1>Food Organizer</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
