import { Separator, select } from "@inquirer/prompts";
import type { WalletName } from "../../domain/walletName.js";
import { MINIMAL_LIST_THEME } from "./promptTheme.js";

export const StartMenuAction = {
  Create: "CREATE",
  Open: "OPEN",
} as const;
export type StartMenuAction =
  | { type: typeof StartMenuAction.Create }
  | { type: typeof StartMenuAction.Open; walletName: WalletName };

const createWalletChoice = {
  name: "+ Create new wallet",
  value: { type: StartMenuAction.Create },
} as const;

const getWalletChoices = (walletNames: readonly WalletName[]) =>
  walletNames.map((walletName) => ({
    name: walletName,
    value: { type: StartMenuAction.Open, walletName } satisfies StartMenuAction,
  }));

export const askStartMenuAction = async (walletNames: readonly WalletName[]): Promise<StartMenuAction> => {
  if (walletNames.length === 0) {
    return select<StartMenuAction>({
      message: "Create your first wallet",
      theme: MINIMAL_LIST_THEME,
      choices: [createWalletChoice],
    });
  }

  return select<StartMenuAction>({
    message: "Select wallet to open",
    theme: MINIMAL_LIST_THEME,
    choices: [new Separator(" "), ...getWalletChoices(walletNames), new Separator(" "), createWalletChoice],
    loop: false,
    pageSize: 20,
  });
};
