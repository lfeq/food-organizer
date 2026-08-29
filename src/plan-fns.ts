import { createServerFn } from "@tanstack/react-start"
import { Effect, Exit } from "effect"
import { PgClient } from "@effect/sql-pg"
import { uuidv7 } from "uuidv7"
import { Runtime } from "#/runtime.server"
import { ok, err, type Result } from "#/result-codes"

export type Course = "soup" | "side" | "main"

export type SlotRow = {
  course: Course
  dish_name: string
  dish_id: string | null
}

export type PlanDayRow = {
  id: string
  day_date: string  // ISO date string YYYY-MM-DD
  slots: SlotRow[]
}

export type WeekPlan = {
  id: string
  week_start: string  // ISO date string YYYY-MM-DD
  days: PlanDayRow[]
}

export type PlanSettings = {
  week_start_dow: number
  timezone: string
}

/** Returns settings needed for week calculation. */
export const getPlanSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlanSettings> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.map(
          sql<PlanSettings>`SELECT week_start_dow, timezone FROM settings LIMIT 1`,
          (rows) => rows[0]
        )
      )
    )
    if (Exit.isSuccess(result) && result.value) return result.value
    return { week_start_dow: 0, timezone: "America/Mexico_City" }
  }
)

/** Returns the plan for the given week_start (YYYY-MM-DD), or null if none exists. */
export const getWeekPlan = createServerFn({ method: "GET" })
  .validator((data: { weekStart: string }) => data)
  .handler(async ({ data }): Promise<WeekPlan | null> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const plans = yield* sql<{ id: string; week_start: string }>`
            SELECT id, week_start::text AS week_start
            FROM weekly_plan
            WHERE week_start = ${data.weekStart}::date
          `
          if (plans.length === 0) return null

          const plan = plans[0]

          const days = yield* sql<{ id: string; day_date: string }>`
            SELECT id, day_date::text AS day_date
            FROM plan_day
            WHERE weekly_plan_id = ${plan.id}
            ORDER BY day_date
          `

          const dayIds = days.map((d) => d.id)
          const slots = dayIds.length > 0
            ? yield* sql<{ plan_day_id: string; course: Course; dish_name: string; dish_id: string | null }>`
                SELECT plan_day_id, course, dish_name, dish_id
                FROM slot
                WHERE plan_day_id IN ${sql.in(dayIds)}
                ORDER BY plan_day_id, course
              `
            : []

          const planDays: PlanDayRow[] = days.map((d) => ({
            id: d.id,
            day_date: d.day_date,
            slots: slots
              .filter((s) => s.plan_day_id === d.id)
              .map((s) => ({ course: s.course, dish_name: s.dish_name, dish_id: s.dish_id })),
          }))

          return { id: plan.id, week_start: plan.week_start, days: planDays } as WeekPlan
        })
      )
    )
    if (Exit.isSuccess(result)) return result.value
    return null
  })

/** Generates (or regenerates) the plan for the given week. */
export const generateWeek = createServerFn({ method: "POST" })
  .validator((data: { weekStart: string }) => data)
  .handler(async ({ data }): Promise<Result<WeekPlan>> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          // Verify the week is writable server-side
          const settings = yield* sql<{ week_start_dow: number; timezone: string }>`
            SELECT week_start_dow, timezone FROM settings LIMIT 1
          `
          if (settings.length === 0) return err("DB_UNREACHABLE") as Result<WeekPlan>

          const { week_start_dow, timezone } = settings[0]

          // Compute current week start server-side
          const nowRow = yield* sql<{ today: string }>`
            SELECT (now() AT TIME ZONE ${timezone})::date::text AS today
          `
          const todayStr = nowRow[0].today
          const todayDate = new Date(todayStr + "T00:00:00")
          const todayDow = todayDate.getDay()
          const daysBack = (todayDow - week_start_dow + 7) % 7
          const currentWeekStart = new Date(todayDate)
          currentWeekStart.setDate(todayDate.getDate() - daysBack)
          const nextWeekStart = new Date(currentWeekStart)
          nextWeekStart.setDate(currentWeekStart.getDate() + 7)

          const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
          const currentWeekStr = toDateStr(currentWeekStart)
          const nextWeekStr = toDateStr(nextWeekStart)

          if (data.weekStart !== currentWeekStr && data.weekStart !== nextWeekStr) {
            return err("WEEK_NOT_WRITABLE") as Result<WeekPlan>
          }

          // Validate week_start matches week_start_dow
          const reqDate = new Date(data.weekStart + "T00:00:00")
          if (reqDate.getDay() !== week_start_dow) {
            return err("WEEK_NOT_WRITABLE") as Result<WeekPlan>
          }

          // Load all dishes per course
          const dishes = yield* sql<{ id: string; name: string; course: Course }>`
            SELECT id, name, course FROM dish ORDER BY course, name
          `

          const byCourse: Record<Course, Array<{ id: string; name: string }>> = {
            soup: [],
            side: [],
            main: [],
          }
          for (const d of dishes) {
            byCourse[d.course].push({ id: d.id, name: d.name })
          }

          // Validate no empty course
          const emptyCourses: Course[] = []
          const courses: Course[] = ["soup", "side", "main"]
          for (const c of courses) {
            if (byCourse[c].length === 0) emptyCourses.push(c)
          }
          if (emptyCourses.length > 0) {
            return err("GENERATE_EMPTY_COURSE", emptyCourses.join(",")) as Result<WeekPlan>
          }

          // Draw 7 dishes per course without replacement (cycling if < 7)
          const drawSeven = (pool: Array<{ id: string; name: string }>) => {
            const shuffled = [...pool].sort(() => Math.random() - 0.5)
            const result: Array<{ id: string; name: string }> = []
            while (result.length < 7) {
              result.push(...shuffled.slice(0, 7 - result.length))
            }
            return result.slice(0, 7)
          }

          const drawnSoup = drawSeven(byCourse.soup)
          const drawnSide = drawSeven(byCourse.side)
          const drawnMain = drawSeven(byCourse.main)

          // Delete existing plan for this week if any (overwrite in place)
          yield* sql`DELETE FROM weekly_plan WHERE week_start = ${data.weekStart}::date`

          // Insert plan + days + slots in one transaction
          const planId = uuidv7()
          yield* sql`
            INSERT INTO weekly_plan (id, week_start)
            VALUES (${planId}, ${data.weekStart}::date)
          `

          const planDays: PlanDayRow[] = []
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(reqDate)
            dayDate.setDate(reqDate.getDate() + i)
            const dayDateStr = toDateStr(dayDate)

            const dayId = uuidv7()
            yield* sql`
              INSERT INTO plan_day (id, weekly_plan_id, day_date)
              VALUES (${dayId}, ${planId}, ${dayDateStr}::date)
            `

            const slotRows: SlotRow[] = [
              { course: "soup", dish_name: drawnSoup[i].name, dish_id: drawnSoup[i].id },
              { course: "side", dish_name: drawnSide[i].name, dish_id: drawnSide[i].id },
              { course: "main", dish_name: drawnMain[i].name, dish_id: drawnMain[i].id },
            ]

            for (const slot of slotRows) {
              const slotId = uuidv7()
              yield* sql`
                INSERT INTO slot (id, plan_day_id, course, dish_name, dish_id)
                VALUES (${slotId}, ${dayId}, ${slot.course}, ${slot.dish_name}, ${slot.dish_id})
              `
            }

            planDays.push({ id: dayId, day_date: dayDateStr, slots: slotRows })
          }

          return ok({ id: planId, week_start: data.weekStart, days: planDays }) as Result<WeekPlan>
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

/** Returns which courses repeat in the given week (dish_name appears more than once in a course). */
export const getRepeatingCourses = createServerFn({ method: "GET" })
  .validator((data: { weeklyPlanId: string }) => data)
  .handler(async ({ data }): Promise<Course[]> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.map(
          sql<{ course: Course }>`
            SELECT s.course
            FROM slot s
            JOIN plan_day d ON d.id = s.plan_day_id
            WHERE d.weekly_plan_id = ${data.weeklyPlanId}
            GROUP BY s.course, s.dish_name
            HAVING COUNT(*) > 1
          `,
          (rows) => [...new Set(rows.map((r) => r.course))]
        )
      )
    )
    if (Exit.isSuccess(result)) return result.value
    return []
  })
