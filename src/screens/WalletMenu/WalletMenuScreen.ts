import { AppScreen, hasWallet, type AppState } from "../../state.js";
import { bold, indent } from "../../utils/terminal.js";
import { WalletMenuAction, askWalletMenuAction } from "./askWalletMenuAction.js";

export const executeWalletMenu = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }

  console.log(indent(bold("Wallet Menu")));
  const walletMenuAction = await askWalletMenuAction();
  switch (walletMenuAction) {
    case WalletMenuAction.CreatePsbt:
      return { screen: AppScreen.CreatePsbt, wallet: state.wallet };
    case WalletMenuAction.Broadcast:
      return { screen: AppScreen.Broadcast, wallet: state.wallet };
    case WalletMenuAction.Sign:
      return { screen: AppScreen.SignPsbt, wallet: state.wallet };
    case WalletMenuAction.Addresses:
      return { screen: AppScreen.Addresses, wallet: state.wallet };
    case WalletMenuAction.Settings:
      return { screen: AppScreen.Settings, wallet: state.wallet };
    case WalletMenuAction.Back:
    default:
      return { screen: AppScreen.Start };
  }
};
