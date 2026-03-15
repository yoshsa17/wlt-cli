import type { InquirerJsValidator, Parser } from "../types/utils.js";

/**
 * Adapts a domain parser to the boolean-or-message validator shape used by Inquirer input validation.
 */
export const adaptInquirerJsValidator =
  <T>(parser: Parser<T>): InquirerJsValidator =>
  (value: string) => {
    const result = parser(value);
    return result.isOk ? true : result.error;
  };
