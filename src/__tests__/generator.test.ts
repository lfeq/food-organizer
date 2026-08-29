import { describe, it, expect } from "vitest"
import { drawN, pickReroll, type Dish } from "#/generator"

function makeDishes(n: number, prefix = "dish"): Dish[] {
  return Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, name: `${prefix}-${i}` }))
}

describe("drawN", () => {
  it("throws on empty pool", () => {
    expect(() => drawN([], 7)).toThrow()
  })

  it("returns exactly n dishes", () => {
    expect(drawN(makeDishes(9), 7)).toHaveLength(7)
    expect(drawN(makeDishes(5), 7)).toHaveLength(7)
  })

  it("never repeats with ≥7 dishes (20 runs each at 7, 8, 9)", () => {
    for (let run = 0; run < 20; run++) {
      for (const count of [7, 8, 9]) {
        const drawn = drawN(makeDishes(count), 7)
        const names = drawn.map((d) => d.name)
        expect(new Set(names).size).toBe(7)
      }
    }
  })

  it("repeats when pool has 6 dishes and 7 are drawn", () => {
    // With 6 dishes cycled to fill 7 slots, at least one must repeat
    let sawRepeat = false
    for (let run = 0; run < 50; run++) {
      const drawn = drawN(makeDishes(6), 7)
      const names = drawn.map((d) => d.name)
      if (new Set(names).size < 7) sawRepeat = true
    }
    expect(sawRepeat).toBe(true)
  })
})

describe("pickReroll", () => {
  it("never returns the replaced dish (7-dish pool, all used)", () => {
    const pool = makeDishes(7)
    const usedNames = new Set(pool.map((d) => d.name))
    const excludeName = pool[0].name
    const otherDayNames = new Set(pool.slice(1).map((d) => d.name))
    for (let run = 0; run < 50; run++) {
      const { dish } = pickReroll(pool, usedNames, excludeName, otherDayNames)
      expect(dish.name).not.toBe(excludeName)
    }
  })

  it("introduces no repeat while one candidate remains (8-dish pool)", () => {
    // 8 dishes: index 0–6 used in the week, index 7 is unused
    // Rerolling day with dish-0 → only dish-7 qualifies as candidate
    const pool = makeDishes(8)
    const usedNames = new Set(pool.slice(0, 7).map((d) => d.name))
    const excludeName = pool[0].name
    const otherDayNames = new Set(pool.slice(1, 7).map((d) => d.name))
    for (let run = 0; run < 50; run++) {
      const { dish, causedRepeat } = pickReroll(pool, usedNames, excludeName, otherDayNames)
      expect(causedRepeat).toBe(false)
      expect(dish.name).toBe(pool[7].name)
    }
  })

  it("fallback fires and causes repeat at exactly 7 dishes (all used)", () => {
    // 7 dishes all assigned across the week → no candidates → every fallback pick repeats
    const pool = makeDishes(7)
    const usedNames = new Set(pool.map((d) => d.name))
    const excludeName = pool[0].name
    const otherDayNames = new Set(pool.slice(1).map((d) => d.name))
    for (let run = 0; run < 50; run++) {
      const { causedRepeat } = pickReroll(pool, usedNames, excludeName, otherDayNames)
      expect(causedRepeat).toBe(true)
    }
  })

  it("9-dish pool: two candidates, no repeat possible", () => {
    // 9 dishes: week uses 7 (index 0–6), two unused (7, 8)
    // Rerolling day with dish-0 → candidates are dish-7 and dish-8 → never a repeat
    const pool = makeDishes(9)
    const usedNames = new Set(pool.slice(0, 7).map((d) => d.name))
    const excludeName = pool[0].name
    const otherDayNames = new Set(pool.slice(1, 7).map((d) => d.name))
    for (let run = 0; run < 50; run++) {
      const { causedRepeat } = pickReroll(pool, usedNames, excludeName, otherDayNames)
      expect(causedRepeat).toBe(false)
    }
  })
})
