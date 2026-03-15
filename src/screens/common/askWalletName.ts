import { input } from "@inquirer/prompts";
import { parseWalletName, type WalletName } from "../../domain/valueObject/walletName.js";
import { adaptInquirerJsValidator } from "../../utils/promptValidator.js";

export const askWalletName = async (): Promise<WalletName> => {
  const walletNameValue = await input({
    message: "Wallet name",
    validate: adaptInquirerJsValidator(parseWalletName),
  });

  const result = parseWalletName(walletNameValue);
  if (!result.isOk) {
    throw new Error(result.error);
  }

  return result.value;
};
