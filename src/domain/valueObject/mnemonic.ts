import * as bip39 from "bip39";
import type { Brand, Parser } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";

export type Mnemonic = Brand<string, "Mnemonic">;

export const parseMnemonic: Parser<Mnemonic> = (value) => {
  const normalized = value.trim();
  if (!bip39.validateMnemonic(normalized)) {
    return Err("Mnemonic is invalid.");
  }

  return Ok(normalized as Mnemonic);
};
