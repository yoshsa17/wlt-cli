import { describe, expect, it } from "vitest";
import { parseAddressIndex } from "../src/domain/valueObject/addressIndex.js";

describe("addressIndex", () => {
  it("accepts a non-negative integer", () => {
    const addressIndexResult = parseAddressIndex("12");

    expect(addressIndexResult.isOk).toBe(true);
    if (addressIndexResult.isOk) {
      expect(addressIndexResult.value).toBe(12);
    }
  });

  it("rejects a negative integer", () => {
    const addressIndexResult = parseAddressIndex("-1");

    expect(addressIndexResult.isOk).toBe(false);
    if (!addressIndexResult.isOk) {
      expect(addressIndexResult.error).toBe("Enter a non-negative integer.");
    }
  });
});
