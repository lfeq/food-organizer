import { describe, it, expect } from "vitest"
import { weekRange } from "#/week-range"

describe("weekRange", () => {
  it("names the week's full seven days, whatever the plan holds", () => {
    // Aug 25 2025 is a Monday; the week it starts ends on Aug 31.
    expect(weekRange("2025-08-25", "en")).toContain("25")
    expect(weekRange("2025-08-25", "en")).toContain("31")
  })

  it("gives two weeks of identical identity the same label", () => {
    expect(weekRange("2025-08-25", "en")).toBe(weekRange("2025-08-25", "en"))
  })

  it("carries the year in every range", () => {
    expect(weekRange("2025-08-25", "en")).toContain("2025")
    expect(weekRange("2025-08-25", "es")).toContain("2025")
  })

  it("says both months where the week crosses one", () => {
    // Aug 28 2025 → Sep 3 2025.
    const label = weekRange("2025-08-28", "en")
    expect(label).toMatch(/Aug/)
    expect(label).toMatch(/Sep/)
  })

  it("says both years where the week crosses one", () => {
    const label = weekRange("2025-12-29", "en")
    expect(label).toContain("2025")
    expect(label).toContain("2026")
  })
})
