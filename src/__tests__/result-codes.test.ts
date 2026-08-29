import { describe, it, expect } from "vitest"
import { ok, err } from "#/result-codes"

describe("result helpers", () => {
  it("ok wraps data with ok:true", () => {
    const r = ok({ pg: "connected" })
    expect(r.ok).toBe(true)
    expect(r.data).toEqual({ pg: "connected" })
  })

  it("err wraps a code with ok:false", () => {
    const r = err("DB_UNREACHABLE")
    expect(r.ok).toBe(false)
    expect(r.code).toBe("DB_UNREACHABLE")
  })

  it("err carries optional string detail", () => {
    const r = err("AUTH_INVALID_CREDENTIALS", "attempt 1")
    expect(r.detail).toBe("attempt 1")
  })
})
