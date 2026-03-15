import { describe, expect, it } from "vitest";
import { parseMnemonic } from "../src/domain/valueObject/mnemonic.js";
import { Wallet } from "../src/domain/wallet/Wallet.js";
import { parseWalletName } from "../src/domain/valueObject/walletName.js";

const TEST_XPUB =
  "tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M";

describe("Wallet", () => {
  it("creates a software wallet with deterministic public data", async () => {
    const walletNameResult = parseWalletName("alice");
    const mnemonicResult = parseMnemonic(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    );

    if (!walletNameResult.isOk) {
      throw new Error(walletNameResult.error);
    }
    if (!mnemonicResult.isOk) {
      throw new Error(mnemonicResult.error);
    }

    const wallet = await Wallet.create({
      name: walletNameResult.value,
      network: "testnet",
      scriptType: "p2wpkh",
      mnemonic: mnemonicResult.value,
    });

    expect(wallet.name).toBe("alice");
    expect(wallet.fingerprint).toBe("73c5da0a");
    expect(wallet.xpub).toBe(TEST_XPUB);
    expect(wallet.keySourceData).toEqual({
      type: "software",
      mnemonic: mnemonicResult.value,
    });
  });

  it("round-trips through wallet file serialization", () => {
    const wallet = Wallet.fromFile({
      version: 1,
      name: "alice",
      network: "testnet",
      scriptType: "p2wpkh",
      fingerprint: "73c5da0a",
      xpub: TEST_XPUB,
      createdAt: "2026-03-11T00:00:00.000Z",
      keySource: {
        type: "watch_only",
      },
    });

    expect(wallet.toFile()).toEqual({
      version: 1,
      name: "alice",
      network: "testnet",
      scriptType: "p2wpkh",
      fingerprint: "73c5da0a",
      xpub: TEST_XPUB,
      createdAt: "2026-03-11T00:00:00.000Z",
      keySource: {
        type: "watch_only",
      },
    });
  });

  it("rejects invalid wallet file names", () => {
    expect(() =>
      Wallet.fromFile({
        version: 1,
        name: "Alice",
        network: "testnet",
        scriptType: "p2wpkh",
        fingerprint: "73c5da0a",
        xpub: TEST_XPUB,
        createdAt: "2026-03-11T00:00:00.000Z",
        keySource: {
          type: "watch_only",
        },
      }),
    ).toThrowError("Wallet name must use lowercase letters, numbers, and hyphen (-) only.");
  });
});
