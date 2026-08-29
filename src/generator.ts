export type Dish = { id: string; name: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Draw n dishes from pool, cycling if pool.length < n. Throws if pool is empty. */
export function drawN(pool: Dish[], n: number): Dish[] {
  if (pool.length === 0) throw new Error("empty pool")
  const shuffled = shuffle(pool)
  const result: Dish[] = []
  while (result.length < n) {
    result.push(...shuffled.slice(0, n - result.length))
  }
  return result.slice(0, n)
}

/**
 * Pick one dish for a day-reroll of one course.
 *
 * usedNames: all dish_names for this course used anywhere in the week
 *            (includes the current day's slot, so the replaced dish is excluded from candidates)
 * excludeName: the dish being replaced (must not be returned even in fallback)
 * otherDayNames: dish_names for this course on OTHER days (used to detect repeat)
 */
export function pickReroll(
  pool: Dish[],
  usedNames: Set<string>,
  excludeName: string,
  otherDayNames: Set<string>,
): { dish: Dish; causedRepeat: boolean } {
  const candidates = pool.filter((d) => !usedNames.has(d.name))
  let chosen: Dish
  if (candidates.length > 0) {
    chosen = candidates[Math.floor(Math.random() * candidates.length)]
  } else {
    // Fallback: whole pool minus the replaced dish
    const fallback = pool.filter((d) => d.name !== excludeName)
    chosen = fallback.length > 0
      ? fallback[Math.floor(Math.random() * fallback.length)]
      : pool[Math.floor(Math.random() * pool.length)]
  }
  return { dish: chosen, causedRepeat: otherDayNames.has(chosen.name) }
}
