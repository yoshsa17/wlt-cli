export type Brand<TValue, TName extends string> = TValue & { readonly __brand: TName };
export type ValueOf<T extends object> = T[keyof T];

export type OkResult<TValue = void> = { readonly isOk: true; readonly value: TValue };
export type ErrResult<TError = string> = { readonly isOk: false; readonly error: TError };
export type Result<TValue = void, TError = string> = OkResult<TValue> | ErrResult<TError>;

export type Parser<TValue> = (value: string) => Result<TValue>;
export type InquirerJsValidator = (value: string) => boolean | string;
