import type { Brand, Parser } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";

const SATOSHIS_PER_BTC = 100_000_000n;

export type Sats = Brand<bigint, "Sats">;

export const parseSatsFromBtc: Parser<Sats> = (value) => {
  const normalizedValue = value.trim();
  if (!/^[0-9]+(\.[0-9]{1,8})?$/.test(normalizedValue)) {
    return Err("Enter a BTC amount with up to 8 decimal places.");
  }

  const [wholePart, fractionalPart = ""] = normalizedValue.split(".");
  const wholeSats = BigInt(wholePart) * SATOSHIS_PER_BTC;
  const fractionalSats = BigInt(fractionalPart.padEnd(8, "0"));
  const sats = wholeSats + fractionalSats;

  if (sats <= 0n) {
    return Err("Amount must be greater than zero.");
  }

  return Ok(sats as Sats);
};

export const toSats = (value: bigint): Sats => value as Sats;

export const satsToBtc = (sats: Sats): string => {
  const wholePart = sats / SATOSHIS_PER_BTC;
  const fractionalPart = (sats % SATOSHIS_PER_BTC)
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "");

  return fractionalPart.length > 0 ? `${wholePart}.${fractionalPart}` : wholePart.toString();
};
