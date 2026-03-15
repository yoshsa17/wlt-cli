import { AppScreen, type AppState } from "../state.js";
import { walletStorageService } from "../services/WalletStorageService.js";
import { askErrorConfirmation } from "./prompts/askErrorConfirmation.js";
import { StartMenuAction, askStartMenuAction } from "./prompts/askStartMenuAction.js";
import { askWalletPassword } from "./prompts/askWalletPassword.js";

export const executeStart = async (state: AppState): Promise<AppState> => {
  const walletNames = await walletStorageService.getWalletNames();
  const startMenuAction = await askStartMenuAction(walletNames);

  switch (startMenuAction.type) {
    case StartMenuAction.Create:
      return { ...state, screen: AppScreen.CreateWallet };
    case StartMenuAction.Open: {
      const password = await askWalletPassword({ message: `Password for "${startMenuAction.walletName}"` });
      const walletResult = await walletStorageService.loadWallet(startMenuAction.walletName, password);
      if (!walletResult.isOk) {
        await askErrorConfirmation(walletResult.error);
        return { ...state, screen: AppScreen.Start };
      }

      return { ...state, screen: AppScreen.WalletMenu, wallet: walletResult.value };
    }
  }
};
