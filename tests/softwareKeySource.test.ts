import { describe, expect, it } from "vitest";
import { parseMnemonic } from "../src/domain/valueObject/mnemonic.js";
import { SoftwareKeySource } from "../src/domain/keySource/SoftwareKeySource.js";

const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const TEST_MNEMONIC_RESULT = parseMnemonic(TEST_MNEMONIC);

if (!TEST_MNEMONIC_RESULT.isOk) {
  throw new Error(TEST_MNEMONIC_RESULT.error);
}

describe("SoftwareKeySource", () => {
  it("derives stable account public data for testnet native segwit", async () => {
    const keySource = new SoftwareKeySource(TEST_MNEMONIC_RESULT.value);

    await expect(keySource.getAccountData("p2wpkh", "testnet")).resolves.toEqual({
      fingerprint: "73c5da0a",
      xpub: "tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M",
    });
  });
});
