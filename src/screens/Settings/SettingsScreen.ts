import { getAccountPath } from "../../domain/wallet/walletPaths.js";
import { AppScreen, hasWallet, type AppState } from "../../state.js";
import { bold, dim, indent } from "../../utils/terminal.js";
import { SettingsAction, askSettingsAction } from "./askSettingsAction.js";

export const executeSettings = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }

  const walletInfo = [
    dim("[Key source]"),
    state.wallet.keySourceData.type.toUpperCase(),
    dim("[Script type]"),
    state.wallet.scriptType.toUpperCase(),
    dim("[Master Fingerprint]"),
    state.wallet.fingerprint,
    dim("[Derivation]"),
    getAccountPath(state.wallet.network, state.wallet.scriptType),
    dim("[xpub]"),
    state.wallet.xpub,
    dim("[CreatedAt]"),
    new Date(state.wallet.createdAt).toLocaleString(),
  ].join("\n");
  console.log(indent(bold("Settings\n")));
  console.log(indent(walletInfo));

  const settingsAction = await askSettingsAction();
  switch (settingsAction) {
    case SettingsAction.ShowXpubQr:
      return { screen: AppScreen.ShowXpubQr, wallet: state.wallet };
    case SettingsAction.Back:
    default:
      return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  }
};
