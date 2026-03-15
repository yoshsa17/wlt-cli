import { AppScreen, type AppState } from "../state.js";
import { WalletMenuAction, askWalletMenuAction } from "./prompts/askWalletMenuAction.js";

export const executeWalletHome = async (state: AppState): Promise<AppState> => {
  const walletMenuAction = await askWalletMenuAction();

  switch (walletMenuAction) {
    case WalletMenuAction.Sign:
      return { ...state, screen: AppScreen.SignPsbt };
    case WalletMenuAction.GetAddress:
      return { ...state, screen: AppScreen.GetAddress };
    case WalletMenuAction.Settings:
      return { ...state, screen: AppScreen.Settings };
    case WalletMenuAction.Back:
      return { screen: AppScreen.Start };
    default:
      return state;
  }
};
