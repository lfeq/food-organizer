import { describe, expect, it } from "vitest";

// Deliberately failing test: proof for issue #30. This branch must not be
// mergeable while branch protection requires the `test` check to pass.
describe("branch protection probe", () => {
  it("fails on purpose so the required `test` check goes red", () => {
    expect(1).toBe(2);
  });
});
