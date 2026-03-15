import { AppScreen, type AppState } from "../../state.js";
import { walletStorageService } from "../../services/WalletStorageService.js";
import { askErrorConfirmation } from "../common/askErrorConfirmation.js";
import { askWalletPassword } from "../common/askWalletPassword.js";
import { StartMenuAction, askStartMenuAction } from "./askStartMenuAction.js";

export const executeStart = async (): Promise<AppState> => {
  const walletNames = await walletStorageService.getWalletNames();
  const startMenuAction = await askStartMenuAction(walletNames);

  switch (startMenuAction.type) {
    case StartMenuAction.Create:
      return { screen: AppScreen.CreateWallet };
    case StartMenuAction.Open: {
      const password = await askWalletPassword({ message: `Password for "${startMenuAction.walletName}"` });
      const loadWalletResult = await walletStorageService.loadWallet(startMenuAction.walletName, password);
      if (!loadWalletResult.isOk) {
        await askErrorConfirmation(loadWalletResult.error);
        return { screen: AppScreen.Start };
      }

      return { screen: AppScreen.WalletMenu, wallet: loadWalletResult.value };
    }
  }
};
