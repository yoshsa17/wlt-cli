import { Err, Ok } from "../../utils/result.js";

export const parseNonNegativeInteger = (value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return Err("Enter a non-negative integer.");
  }

  return Ok(parsed);
};
