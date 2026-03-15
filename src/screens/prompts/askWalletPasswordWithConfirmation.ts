import { parseWalletPassword, type WalletPassword } from "../../domain/walletPassword.js";
import { adaptInquirerJsValidator } from "../../utils/promptValidator.js";
import { askWalletPassword } from "./askWalletPassword.js";

// TODO: Let the confirmation step return to the first password prompt instead of restarting the full flow.
export const askWalletPasswordWithConfirmation = async (): Promise<WalletPassword> => {
  const passwordValue = await askWalletPassword({
    message: "Set wallet password",
    validate: adaptInquirerJsValidator(parseWalletPassword),
  });

  await askWalletPassword({
    message: "Confirm password",
    validate: (confirmedPassword: string) => {
      return confirmedPassword === passwordValue ? true : "Password does not match";
    },
  });

  const result = parseWalletPassword(passwordValue);
  if (!result.isOk) {
    throw new Error(result.error);
  }

  return result.value;
};
