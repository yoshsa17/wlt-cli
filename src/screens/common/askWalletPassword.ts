import { password } from "@inquirer/prompts";
import { parseWalletPassword, type WalletPassword } from "../../domain/valueObject/walletPassword.js";
import { adaptInquirerJsValidator } from "../../utils/promptValidator.js";

export const askWalletPassword = async (options: {
  message: string;
  withConfirmation?: boolean;
}): Promise<WalletPassword> => {
  const passwordValue = await password({
    message: options.message,
    mask: "*",
    validate: adaptInquirerJsValidator(parseWalletPassword),
  });

  if (options.withConfirmation) {
    await password({
      message: "Confirm password",
      mask: "*",
      validate: (confirmedPassword: string) => {
        return confirmedPassword === passwordValue ? true : "Password does not match";
      },
    });
  }

  const passwordResult = parseWalletPassword(passwordValue);
  if (!passwordResult.isOk) {
    throw new Error(passwordResult.error);
  }

  return passwordResult.value;
};
