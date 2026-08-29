import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { doLogout } from "#/auth-fns"

export const Route = createFileRoute("/")({
  component: PlanPage,
})

function PlanPage() {
  const { authState } = Route.useRouteContext()
  const member = authState.member!
  const router = useRouter()

  async function handleLogout() {
    await doLogout()
    await router.navigate({ to: "/login" })
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">Food Organizer</span>
        </div>
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item sidebar-nav-item--active">This week</li>
          <li className="sidebar-nav-item sidebar-nav-item--disabled">Next week</li>
          <li className="sidebar-nav-item">
              <Link to="/dishes" className="sidebar-nav-link">Dishes</Link>
            </li>
          <li className="sidebar-nav-item sidebar-nav-item--disabled">History</li>
          {member.role === "admin" && (
            <li className="sidebar-nav-item">
              <Link to="/accounts" className="sidebar-nav-link">Accounts</Link>
            </li>
          )}
        </ul>
        <div className="sidebar-bottom">
          <span className="sidebar-member">{member.username}</span>
          <button className="sidebar-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </nav>
      <main className="main-content">
        <h1>This week</h1>
        <p>Meal plan coming soon.</p>
      </main>
    </div>
  )
}
