import { describe, expect, it } from "vitest";
import { parseBitcoinAddress } from "../src/domain/valueObject/bitcoinAddress.js";

describe("bitcoinAddress", () => {
  it("accepts a valid address for the requested network", () => {
    const bitcoinAddressResult = parseBitcoinAddress("mqYz6JpuKukHzPg94y4XNDdPCEJrNkLQcv", "testnet");

    expect(bitcoinAddressResult.isOk).toBe(true);
  });

  it("rejects an address for the wrong network", () => {
    const bitcoinAddressResult = parseBitcoinAddress("mqYz6JpuKukHzPg94y4XNDdPCEJrNkLQcv", "mainnet");

    expect(bitcoinAddressResult.isOk).toBe(false);
    if (!bitcoinAddressResult.isOk) {
      expect(bitcoinAddressResult.error).toBe("Enter a valid address for this wallet network.");
    }
  });
});
