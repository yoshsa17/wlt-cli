import { select, Separator } from "@inquirer/prompts";
import type { ValueOf } from "../../types/utils.js";
import { dim } from "../../utils/terminal.js";
import { PREFIXLESS_MINIMAL_LIST_THEME } from "./promptTheme.js";

export const WalletMenuAction = {
  GetAddress: "GET_ADDRESS",
  Settings: "SETTINGS",
  Sign: "SIGN",
  Back: "BACK",
} as const;
export type WalletMenuAction = ValueOf<typeof WalletMenuAction>;

export const askWalletMenuAction = async (): Promise<WalletMenuAction> => {
  return select<WalletMenuAction>({
    message: "Wallet Menu",
    theme: PREFIXLESS_MINIMAL_LIST_THEME,
    choices: [
      new Separator(" "),
      {
        name: `Sign PSBT    ${dim("Scan QR and sign PSBT")}`,
        value: WalletMenuAction.Sign,
      },
      {
        name: `Get Address  ${dim("Enter branch and index")}`,
        value: WalletMenuAction.GetAddress,
      },
      {
        name: `Settings  ${dim("Show xpub, fingerprint, and createdAt")}`,
        value: WalletMenuAction.Settings,
      },
      new Separator(" "),
      { name: "Back", value: WalletMenuAction.Back },
    ],
  });
};
