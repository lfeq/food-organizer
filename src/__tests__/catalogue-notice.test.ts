import { describe, it, expect } from "vitest"
import {
  catalogueNotice,
  countByCourse,
  DISHES_PER_WEEK,
} from "#/catalogue-notice"

describe("catalogueNotice", () => {
  it("says nothing when every course can fill a week", () => {
    expect(catalogueNotice({ soup: 9, side: 9, main: 9 })).toBeNull()
    expect(
      catalogueNotice({
        soup: DISHES_PER_WEEK,
        side: DISHES_PER_WEEK,
        main: DISHES_PER_WEEK,
      }),
    ).toBeNull()
  })

  it("names every short course, in soup/side/main order", () => {
    expect(catalogueNotice({ soup: 3, side: 9, main: 6 })).toEqual({
      kind: "short",
      courses: ["soup", "main"],
    })
  })

  it("treats zero as the far end of short — same predicate, different copy", () => {
    expect(catalogueNotice({ soup: 0, side: 9, main: 9 })).toEqual({
      kind: "empty",
      courses: ["soup"],
    })
  })

  it("lets the zero copy win, naming only the empty courses", () => {
    expect(catalogueNotice({ soup: 0, side: 3, main: 9 })).toEqual({
      kind: "empty",
      courses: ["soup"],
    })
  })

  it("has no whole-catalogue-is-empty state: three empty courses is three names", () => {
    expect(catalogueNotice({ soup: 0, side: 0, main: 0 })).toEqual({
      kind: "empty",
      courses: ["soup", "side", "main"],
    })
  })
})

describe("countByCourse", () => {
  it("counts a flat list, and an absent course counts zero", () => {
    expect(
      countByCourse([
        { course: "soup" },
        { course: "soup" },
        { course: "main" },
      ]),
    ).toEqual({ soup: 2, side: 0, main: 1 })
  })

  it("counts an empty catalogue as three zeroes", () => {
    expect(countByCourse([])).toEqual({ soup: 0, side: 0, main: 0 })
  })
})
