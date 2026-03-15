import type { Brand, Parser } from "../../types/utils.js";
import { Ok } from "../../utils/result.js";
import { parseNonNegativeInteger } from "./nonNegativeInteger.js";

export type AddressIndex = Brand<number, "AddressIndex">;

export const parseAddressIndex: Parser<AddressIndex> = (value) => {
  const result = parseNonNegativeInteger(value);
  if (!result.isOk) {
    return result;
  }

  return Ok(result.value as AddressIndex);
};
