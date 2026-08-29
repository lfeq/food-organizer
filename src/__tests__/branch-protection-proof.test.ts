import { describe, expect, it } from "vitest";

// Temporary: proves the required `test` status check blocks a merge.
// Delete along with the PR that carries it (wayfinder #30).
describe("branch protection proof", () => {
  it("fails on purpose", () => {
    expect(1).toBe(2);
  });
});
