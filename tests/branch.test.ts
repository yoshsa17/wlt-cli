import { describe, expect, it } from "vitest";
import { parseBranch } from "../src/domain/valueObject/branch.js";

describe("branch", () => {
  it("accepts 0 and 1", () => {
    expect(parseBranch("0").isOk).toBe(true);
    expect(parseBranch("1").isOk).toBe(true);
  });

  it("rejects values other than 0 and 1", () => {
    const branchResult = parseBranch("2");

    expect(branchResult.isOk).toBe(false);
    if (!branchResult.isOk) {
      expect(branchResult.error).toBe("branch must be 0 (receive) or 1 (change).");
    }
  });
});
