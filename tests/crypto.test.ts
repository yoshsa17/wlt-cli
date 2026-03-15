import { describe, expect, it } from "vitest";
import { decryptPayload, deriveKeyFromPassword, encryptPayload } from "../src/utils/crypto.js";

describe("crypto helpers", () => {
  it("derives a deterministic 32-byte key for the same password and salt", async () => {
    const salt = Buffer.alloc(16, 1);
    const firstKey = await deriveKeyFromPassword("password-123", salt);
    const secondKey = await deriveKeyFromPassword("password-123", salt);

    expect(firstKey).toHaveLength(32);
    expect(firstKey.equals(secondKey)).toBe(true);
  });

  it("encrypts and decrypts plaintext with the same password", async () => {
    const payload = await encryptPayload("hello wallet", "strong-password");
    const plaintext = await decryptPayload(payload, "strong-password");

    expect(plaintext).toBe("hello wallet");
  });

  it("fails to decrypt with a different password", async () => {
    const payload = await encryptPayload("hello wallet", "strong-password");

    await expect(decryptPayload(payload, "wrong-password")).rejects.toThrow();
  });
});
