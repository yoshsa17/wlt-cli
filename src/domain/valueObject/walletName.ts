import type { Brand, Parser } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";

export type WalletName = Brand<string, "WalletName">;

const WALLET_NAME_MIN_LENGTH = 1;
const WALLET_NAME_MAX_LENGTH = 20;
const WALLET_NAME_ALLOWED_CHAR = /^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+$/;

export const isValidWalletName = (value: string): boolean => {
  const normalized = value.trim();

  const length = normalized.length;

  return (
    length >= WALLET_NAME_MIN_LENGTH &&
    length <= WALLET_NAME_MAX_LENGTH &&
    WALLET_NAME_ALLOWED_CHAR.test(normalized)
  );
};

export const parseWalletName: Parser<WalletName> = (value) => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return Err("Wallet name is required.");
  }
  if (!isValidWalletName(normalized)) {
    return Err("Wallet name must use lowercase letters, numbers, and hyphen (-) only.");
  }

  return Ok(normalized as WalletName);
};
