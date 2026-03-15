import { describe, expect, it } from "vitest";
import { isValidWalletName, parseWalletName } from "../src/domain/walletName.js";

describe("walletName", () => {
  it("accepts a valid lowercase wallet name", () => {
    expect(isValidWalletName("alice-1")).toBe(true);

    const walletNameResult = parseWalletName("alice-1");
    expect(walletNameResult.isOk).toBe(true);
  });

  it("rejects invalid wallet names", () => {
    expect(isValidWalletName("Alice")).toBe(false);
    expect(isValidWalletName("-alice")).toBe(false);
    expect(isValidWalletName("alice--wallet")).toBe(false);

    const walletNameResult = parseWalletName("Alice");
    expect(walletNameResult.isOk).toBe(false);
    if (!walletNameResult.isOk) {
      expect(walletNameResult.error).toBe(
        "Wallet name must use lowercase letters, numbers, and hyphen (-) only.",
      );
    }
  });
});
