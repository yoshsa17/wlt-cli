import { describe, expect, it } from "vitest";
import { parseWalletPassword } from "../src/domain/valueObject/walletPassword.js";

describe("walletPassword", () => {
  it("accepts a password with at least 8 characters", () => {
    const walletPasswordResult = parseWalletPassword("password-123");

    expect(walletPasswordResult.isOk).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const walletPasswordResult = parseWalletPassword("short");

    expect(walletPasswordResult.isOk).toBe(false);
    if (!walletPasswordResult.isOk) {
      expect(walletPasswordResult.error).toBe("Use at least 8 characters");
    }
  });
});
