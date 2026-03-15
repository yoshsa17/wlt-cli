import { AppScreen, type AppState } from "../../state.js";
import { Wallet } from "../../domain/wallet/Wallet.js";
import { walletStorageService } from "../../services/WalletStorageService.js";
import { askConfirmation } from "../common/askConfirmation.js";
import { askErrorConfirmation } from "../common/askErrorConfirmation.js";
import { askMnemonicWords } from "../common/askMnemonicWords.js";
import { askWalletName } from "../common/askWalletName.js";
import { askWalletPassword } from "../common/askWalletPassword.js";
import { askScriptType } from "./askScriptType.js";
import { bold, indent } from "../../utils/terminal.js";

export const executeCreateWallet = async (state: AppState): Promise<AppState> => {
  console.log(indent(bold("Create Wallet\n")));

  const walletName = await askWalletName();
  if (await walletStorageService.checkWalletFileExists(walletName)) {
    await askErrorConfirmation("Wallet already exists. Use a different wallet name.");
    return { screen: AppScreen.CreateWallet };
  }
  const password = await askWalletPassword({ message: "Set wallet password", withConfirmation: true });
  const scriptType = await askScriptType();
  const mnemonic = await askMnemonicWords(12);

  const wallet = await Wallet.create({ name: walletName, network: "testnet", scriptType, mnemonic });
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

  return { screen: AppScreen.WalletMenu, wallet };
};
