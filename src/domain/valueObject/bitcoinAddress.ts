import { address as bitcoinAddress } from "bitcoinjs-lib";
import type { Brand, Result } from "../../types/utils.js";
import { BITCOIN_NETWORK_BY_NAME } from "../wallet/network.js";
import type { NetworkName } from "../wallet/Wallet.js";
import { Err, Ok } from "../../utils/result.js";

export type BitcoinAddress = Brand<string, "BitcoinAddress">;

export const parseBitcoinAddress = (
  value: string,
  network: NetworkName,
): Result<BitcoinAddress> => {
  const normalizedValue = value.trim();

  try {
    bitcoinAddress.toOutputScript(normalizedValue, BITCOIN_NETWORK_BY_NAME[network]);
    return Ok(normalizedValue as BitcoinAddress);
  } catch {
    return Err("Enter a valid address for this wallet network.");
  }
};
