import { describe, expect, it } from "vitest";
import { parseSatsFromBtc, satsToBtc } from "../src/domain/valueObject/sats.js";

describe("sats", () => {
  it("parses BTC text into sats", () => {
    const satsResult = parseSatsFromBtc("0.0001");

    expect(satsResult.isOk).toBe(true);
    if (satsResult.isOk) {
      expect(satsResult.value).toBe(10000n);
      expect(satsToBtc(satsResult.value)).toBe("0.0001");
    }
  });

  it("rejects zero amounts", () => {
    const satsResult = parseSatsFromBtc("0");

    expect(satsResult.isOk).toBe(false);
    if (!satsResult.isOk) {
      expect(satsResult.error).toBe("Amount must be greater than zero.");
    }
  });
});
