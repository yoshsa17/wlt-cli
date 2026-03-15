import type { Brand, Parser } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";
import { toSats, type Sats } from "./sats.js";

const SATOSHIS_PER_BTC = 100_000_000n;
type Btc = Brand<string, "Btc">;

const btcToSatsValue = (btc: string): bigint => {
  const [wholePart, fractionalPart = ""] = btc.split(".");
  return BigInt(wholePart) * SATOSHIS_PER_BTC + BigInt(fractionalPart.padEnd(8, "0"));
};

const parseBtc: Parser<Btc> = (value) => {
  const normalizedValue = value.trim();
  if (!/^[0-9]+(\.[0-9]{1,8})?$/.test(normalizedValue)) {
    return Err("Enter a BTC amount with up to 8 decimal places.");
  }

  if (btcToSatsValue(normalizedValue) <= 0n) {
    return Err("Amount must be greater than zero.");
  }

  return Ok(normalizedValue as Btc);
};

const btcToSats = (btc: Btc): Sats => toSats(btcToSatsValue(btc));

export const parseSatsFromBtc: Parser<Sats> = (value) => {
  const btcResult = parseBtc(value);
  if (!btcResult.isOk) {
    return btcResult;
  }

  return Ok(btcToSats(btcResult.value));
};
