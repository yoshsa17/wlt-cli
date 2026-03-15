import type { Parser } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";
import { parseNonNegativeInteger } from "./nonNegativeInteger.js";

export type Branch = 0 | 1;

export const parseBranch: Parser<Branch> = (value) => {
  const result = parseNonNegativeInteger(value);
  if (!result.isOk) {
    return result;
  }

  if (result.value !== 0 && result.value !== 1) {
    return Err("branch must be 0 (receive) or 1 (change).");
  }

  return Ok(result.value);
};
