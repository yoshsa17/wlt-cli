import type { Wallet } from "./domain/wallet/Wallet.js";
import type { NetworkName } from "./types/wallet.js";
import type { ValueOf } from "./types/utils.js";

export const DEFAULT_NETWORK: NetworkName = "testnet";

export const AppScreen = {
  Start: "START",
  CreateWallet: "CREATE_WALLET",
  WalletMenu: "WALLET_MENU",
  GetAddress: "GET_ADDRESS",
  Settings: "SETTINGS",
  SignPsbt: "SIGN_PSBT",
  Exit: "EXIT",
} as const;
export type AppScreen = ValueOf<typeof AppScreen>;

export type AppState = {
  screen: AppScreen;
  wallet?: Wallet;
};
