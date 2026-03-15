import { describe, expect, it } from "vitest";
import { parseMnemonic } from "../src/domain/mnemonic.js";

describe("mnemonic", () => {
  it("accepts a valid bip39 mnemonic", () => {
    const mnemonicResult = parseMnemonic(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );

    expect(mnemonicResult.isOk).toBe(true);
  });

  it("rejects an invalid bip39 mnemonic", () => {
    const mnemonicResult = parseMnemonic("abandon abandon abandon");

    expect(mnemonicResult.isOk).toBe(false);
    if (!mnemonicResult.isOk) {
      expect(mnemonicResult.error).toBe("Mnemonic is invalid.");
    }
  });
});
