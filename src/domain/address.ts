import type { InquirerJsValidator } from "../types/utils.js";

export const validateNonNegativeInteger: InquirerJsValidator = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return "Enter a non-negative integer.";
  }

  return true;
};
