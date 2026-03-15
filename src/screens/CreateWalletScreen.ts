import { AppScreen, type AppState } from "../state.js";
import { Wallet } from "../domain/wallet/Wallet.js";
import { walletStorageService } from "../services/WalletStorageService.js";
import { askConfirmation } from "./prompts/askConfirmation.js";
import { askErrorConfirmation } from "./prompts/askErrorConfirmation.js";
import { askWalletName } from "./prompts/askWalletName.js";
import { askWalletPasswordWithConfirmation } from "./prompts/askWalletPasswordWithConfirmation.js";
import { askMnemonicWords } from "./prompts/askMnemonicWords.js";

export const executeCreateWallet = async (state: AppState): Promise<AppState> => {
  const walletName = await askWalletName();
  if (await walletStorageService.checkWalletFileExists(walletName)) {
    await askErrorConfirmation("Wallet already exists. Use a different wallet name.");
    return { ...state, screen: AppScreen.CreateWallet };
  }
  const password = await askWalletPasswordWithConfirmation();
  const mnemonic = await askMnemonicWords(12);

  const wallet = await Wallet.create({ name: walletName, network: "testnet", scriptType: "p2pkh", mnemonic });
  const saveWalletResult = await walletStorageService.saveToLocal(wallet.toFile(), password);
  if (!saveWalletResult.isOk) {
    await askErrorConfirmation(saveWalletResult.error);
    return state;
  }

  await askConfirmation({
    mode: "enter",
    messages: [
      `Wallet "${wallet.name}" created successfully.`,
      `Saved Wallet File to: ${walletStorageService.getWalletPath(wallet.name)}`,
    ],
  });

  return { ...state, screen: AppScreen.WalletMenu, wallet };
};
