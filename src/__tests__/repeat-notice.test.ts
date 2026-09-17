import { describe, it, expect } from "vitest"
import { repeatNotice, type RepeatingDish } from "#/repeat-notice"

describe("repeatNotice", () => {
  it("says nothing when the week does not repeat", () => {
    expect(repeatNotice([])).toBeNull()
  })

  it("names the dish when a single dish repeats", () => {
    const repeats: RepeatingDish[] = [{ course: "main", dishName: "Chiles en nogada" }]
    expect(repeatNotice(repeats)).toEqual({ kind: "dish", dishName: "Chiles en nogada" })
  })

  it("names the courses when several dishes repeat, in course order and without duplicates", () => {
    const repeats: RepeatingDish[] = [
      { course: "main", dishName: "Pozole" },
      { course: "soup", dishName: "Caldo" },
      { course: "main", dishName: "Tinga" },
    ]
    expect(repeatNotice(repeats)).toEqual({ kind: "courses", courses: ["soup", "main"] })
  })

  it("names the courses even when several repeats sit in one course", () => {
    const repeats: RepeatingDish[] = [
      { course: "side", dishName: "Arroz" },
      { course: "side", dishName: "Frijoles" },
    ]
    expect(repeatNotice(repeats)).toEqual({ kind: "courses", courses: ["side"] })
  })

  it("is one notice per week, never one per repeating course", () => {
    const repeats: RepeatingDish[] = [
      { course: "soup", dishName: "a" },
      { course: "side", dishName: "b" },
      { course: "main", dishName: "c" },
    ]
    const notice = repeatNotice(repeats)
    expect(Array.isArray(notice)).toBe(false)
    expect(notice).toEqual({ kind: "courses", courses: ["soup", "side", "main"] })
  })
})
