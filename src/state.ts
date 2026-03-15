import type { Wallet } from "./domain/wallet/Wallet.js";
import type { ValueOf } from "./types/utils.js";

export const AppScreen = {
  Start: "START",
  CreateWallet: "CREATE_WALLET",
  WalletMenu: "WALLET_MENU",
  CreatePsbt: "CREATE_PSBT",
  Broadcast: "BROADCAST",
  SignPsbt: "SIGN_PSBT",
  Addresses: "ADDRESSES",
  ShowAddressQr: "SHOW_ADDRESS_QR",
  Settings: "SETTINGS",
  ShowXpubQr: "SHOW_XPUB_QR",
  Exit: "EXIT",
} as const;
export type AppScreen = ValueOf<typeof AppScreen>;

type RootAppState = { screen: "START" } | { screen: "CREATE_WALLET" } | { screen: "EXIT" };

type WalletAppState =
  | { screen: "WALLET_MENU"; wallet: Wallet }
  | { screen: "CREATE_PSBT"; wallet: Wallet }
  | { screen: "BROADCAST"; wallet: Wallet }
  | { screen: "SIGN_PSBT"; wallet: Wallet }
  | { screen: "ADDRESSES"; wallet: Wallet }
  | { screen: "SETTINGS"; wallet: Wallet }
  | { screen: "SHOW_XPUB_QR"; wallet: Wallet };

type AddressQrAppState = { screen: "SHOW_ADDRESS_QR"; wallet: Wallet; address: string };

export type AppState = RootAppState | WalletAppState | AddressQrAppState;

export const hasWallet = (state: AppState): state is Extract<AppState, { wallet: Wallet }> => {
  return "wallet" in state;
};

export const hasAddress = (state: AppState): state is Extract<AppState, { screen: "SHOW_ADDRESS_QR" }> => {
  return "address" in state;
};
