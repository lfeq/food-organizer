import { createServerFn } from "@tanstack/react-start"
import { Effect, Exit } from "effect"
import { PgClient } from "@effect/sql-pg"
import { uuidv7 } from "uuidv7"
import { Runtime } from "#/runtime.server"
import { ok, err, errEmptyCourse, type Result } from "#/result-codes"
import { drawN, pickReroll } from "#/generator"
import { addDays, dayOfWeek, generateSplit, weekStartFor } from "#/plan-dates"
import { rerollRefusal } from "#/plan-guards"
import type { Course } from "#/courses"
import type { RepeatingDish } from "#/repeat-notice"

export type { Course } from "#/courses"

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
        // The plan, its days and their slots are written in one transaction:
        // complete or not at all (§9.1).
        sql.withTransaction(
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
            const currentWeekStr = weekStartFor(todayStr, week_start_dow)
            const nextWeekStr = addDays(currentWeekStr, 7)

            if (data.weekStart !== currentWeekStr && data.weekStart !== nextWeekStr) {
              return err("WEEK_NOT_WRITABLE") as Result<WeekPlan>
            }

            // Validate week_start matches week_start_dow
            if (dayOfWeek(data.weekStart) !== week_start_dow) {
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
              return errEmptyCourse(emptyCourses) as Result<WeekPlan>
            }

            // Which days this generate writes, and which it leaves alone. Elapsed
            // plan days are immutable (§6.2): they are preserved untouched and
            // only the days still ahead are drawn (§9.1). `todayStr` above is the
            // only authority on today — the client never supplies it, so a
            // request aimed at an elapsed day is refused whatever the client
            // believes.
            const existingPlans = yield* sql<{ id: string }>`
              SELECT id FROM weekly_plan WHERE week_start = ${data.weekStart}::date
            `
            const planId = existingPlans.length > 0 ? existingPlans[0].id : uuidv7()

            const existingDays = existingPlans.length > 0
              ? yield* sql<{ id: string; day_date: string }>`
                  SELECT id, day_date::text AS day_date
                  FROM plan_day
                  WHERE weekly_plan_id = ${planId}
                  ORDER BY day_date
                `
              : []

            const split = generateSplit(
              data.weekStart,
              todayStr,
              existingDays.map((d) => d.day_date)
            )

            // The dishes preserved days hold count as used, so the redraw avoids
            // them and the no-repeat promise covers the whole week on screen.
            const preservedDayIds = existingDays
              .filter((d) => split.preserved.includes(d.day_date))
              .map((d) => d.id)
            const preservedSlots = preservedDayIds.length > 0
              ? yield* sql<{ plan_day_id: string; course: Course; dish_name: string; dish_id: string | null }>`
                  SELECT plan_day_id, course, dish_name, dish_id
                  FROM slot
                  WHERE plan_day_id IN ${sql.in(preservedDayIds)}
                  ORDER BY plan_day_id, course
                `
              : []

            const usedNames = (course: Course) =>
              new Set(
                preservedSlots.filter((s) => s.course === course).map((s) => s.dish_name as string)
              )

            const n = split.redraw.length
            const drawnSoup = drawN(byCourse.soup, n, usedNames("soup"))
            const drawnSide = drawN(byCourse.side, n, usedNames("side"))
            const drawnMain = drawN(byCourse.main, n, usedNames("main"))

            if (existingPlans.length === 0) {
              yield* sql`
                INSERT INTO weekly_plan (id, week_start)
                VALUES (${planId}, ${data.weekStart}::date)
              `
            }

            // Replace only the days still ahead; slots cascade with their day.
            const discardedDayIds = existingDays
              .filter((d) => split.discarded.includes(d.day_date))
              .map((d) => d.id)
            if (discardedDayIds.length > 0) {
              yield* sql`DELETE FROM plan_day WHERE id IN ${sql.in(discardedDayIds)}`
            }

            const planDays: PlanDayRow[] = existingDays
              .filter((d) => split.preserved.includes(d.day_date))
              .map((d) => ({
                id: d.id,
                day_date: d.day_date,
                slots: preservedSlots
                  .filter((s) => s.plan_day_id === d.id)
                  .map((s) => ({ course: s.course, dish_name: s.dish_name, dish_id: s.dish_id })),
              }))

            for (let i = 0; i < n; i++) {
              const dayDateStr = split.redraw[i]

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

            planDays.sort((a, b) => (a.day_date < b.day_date ? -1 : 1))

            return ok({ id: planId, week_start: data.weekStart, days: planDays }) as Result<WeekPlan>
          })
        )
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

/** Redraws all three courses for one plan day without touching the rest of the week. */
export const rerollDay = createServerFn({ method: "POST" })
  .validator((data: { planDayId: string }) => data)
  .handler(async ({ data }): Promise<Result<{ slots: SlotRow[]; causedRepeat: boolean }>> => {
    type R = Result<{ slots: SlotRow[]; causedRepeat: boolean }>
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          // Load plan_day + its weekly_plan week_start
          const dayRows = yield* sql<{ id: string; day_date: string; weekly_plan_id: string; week_start: string }>`
            SELECT pd.id, pd.day_date::text AS day_date, pd.weekly_plan_id,
                   wp.week_start::text AS week_start
            FROM plan_day pd
            JOIN weekly_plan wp ON wp.id = pd.weekly_plan_id
            WHERE pd.id = ${data.planDayId}
          `
          if (dayRows.length === 0) return err("PLAN_NOT_FOUND") as R

          const dayRow = dayRows[0]

          // Verify the day may be written
          const settings = yield* sql<{ week_start_dow: number; timezone: string }>`
            SELECT week_start_dow, timezone FROM settings LIMIT 1
          `
          if (settings.length === 0) return err("DB_UNREACHABLE") as R

          const { week_start_dow, timezone } = settings[0]
          const nowRow = yield* sql<{ today: string }>`
            SELECT (now() AT TIME ZONE ${timezone})::date::text AS today
          `
          const todayStr = nowRow[0].today

          // The week must be writable, and the day itself must not be behind
          // today (SPEC §6.2). `todayStr` comes from the instance timezone;
          // the client's notion of today goes stale overnight and is never
          // trusted here.
          const refusal = rerollRefusal({
            dayDate: dayRow.day_date,
            weekStart: dayRow.week_start,
            today: todayStr,
            weekStartDow: week_start_dow,
          })
          if (refusal !== null) return err(refusal) as R

          // Load all slots for the week
          const allSlots = yield* sql<{ plan_day_id: string; course: Course; dish_name: string; dish_id: string | null }>`
            SELECT s.plan_day_id, s.course, s.dish_name, s.dish_id
            FROM slot s
            JOIN plan_day pd ON pd.id = s.plan_day_id
            WHERE pd.weekly_plan_id = ${dayRow.weekly_plan_id}
          `

          // Load all dishes per course
          const dishes = yield* sql<{ id: string; name: string; course: Course }>`
            SELECT id, name, course FROM dish ORDER BY course, name
          `
          const byCourse: Record<Course, Array<{ id: string; name: string }>> = {
            soup: [], side: [], main: [],
          }
          for (const d of dishes) byCourse[d.course].push({ id: d.id, name: d.name })

          // Pick new dishes for each course and update in place
          const courses: Course[] = ["soup", "side", "main"]
          const newSlots: SlotRow[] = []
          let causedRepeat = false

          for (const course of courses) {
            const pool = byCourse[course]
            if (pool.length === 0) continue

            const usedNames = new Set(
              allSlots.filter((s) => s.course === course).map((s) => s.dish_name as string)
            )
            const otherDayNames = new Set(
              allSlots
                .filter((s) => s.course === course && s.plan_day_id !== data.planDayId)
                .map((s) => s.dish_name as string)
            )
            const currentSlot = allSlots.find(
              (s) => s.course === course && s.plan_day_id === data.planDayId
            )
            const excludeName = (currentSlot?.dish_name ?? "") as string

            const { dish, causedRepeat: courseRepeat } = pickReroll(
              pool, usedNames, excludeName, otherDayNames
            )
            if (courseRepeat) causedRepeat = true
            newSlots.push({ course, dish_name: dish.name, dish_id: dish.id })

            yield* sql`
              UPDATE slot
              SET dish_name = ${dish.name}, dish_id = ${dish.id}
              WHERE plan_day_id = ${data.planDayId} AND course = ${course}
            `
          }

          return ok({ slots: newSlots, causedRepeat }) as R
        })
      )
    )

    if (Exit.isSuccess(result)) return result.value
    return err("DB_UNREACHABLE")
  })

/** Returns all past weekly_plan rows (week_start < current week), newest first. */
export const listPastWeeks = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ week_start: string }[]> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.gen(function* () {
          const settings = yield* sql<{ week_start_dow: number; timezone: string }>`
            SELECT week_start_dow, timezone FROM settings LIMIT 1
          `
          if (settings.length === 0) return []

          const { week_start_dow, timezone } = settings[0]
          const nowRow = yield* sql<{ today: string }>`
            SELECT (now() AT TIME ZONE ${timezone})::date::text AS today
          `
          const todayStr = nowRow[0].today
          const currentWeekStr = weekStartFor(todayStr, week_start_dow)

          return yield* sql<{ week_start: string }>`
            SELECT week_start::text AS week_start
            FROM weekly_plan
            WHERE week_start < ${currentWeekStr}::date
            ORDER BY week_start DESC
          `
        })
      )
    )
    if (Exit.isSuccess(result)) return [...result.value]
    return []
  }
)

/** Returns the dishes that repeat in the given week (dish_name appears more than once in a course). */
export const getRepeatingDishes = createServerFn({ method: "GET" })
  .validator((data: { weeklyPlanId: string }) => data)
  .handler(async ({ data }): Promise<RepeatingDish[]> => {
    const result = await Runtime.runPromiseExit(
      Effect.flatMap(PgClient.PgClient, (sql) =>
        Effect.map(
          sql<{ course: Course; dish_name: string }>`
            SELECT s.course, s.dish_name
            FROM slot s
            JOIN plan_day d ON d.id = s.plan_day_id
            WHERE d.weekly_plan_id = ${data.weeklyPlanId}
            GROUP BY s.course, s.dish_name
            HAVING COUNT(*) > 1
            ORDER BY s.course, s.dish_name
          `,
          (rows) => rows.map((r) => ({ course: r.course, dishName: r.dish_name }))
        )
      )
    )
    if (Exit.isSuccess(result)) return result.value
    return []
  })
