import { createFileRoute, redirect } from "@tanstack/react-router"
import { getPlanSettings } from "#/plan-fns"

function computeWeekStart(dow: number, refDate: Date): Date {
  const d = new Date(refDate)
  d.setHours(0, 0, 0, 0)
  const daysBack = (d.getDay() - dow + 7) % 7
  d.setDate(d.getDate() - daysBack)
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const Route = createFileRoute("/plan/next")({
  loader: async () => {
    const settings = await getPlanSettings()
    const today = new Date()
    const currentWeekStart = computeWeekStart(settings.week_start_dow, today)
    const nextWeekStart = new Date(currentWeekStart)
    nextWeekStart.setDate(currentWeekStart.getDate() + 7)
    throw redirect({ to: "/plan/$weekStart", params: { weekStart: toDateStr(nextWeekStart) } })
  },
  component: () => null,
})
