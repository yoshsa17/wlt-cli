import { ErrResult, OkResult } from "../types/utils.js";

export function Ok(): OkResult<void>;
export function Ok<TValue>(value: TValue): OkResult<TValue>;
export function Ok<TValue>(value?: TValue): OkResult<TValue | void> {
  return { isOk: true, value };
}

export const Err = <TError = string>(error: TError): ErrResult<TError> => ({ isOk: false, error });
