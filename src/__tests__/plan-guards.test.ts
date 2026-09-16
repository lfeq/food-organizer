import { describe, it, expect } from "vitest"
import { rerollRefusal } from "#/plan-guards"

// 2026-03-01 is a Sunday, so a Sunday-start instance's current week runs
// 2026-03-01 … 2026-03-07 while today is 2026-03-04 (Wednesday).
const TODAY = "2026-03-04"
const THIS_WEEK = "2026-03-01"
const NEXT_WEEK = "2026-03-08"
const LAST_WEEK = "2026-02-22"
const SUNDAY = 0

const refuse = (dayDate: string, weekStart: string, today = TODAY) =>
  rerollRefusal({ dayDate, weekStart, today, weekStartDow: SUNDAY })

describe("rerollRefusal", () => {
  it("refuses the day before today with DAY_ELAPSED", () => {
    expect(refuse("2026-03-03", THIS_WEEK)).toBe("DAY_ELAPSED")
  })

  it("refuses every earlier day of the current week with DAY_ELAPSED", () => {
    expect(refuse("2026-03-01", THIS_WEEK)).toBe("DAY_ELAPSED")
    expect(refuse("2026-03-02", THIS_WEEK)).toBe("DAY_ELAPSED")
  })

  it("allows today itself — the day being lived has not elapsed", () => {
    expect(refuse(TODAY, THIS_WEEK)).toBeNull()
  })

  it("allows a day still ahead in the current week", () => {
    expect(refuse("2026-03-05", THIS_WEEK)).toBeNull()
    expect(refuse("2026-03-07", THIS_WEEK)).toBeNull()
  })

  it("allows every day of the next week", () => {
    expect(refuse("2026-03-08", NEXT_WEEK)).toBeNull()
    expect(refuse("2026-03-14", NEXT_WEEK)).toBeNull()
  })

  it("refuses a week that is not writable at all with WEEK_NOT_WRITABLE", () => {
    expect(refuse("2026-02-27", LAST_WEEK)).toBe("WEEK_NOT_WRITABLE")
    expect(refuse("2026-03-15", "2026-03-15")).toBe("WEEK_NOT_WRITABLE")
  })

  it("names the week, not the day, when the whole week is behind today", () => {
    // Both facts hold; the week-level refusal is the one that is true first.
    expect(refuse("2026-02-27", LAST_WEEK)).toBe("WEEK_NOT_WRITABLE")
  })

  it("turns yesterday's allowed day into DAY_ELAPSED once today moves on", () => {
    // The midnight race: the same day, the same week, one day later.
    expect(refuse(TODAY, THIS_WEEK, TODAY)).toBeNull()
    expect(refuse(TODAY, THIS_WEEK, "2026-03-05")).toBe("DAY_ELAPSED")
  })

  it("honours a Monday-start instance", () => {
    // Monday-start: today 2026-03-04 sits in the week beginning 2026-03-02.
    const mon = (dayDate: string, weekStart: string) =>
      rerollRefusal({ dayDate, weekStart, today: TODAY, weekStartDow: 1 })
    expect(mon("2026-03-03", "2026-03-02")).toBe("DAY_ELAPSED")
    expect(mon("2026-03-05", "2026-03-02")).toBeNull()
    expect(mon("2026-03-01", THIS_WEEK)).toBe("WEEK_NOT_WRITABLE")
  })
})
