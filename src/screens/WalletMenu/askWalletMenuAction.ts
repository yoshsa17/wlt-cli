import { select, Separator } from "@inquirer/prompts";
import type { ValueOf } from "../../types/utils.js";
import { dim } from "../../utils/terminal.js";
import { PREFIXLESS_MINIMAL_LIST_THEME } from "../common/promptTheme.js";

export const WalletMenuAction = {
  CreatePsbt: "CREATE_PSBT",
  Broadcast: "BROADCAST",
  Addresses: "ADDRESSES",
  Settings: "SETTINGS",
  Sign: "SIGN",
  Back: "BACK",
} as const;
export type WalletMenuAction = ValueOf<typeof WalletMenuAction>;

export const askWalletMenuAction = async (): Promise<WalletMenuAction> => {
  return select<WalletMenuAction>({
    message: "",
    theme: PREFIXLESS_MINIMAL_LIST_THEME,
    choices: [
      {
        name: `Create PSBT  ${dim("Build unsigned PSBT base64")}`,
        value: WalletMenuAction.CreatePsbt,
      },
      {
        name: `Broadcast    ${dim("Broadcast finalized PSBT")}`,
        value: WalletMenuAction.Broadcast,
      },
      {
        name: `Sign PSBT    ${dim("Scan QR and sign PSBT")}`,
        value: WalletMenuAction.Sign,
      },
      {
        name: `Addresses    ${dim("Enter branch and index")}`,
        value: WalletMenuAction.Addresses,
      },
      {
        name: `Settings     ${dim("View wallet info")}`,
        value: WalletMenuAction.Settings,
      },
      new Separator(" "),
      { name: "Back", value: WalletMenuAction.Back },
    ],
  });
};
