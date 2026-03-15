import { select } from "@inquirer/prompts";
import type { ValueOf } from "../../types/utils.js";
import { PREFIXLESS_MINIMAL_LIST_THEME } from "../common/promptTheme.js";

export const SettingsAction = {
  ShowXpubQr: "SHOW_XPUB_QR",
  Back: "BACK",
} as const;

export type SettingsAction = ValueOf<typeof SettingsAction>;

export const askSettingsAction = async (): Promise<SettingsAction> => {
  return select({
    message: "",
    theme: PREFIXLESS_MINIMAL_LIST_THEME,
    choices: [
      { name: "Show xpub QR", value: SettingsAction.ShowXpubQr },
      { name: "Back", value: SettingsAction.Back },
    ],
  });
};
