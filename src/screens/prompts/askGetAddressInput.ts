import { input } from "@inquirer/prompts";
import { validateNonNegativeInteger } from "../../domain/address.js";

export type AddressInput = {
  branch: string;
  index: string;
};

export const askGetAddressInput = async (): Promise<AddressInput> => {
  const branch = await input({
    message: "Branch (0=receive, 1=change)",
    default: "0",
    validate: validateNonNegativeInteger,
  });

  const index = await input({
    message: "Address index",
    default: "0",
    validate: validateNonNegativeInteger,
  });

  return { branch, index };
};
