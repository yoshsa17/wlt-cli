import { password } from "@inquirer/prompts";
import type { InquirerJsValidator } from "../../types/utils.js";

type AskWalletPasswordOptions = {
  message: string;
  validate?: InquirerJsValidator;
};

export const askWalletPassword = async (options: AskWalletPasswordOptions): Promise<string> => {
  return password({
    message: options.message,
    mask: "*",
    validate: options.validate,
  });
};
