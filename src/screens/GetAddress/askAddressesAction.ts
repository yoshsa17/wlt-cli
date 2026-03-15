import { select } from "@inquirer/prompts";
import type { ValueOf } from "../../types/utils.js";
import { PREFIXLESS_MINIMAL_LIST_THEME } from "../common/promptTheme.js";

export const AddressesAction = {
  ShowQr: "SHOW_QR",
  Back: "BACK",
} as const;

export type AddressesAction = ValueOf<typeof AddressesAction>;

export const askAddressesAction = async (): Promise<AddressesAction> => {
  return select({
    message: "",
    theme: PREFIXLESS_MINIMAL_LIST_THEME,
    choices: [
      { name: "Show QR", value: AddressesAction.ShowQr },
      { name: "Back", value: AddressesAction.Back },
    ],
  });
};
