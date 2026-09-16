import { describe, it, expect } from "vitest"
import {
  addDays,
  dayOfWeek,
  daysStillAhead,
  generateSplit,
  hasElapsed,
  weekDays,
  weekStartFor,
} from "#/plan-dates"

// 2026-03-01 is a Sunday; the week runs 2026-03-01 … 2026-03-07.
const WEEK_START = "2026-03-01"
const WEEK = [
  "2026-03-01",
  "2026-03-02",
  "2026-03-03",
  "2026-03-04",
  "2026-03-05",
  "2026-03-06",
  "2026-03-07",
]

describe("dayOfWeek", () => {
  it("reads 0 for Sunday through 6 for Saturday", () => {
    WEEK.forEach((d, i) => expect(dayOfWeek(d)).toBe(i))
  })

  it("does not shift with the host timezone", () => {
    // A local-midnight Date would land on the previous day east of Greenwich.
    expect(dayOfWeek("2026-01-01")).toBe(4) // Thursday
  })
})

describe("addDays", () => {
  it("moves forward and backward", () => {
    expect(addDays(WEEK_START, 3)).toBe("2026-03-04")
    expect(addDays(WEEK_START, -1)).toBe("2026-02-28")
    expect(addDays(WEEK_START, 0)).toBe(WEEK_START)
  })

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29") // leap year
  })
})

describe("weekStartFor", () => {
  it("returns the day itself when today is the week start", () => {
    expect(weekStartFor(WEEK_START, 0)).toBe(WEEK_START)
  })

  it("walks back to the week start from mid-week", () => {
    expect(weekStartFor("2026-03-04", 0)).toBe(WEEK_START)
  })

  it("walks back from the last day of the week", () => {
    expect(weekStartFor("2026-03-07", 0)).toBe(WEEK_START)
  })

  it("honours a Monday-start instance", () => {
    expect(weekStartFor("2026-03-01", 1)).toBe("2026-02-23") // Sunday belongs to the previous week
    expect(weekStartFor("2026-03-02", 1)).toBe("2026-03-02")
    expect(weekStartFor("2026-03-08", 1)).toBe("2026-03-02")
  })
})

describe("weekDays", () => {
  it("returns the seven dates of the week in order", () => {
    expect(weekDays(WEEK_START)).toEqual(WEEK)
  })
})

describe("hasElapsed", () => {
  it("is false for today itself", () => {
    expect(hasElapsed("2026-03-04", "2026-03-04")).toBe(false)
  })

  it("is true for the day before today", () => {
    expect(hasElapsed("2026-03-03", "2026-03-04")).toBe(true)
  })

  it("is false for a day still ahead", () => {
    expect(hasElapsed("2026-03-05", "2026-03-04")).toBe(false)
  })

  it("is true for the week start once the week is underway", () => {
    expect(hasElapsed(WEEK_START, "2026-03-04")).toBe(true)
  })

  it("is false for a date outside and after the week", () => {
    expect(hasElapsed("2026-03-09", "2026-03-04")).toBe(false)
  })

  it("crosses the midnight boundary on the date, not the clock", () => {
    expect(hasElapsed("2026-03-04", "2026-03-04")).toBe(false)
    expect(hasElapsed("2026-03-04", "2026-03-05")).toBe(true)
  })
})

describe("daysStillAhead", () => {
  it("returns all seven days when today is the week start", () => {
    expect(daysStillAhead(WEEK_START, WEEK_START)).toEqual(WEEK)
  })

  it("drops the elapsed days mid-week and keeps today", () => {
    expect(daysStillAhead(WEEK_START, "2026-03-04")).toEqual([
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
    ])
  })

  it("returns only the last day on the last day of the week", () => {
    expect(daysStillAhead(WEEK_START, "2026-03-07")).toEqual(["2026-03-07"])
  })

  it("returns all seven days when today is before the week (the next week)", () => {
    expect(daysStillAhead(WEEK_START, "2026-02-25")).toEqual(WEEK)
  })

  it("returns none when the whole week is behind today", () => {
    expect(daysStillAhead(WEEK_START, "2026-03-08")).toEqual([])
  })
})

describe("generateSplit", () => {
  it("draws all seven days generating on the week start, with nothing to preserve", () => {
    const split = generateSplit(WEEK_START, WEEK_START, [])
    expect(split.redraw).toEqual(WEEK)
    expect(split.preserved).toEqual([])
    expect(split.discarded).toEqual([])
  })

  it("preserves the elapsed days and draws only the days still ahead mid-week", () => {
    const split = generateSplit(WEEK_START, "2026-03-04", WEEK)
    expect(split.preserved).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"])
    expect(split.redraw).toEqual([
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
    ])
    expect(split.discarded).toEqual(split.redraw)
  })

  it("invents nothing for elapsed dates that were never planned", () => {
    // A week already underway with no plan at all: only the days still ahead
    // are written, so the plan holds fewer than seven plan days.
    const split = generateSplit(WEEK_START, "2026-03-04", [])
    expect(split.redraw).toHaveLength(4)
    expect(split.preserved).toEqual([])
    expect(split.discarded).toEqual([])
  })

  it("draws only the last day when generating on the last day of the week", () => {
    const split = generateSplit(WEEK_START, "2026-03-07", WEEK)
    expect(split.redraw).toEqual(["2026-03-07"])
    expect(split.preserved).toEqual(WEEK.slice(0, 6))
    expect(split.discarded).toEqual(["2026-03-07"])
  })

  it("regenerates over an existing partial plan without touching its elapsed days", () => {
    // The plan was first generated on the Wednesday, so it holds 03-04…03-07.
    // Regenerating on the Friday preserves 03-04 and 03-05 and redraws the rest.
    const partial = ["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"]
    const split = generateSplit(WEEK_START, "2026-03-06", partial)
    expect(split.preserved).toEqual(["2026-03-04", "2026-03-05"])
    expect(split.redraw).toEqual(["2026-03-06", "2026-03-07"])
    expect(split.discarded).toEqual(["2026-03-06", "2026-03-07"])
  })

  it("names every week day exactly once across preserved and redraw", () => {
    for (const today of WEEK) {
      const split = generateSplit(WEEK_START, today, WEEK)
      expect([...split.preserved, ...split.redraw]).toEqual(WEEK)
    }
  })

  it("discards nothing that does not already exist", () => {
    const split = generateSplit(WEEK_START, "2026-03-04", ["2026-03-06"])
    expect(split.discarded).toEqual(["2026-03-06"])
    expect(split.redraw).toHaveLength(4)
  })

  it("preserves the whole week and draws nothing once the week is behind today", () => {
    const split = generateSplit(WEEK_START, "2026-03-08", WEEK)
    expect(split.preserved).toEqual(WEEK)
    expect(split.redraw).toEqual([])
    expect(split.discarded).toEqual([])
  })
})
