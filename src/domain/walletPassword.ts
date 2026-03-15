import type { Brand, Parser } from "../types/utils.js";
import { Err, Ok } from "../utils/result.js";

export type WalletPassword = Brand<string, "WalletPassword">;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const parseWalletPassword: Parser<WalletPassword> = (value) => {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return Err(`Use at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return Err(`Use ${PASSWORD_MAX_LENGTH} characters or fewer`);
  }

  return Ok(value as WalletPassword);
};
