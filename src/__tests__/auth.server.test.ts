import { describe, it, expect } from "vitest"
import { generateTempPassword } from "#/auth.server"

describe("generateTempPassword", () => {
  it("produces 11-character CVC-CVC-CVC pattern", () => {
    const pw = generateTempPassword()
    expect(pw).toMatch(/^[a-z]{3}-[a-z]{3}-[a-z]{3}$/)
  })

  it("uses only unambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword().replace(/-/g, "")
      // No l (looks like 1), no c/j/q/x/y
      expect(pw).not.toMatch(/[lcjqxy]/)
    }
  })

  it("generates different passwords each time", () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTempPassword()))
    expect(passwords.size).toBeGreaterThan(1)
  })
})
