import { input } from "@inquirer/prompts";
import type { AddressIndex } from "../../domain/valueObject/addressIndex.js";
import type { Branch } from "../../domain/valueObject/branch.js";
import { parseAddressIndex } from "../../domain/valueObject/addressIndex.js";
import { parseBranch } from "../../domain/valueObject/branch.js";
import { adaptInquirerJsValidator } from "../../utils/promptValidator.js";

export type AddressInput = {
  branch: Branch;
  index: AddressIndex;
};

export const askAddressesInput = async (): Promise<AddressInput> => {
  const branchValue = await input({
    message: "Branch (0=receive, 1=change)",
    default: "0",
    validate: adaptInquirerJsValidator(parseBranch),
  });

  const indexValue = await input({
    message: "Address index",
    default: "0",
    validate: adaptInquirerJsValidator(parseAddressIndex),
  });

  const branchResult = parseBranch(branchValue);
  if (!branchResult.isOk) {
    throw new Error(branchResult.error);
  }

  const indexResult = parseAddressIndex(indexValue);
  if (!indexResult.isOk) {
    throw new Error(indexResult.error);
  }

  return { branch: branchResult.value, index: indexResult.value };
};
