import { AppScreen, type AppState } from "../state.js";
import { getAccountPath } from "../domain/wallet/walletPaths.js";
import { askConfirmation } from "./prompts/askConfirmation.js";

export const executeSettings = async (state: AppState): Promise<AppState> => {
  if (!state.wallet) {
    return { screen: AppScreen.Start };
  }

  const keySourceType = state.wallet.keySourceData.type === "software" ? "single sig / software" : "watch only";
  const derivationPath = getAccountPath(state.wallet.network, state.wallet.scriptType);

  await askConfirmation({
    mode: "enter",
    messages: [
      "",
      "Wallet settings",
      `Key source: ${keySourceType}`,
      `Master Fingerprint: ${state.wallet.fingerprint}`,
      `Derivation: ${derivationPath}`,
      `Xpub: ${state.wallet.xpub}`,
      `CreatedAt: ${new Date(state.wallet.createdAt).toLocaleString()}`,
    ],
  });

  return { ...state, screen: AppScreen.WalletMenu };
};
